import { AnalysisResult, Issue } from '@/types';

export type OfferId =
  | 'tracking-foundation'
  | 'funnel-tracking'
  | 'ecommerce-tracking'
  | 'server-side-tracking'
  | 'platform-expansion';

export type OfferScenario = 'foundation' | 'leadgen' | 'ecommerce' | 'advanced';
export type OfferAccent = 'indigo' | 'emerald' | 'purple' | 'amber';

export interface OfferCard {
  id: OfferId;
  title: string;
  badge: string;
  accent: OfferAccent;
  description: string;
  priceLabel: string;
  setupTimeLabel: string;
  bestFor: string;
  rationale: string[];
  includes: string[];
}

export interface OfferAddOn {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  reason: string;
  recommended: boolean;
}

export interface OfferRecommendationSet {
  scenario: OfferScenario;
  heading: string;
  subheading: string;
  cards: OfferCard[];
  addOns: OfferAddOn[];
  detectedPlatforms: string[];
  topIssues: string[];
  highlightPills: string[];
}

type OfferCandidate = OfferCard & {
  relevance: number;
};

const ISSUE_SEVERITY_WEIGHT: Record<Issue['severity'], number> = {
  error: 3,
  warning: 2,
  info: 1,
};

function getOverallScore(result: AnalysisResult): number {
  return result.scoreBreakdown?.overall ?? result.score;
}

function getGdprScore(result: AnalysisResult): number {
  return result.scoreBreakdown?.gdpr ?? result.gdprChecklist?.score ?? 0;
}

function getTrackingScore(result: AnalysisResult): number {
  return result.scoreBreakdown?.tracking ?? 0;
}

function getDetectedPlatforms(result: AnalysisResult): string[] {
  const platforms: string[] = [];

  if (result.trackingTags.googleAnalytics.detected) platforms.push('GA4');
  if (result.trackingTags.googleTagManager.detected) platforms.push('GTM');
  if (result.trackingTags.googleAdsConversion.detected) platforms.push('Google Ads');
  if (result.trackingTags.metaPixel.detected) platforms.push('Meta');
  if (result.trackingTags.linkedInInsight.detected) platforms.push('LinkedIn');
  if (result.trackingTags.tiktokPixel.detected) platforms.push('TikTok');
  if (result.trackingTags.pinterestTag.detected) platforms.push('Pinterest');
  if (result.trackingTags.snapchatPixel.detected) platforms.push('Snapchat');
  if (result.trackingTags.twitterPixel.detected) platforms.push('X');
  if (result.trackingTags.redditPixel.detected) platforms.push('Reddit');
  if (result.trackingTags.bingAds.detected) platforms.push('Bing');
  if (result.trackingTags.criteo.detected) platforms.push('Criteo');
  if (result.trackingTags.serverSideTracking.summary.hasServerSideGTM) platforms.push('sGTM');
  if (result.trackingTags.serverSideTracking.summary.hasMetaCAPI) platforms.push('Meta CAPI');

  if (result.trackingTags.other.length > 0) {
    platforms.push(...result.trackingTags.other.map((entry) => entry.name));
  }

  return [...new Set(platforms)];
}

function getTopIssues(result: AnalysisResult): string[] {
  return [...result.issues]
    .sort(
      (a, b) =>
        ISSUE_SEVERITY_WEIGHT[b.severity] - ISSUE_SEVERITY_WEIGHT[a.severity]
    )
    .slice(0, 4)
    .map((issue) => issue.title);
}

function hasTrackingDetected(result: AnalysisResult): boolean {
  if (typeof result.scoreBreakdown?.trackingDetected === 'boolean') {
    return result.scoreBreakdown.trackingDetected;
  }

  return (
    getDetectedPlatforms(result).length > 0 ||
    result.cookies.some(
      (cookie) =>
        cookie.category === 'analytics' || cookie.category === 'marketing'
    ) ||
    result.trackingTags.serverSideTracking.detected
  );
}

function getMeaningfulEventCount(result: AnalysisResult): number {
  return result.dataLayerAnalysis.events.filter((entry) => {
    const event = entry.event.toLowerCase();
    return !event.startsWith('gtm');
  }).length;
}

function isEcommerceScenario(result: AnalysisResult): boolean {
  return (
    result.dataLayerAnalysis.ecommerce.detected ||
    result.funnelValidation?.isEcommerce === true ||
    Boolean(result.ecommerceDeepDive)
  );
}

function needsFoundationOffer(result: AnalysisResult): boolean {
  const criticalTrackingIssues = result.issues.filter(
    (issue) =>
      issue.severity === 'error' &&
      ['cookie-banner', 'consent-mode', 'tracking', 'cookies', 'gtm'].includes(
        issue.category
      )
  ).length;

  return (
    !hasTrackingDetected(result) ||
    getTrackingScore(result) < 70 ||
    getGdprScore(result) < 80 ||
    criticalTrackingIssues > 0 ||
    !result.trackingTags.googleTagManager.detected ||
    !result.trackingTags.googleAnalytics.detected ||
    !result.cookieBanner.detected ||
    !result.cookieBanner.hasRejectButton ||
    !result.googleConsentMode.detected ||
    result.googleConsentMode.version !== 'v2'
  );
}

function needsFunnelOffer(result: AnalysisResult): boolean {
  if (isEcommerceScenario(result)) {
    return (
      (result.funnelValidation?.criticalGaps.length ?? 0) > 0 ||
      (result.funnelValidation?.funnelSteps.some(
        (step) => step.detected && !step.hasRequiredParams
      ) ??
        false) ||
      (result.funnelValidation?.overallScore ?? 100) < 85 ||
      (result.ecommerceDeepDive?.coverage.missingEvents.length ?? 0) > 0
    );
  }

  const conversionIssues = result.issues.filter(
    (issue) => issue.category === 'conversion' || issue.category === 'attribution'
  ).length;

  return (
    (result.conversionTrackingAudit?.overallScore ?? 100) < 75 ||
    conversionIssues > 0 ||
    getMeaningfulEventCount(result) < 3
  );
}

function needsServerSideOffer(result: AnalysisResult): boolean {
  if (result.trackingTags.serverSideTracking.detected) {
    return false;
  }

  const hasAdsPlatforms =
    result.trackingTags.metaPixel.detected ||
    result.trackingTags.googleAdsConversion.detected ||
    result.trackingTags.tiktokPixel.detected ||
    result.trackingTags.linkedInInsight.detected ||
    result.trackingTags.bingAds.detected ||
    result.trackingTags.pinterestTag.detected ||
    result.trackingTags.snapchatPixel.detected ||
    result.trackingTags.redditPixel.detected;

  const hasCommercialTracking = hasAdsPlatforms || isEcommerceScenario(result);

  return (
    hasCommercialTracking &&
    (((result.cookieLifetimeAudit?.impactedCookies.length ?? 0) > 0 &&
      (result.cookieLifetimeAudit?.estimatedDataLoss ?? 0) >= 5) ||
    ((result.eventQualityScore?.overallScore ?? 100) < 80 &&
      hasAdsPlatforms) ||
    (result.trackingTags.metaPixel.detected &&
      !result.trackingTags.serverSideTracking.summary.hasMetaCAPI) ||
    ((result.conversionTrackingAudit?.overallScore ?? 100) < 75 &&
      hasCommercialTracking))
  );
}

function getDifficultyPriceLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  if (difficulty === 'easy') return 'ab 190 EUR';
  if (difficulty === 'medium') return 'ab 290 EUR';
  return 'ab 490 EUR';
}

function getPlatformPriceLabel(platform: string): string {
  const normalized = platform.toLowerCase();

  if (['amazon', 'otto', 'ebay'].includes(normalized)) {
    return 'ab 390 EUR / Plattform';
  }

  if (['linkedin', 'tiktok'].includes(normalized)) {
    return 'ab 290 EUR / Plattform';
  }

  return 'ab 190 EUR / Plattform';
}

function buildAddOns(result: AnalysisResult): OfferAddOn[] {
  const addOns: OfferAddOn[] = [];

  for (const item of result.unusedPotential?.quickWins ?? []) {
    addOns.push({
      id: `quick-win-${item.platform}-${item.title}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      title: item.title,
      description: item.recommendation,
      priceLabel: getDifficultyPriceLabel(item.difficulty),
      reason: item.currentState,
      recommended: true,
    });
  }

  for (const platform of result.unusedPotential?.missingPlatforms ?? []) {
    addOns.push({
      id: `platform-${platform.platform}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      title: `${platform.platform} Tracking`,
      description: `Technische Anbindung inkl. Event-Mapping und QA für ${platform.platform}.`,
      priceLabel: getPlatformPriceLabel(platform.platform),
      reason: platform.reason,
      recommended: true,
    });
  }

  const deduped = new Map<string, OfferAddOn>();
  for (const addOn of addOns) {
    if (!deduped.has(addOn.title)) {
      deduped.set(addOn.title, addOn);
    }
  }

  return [...deduped.values()].slice(0, 4);
}

function buildFoundationReasons(result: AnalysisResult): string[] {
  const reasons: string[] = [];

  if (!result.cookieBanner.detected || !result.cookieBanner.hasRejectButton) {
    reasons.push(
      'Consent, Banner und Tracking greifen erst sauber ineinander, wenn die Freigabelogik technisch korrekt umgesetzt ist.'
    );
  }

  if (!result.googleConsentMode.detected || result.googleConsentMode.version !== 'v2') {
    reasons.push(
      'Consent Mode v2 fehlt oder ist unvollständig. Dadurch entstehen schneller Lücken zwischen Banner und Google-Tracking.'
    );
  }

  if (!result.trackingTags.googleTagManager.detected || !result.trackingTags.googleAnalytics.detected) {
    reasons.push(
      'Eine saubere Basis aus GTM und GA4 spart spätere Nacharbeit und macht Erweiterungen deutlich einfacher.'
    );
  }

  if ((result.conversionTrackingAudit?.overallScore ?? 100) < 70) {
    reasons.push(
      'Kern-Conversions sind noch nicht stabil messbar. Damit fehlt die Grundlage für verlässliches Reporting.'
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'Ein sauberes Basis-Setup schafft Ordnung im Tracking und reduziert spätere Korrekturen.'
    );
  }

  return reasons.slice(0, 3);
}

function buildFunnelReasons(result: AnalysisResult): string[] {
  const reasons: string[] = [];

  if (isEcommerceScenario(result)) {
    reasons.push(
      'Mehr Funnel-Stufen zeigen, an welcher Stelle Nutzer im Shop abspringen und wo Umsatz verloren geht.'
    );

    if ((result.funnelValidation?.criticalGaps.length ?? 0) > 0) {
      reasons.push(
        `Wichtige Shop-Schritte fehlen noch: ${result.funnelValidation?.criticalGaps
          .slice(0, 3)
          .join(', ')}.`
      );
    }

    if ((result.ecommerceDeepDive?.coverage.missingEvents.length ?? 0) > 0) {
      reasons.push(
        `Saubere Shop-Events fehlen noch teilweise: ${result.ecommerceDeepDive?.coverage.missingEvents
          .slice(0, 3)
          .join(', ')}.`
      );
    }
  } else {
    reasons.push(
      'Zwischenziele im Lead-Funnel machen sichtbar, wo Nutzer abspringen und welche Quellen wirklich Qualität liefern.'
    );

    if ((result.conversionTrackingAudit?.overallScore ?? 100) < 75) {
      reasons.push(
        'Mehr Signale als nur der Abschluss helfen Kampagnen schneller zu bewerten und Budgets sauberer zu steuern.'
      );
    }

    if (getMeaningfulEventCount(result) < 3) {
      reasons.push(
        'Aktuell ist vor allem das Endergebnis sichtbar. Mit Funnel-Events wird der Weg dorthin endlich messbar.'
      );
    }

    if ((result.campaignAttribution?.overallScore ?? 100) < 80) {
      reasons.push(
        'Zusätzliche Funnel-Signale verbessern auch Attribution und Kanalvergleich.'
      );
    }
  }

  if (reasons.length === 0) {
    reasons.push(
      'Mehrstufiges Event-Tracking liefert bessere Entscheidungsgrundlagen für Marketing und Vertrieb.'
    );
  }

  return reasons.slice(0, 3);
}

function buildEcommerceReasons(result: AnalysisResult): string[] {
  const reasons: string[] = [];

  reasons.push(
    'Bestellwert, Währung und Produktdaten sind die Grundlage für ROAS, Shopping und wertbasierte Kampagnen.'
  );

  if (!result.dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue) {
    reasons.push(
      'Kaufwerte werden aktuell nicht zuverlässig übergeben. Dadurch fehlt die Basis für saubere Umsatzmessung.'
    );
  }

  if (!result.dataLayerAnalysis.ecommerce.valueTracking.hasCurrency) {
    reasons.push('Ohne Währung werden E-Commerce Daten in Reports und Werbekonten schnell ungenau.');
  }

  if (!result.dataLayerAnalysis.ecommerce.valueTracking.hasItemData) {
    reasons.push(
      'Produktdaten fehlen noch. Dadurch leiden Remarketing, Feed-Kampagnen und Auswertbarkeit.'
    );
  }

  if ((result.ecommerceDeepDive?.coverage.missingEvents.length ?? 0) > 0) {
    reasons.push(
      `Wichtige Shop-Events fehlen noch: ${result.ecommerceDeepDive?.coverage.missingEvents
        .slice(0, 3)
        .join(', ')}.`
    );
  }

  if (reasons.length === 0 && result.roasQuality) {
    reasons.push(
      `Die ROAS-Datenqualität liegt aktuell bei ${result.roasQuality.overallScore}%.`
    );
  }

  return reasons.slice(0, 3);
}

function buildServerSideReasons(result: AnalysisResult): string[] {
  const reasons: string[] = [];

  reasons.push(
    'Ein First-Party Setup macht die Messung robuster bei Safari, Adblockern und allgemeinen Browser-Limits.'
  );

  if ((result.cookieLifetimeAudit?.estimatedDataLoss ?? 0) >= 5) {
    reasons.push(
      'Die Analyse zeigt bereits Messlücken durch Browser-Limits. Genau dort spielt Server-Side Tracking seine Stärke aus.'
    );
  }

  if (
    result.trackingTags.metaPixel.detected &&
    !result.trackingTags.serverSideTracking.summary.hasMetaCAPI
  ) {
    reasons.push(
      'Meta CAPI verbessert die Zuordnung von Conversions und stabilisiert die Event-Übertragung im Werbekonto.'
    );
  }

  if (
    (result.trackingTags.googleAnalytics.detected ||
      result.trackingTags.googleAdsConversion.detected) &&
    !result.trackingTags.serverSideTracking.summary.hasServerSideGTM
  ) {
    reasons.push(
      'Ein serverseitiges Google-Setup reduziert Messverluste, ohne die Consent-Logik zu umgehen.'
    );
  }

  if ((result.eventQualityScore?.overallScore ?? 100) < 80) {
    reasons.push(
      'Stabilere Event-Übertragung verbessert Datenqualität in Reports und Ads-Plattformen spürbar.'
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'Server-Side Tracking lohnt sich vor allem dann, wenn das Setup auf stabile Messung und weniger Datenlücken ausgelegt sein soll.'
    );
  }

  return reasons.slice(0, 3);
}

function buildPlatformReasons(result: AnalysisResult, addOns: OfferAddOn[]): string[] {
  const reasons: string[] = [];
  const missingPlatforms = addOns
    .filter((addOn) => addOn.id.startsWith('platform-'))
    .slice(0, 3)
    .map((addOn) => addOn.title.replace(' Tracking', ''));

  if (missingPlatforms.length > 0) {
    reasons.push(
      `Sinnvolle weitere Kanäle fehlen aktuell noch: ${missingPlatforms.join(', ')}.`
    );
  }

  if ((result.unusedPotential?.quickWins.length ?? 0) > 0) {
    reasons.push(
      'Zusätzliche Plattformen lassen sich auf deiner bestehenden Basis schnell technisch sauber anbinden.'
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'So werden neue Kanäle sofort messbar und lassen sich sauber mit bestehenden Kampagnen vergleichen.'
    );
  }

  return reasons.slice(0, 3);
}

function createFoundationOffer(result: AnalysisResult, relevance: number): OfferCandidate {
  return {
    id: 'tracking-foundation',
    relevance,
    title: 'Tracking Basis',
    badge: 'Empfohlen',
    accent: 'indigo',
    description:
      'Consent, GTM, GA4 und die wichtigsten Conversions sauber aufsetzen.',
    priceLabel: 'ab 490 EUR',
    setupTimeLabel: '2 bis 4 Werktage',
    bestFor: 'wenn Consent, Basis-Tracking oder Kern-Conversions noch Lücken haben',
    rationale: buildFoundationReasons(result),
    includes: [
      'Consent Mode v2 und CMP-Abgleich',
      'GTM und GA4 Grundsetup',
      '1 bis 2 Kern-Conversions inkl. QA',
    ],
  };
}

function createFunnelOffer(result: AnalysisResult, relevance: number): OfferCandidate {
  const isEcommerce = isEcommerceScenario(result);

  return {
    id: 'funnel-tracking',
    relevance,
    title: 'Funnel Tracking',
    badge: 'Nächster Schritt',
    accent: 'purple',
    description: isEcommerce
      ? 'Checkout- und Shop-Schritte messbar machen, damit Optimierung nicht nur am Kauf hängt.'
      : 'Wichtige Zwischenstufen im Lead-Funnel messbar machen.',
    priceLabel: 'ab 790 EUR',
    setupTimeLabel: '3 bis 5 Werktage',
    bestFor: isEcommerce
      ? 'wenn du nicht nur Käufe, sondern den Weg dorthin sauber messen willst'
      : 'wenn Formulare, Anfragen oder Qualifizierungsschritte besser messbar werden sollen',
    rationale: buildFunnelReasons(result),
    includes: isEcommerce
      ? [
          'Shop- und Checkout-Stufen',
          'Event- und Parameter-Mapping',
          'QA für Funnel und Reporting',
        ]
      : [
          'Lead- und Mikro-Conversions',
          'Funnel-Stufen für Formulare oder Calls',
          'QA und Debugging',
        ],
  };
}

function createEcommerceOffer(result: AnalysisResult, relevance: number): OfferCandidate {
  return {
    id: 'ecommerce-tracking',
    relevance,
    title: 'E-Commerce Tracking',
    badge: 'Empfohlen',
    accent: 'emerald',
    description:
      'Kaufwert, Währung und Produktdaten sauber an GA4 und Ads übergeben.',
    priceLabel: 'ab 890 EUR',
    setupTimeLabel: '3 bis 6 Werktage',
    bestFor: 'wenn Umsatz, ROAS und Shop-Events sauber messbar werden sollen',
    rationale: buildEcommerceReasons(result),
    includes: [
      'Shop-Events für GA4',
      'Value, Currency und Produktdaten',
      'QA für Reporting und Ads-Anbindung',
    ],
  };
}

function createServerSideOffer(result: AnalysisResult, relevance: number): OfferCandidate {
  return {
    id: 'server-side-tracking',
    relevance,
    title: 'Server-Side Tracking',
    badge: 'Starkes Upgrade',
    accent: 'amber',
    description:
      'sGTM und CAPI für robusteres Tracking und weniger Messlücken im Werbekonto.',
    priceLabel: 'ab 1.490 EUR',
    setupTimeLabel: '4 bis 8 Werktage',
    bestFor: 'wenn Tracking stabiler laufen und weniger anfällig für Browser-Limits werden soll',
    rationale: buildServerSideReasons(result),
    includes: [
      'sGTM oder First-Party Setup',
      'Meta CAPI bzw. serverseitige Event-Weitergabe',
      'Testing, Deduplizierung und QA',
    ],
  };
}

function createPlatformOffer(
  result: AnalysisResult,
  addOns: OfferAddOn[],
  relevance: number
): OfferCandidate {
  return {
    id: 'platform-expansion',
    relevance,
    title: 'Weitere Plattformen',
    badge: 'Optional',
    accent: 'indigo',
    description:
      'Zusätzliche Kanäle wie Bing, TikTok oder Pinterest technisch sauber anbinden.',
    priceLabel: 'ab 190 EUR / Plattform',
    setupTimeLabel: '1 bis 2 Werktage je Plattform',
    bestFor: 'wenn weitere Kanäle schnell messbar gemacht werden sollen',
    rationale: buildPlatformReasons(result, addOns),
    includes: [
      'Pixel- oder Tag-Setup',
      'Conversion-Mapping',
      'QA und Freigabe',
    ],
  };
}

function assignBadges(cards: OfferCard[]): OfferCard[] {
  return cards.map((card, index) => {
    if (index === 0) {
      return { ...card, badge: 'Empfohlen' };
    }

    if (card.id === 'server-side-tracking') {
      return { ...card, badge: 'Starkes Upgrade' };
    }

    if (card.id === 'platform-expansion') {
      return { ...card, badge: 'Optional' };
    }

    return {
      ...card,
      badge: index === 1 ? 'Sinnvoller nächster Schritt' : 'Erweiterung',
    };
  });
}

export function createOfferRecommendationSet(
  result: AnalysisResult
): OfferRecommendationSet {
  const overallScore = getOverallScore(result);
  const gdprScore = getGdprScore(result);
  const trackingScore = getTrackingScore(result);
  const detectedPlatforms = getDetectedPlatforms(result);
  const topIssues = getTopIssues(result);
  const addOns = buildAddOns(result);

  const ecommerce = isEcommerceScenario(result);
  const trackingDetected = hasTrackingDetected(result);
  const needsFoundation = needsFoundationOffer(result);
  const needsFunnel = needsFunnelOffer(result);
  const needsServerSide = needsServerSideOffer(result);

  const scenario: OfferScenario = ecommerce
    ? 'ecommerce'
    : !trackingDetected || needsFoundation
    ? 'foundation'
    : needsFunnel
    ? 'leadgen'
    : 'advanced';

  const candidates: OfferCandidate[] = [];

  if (ecommerce) {
    candidates.push(createEcommerceOffer(result, 98));
    if (needsFunnel) candidates.push(createFunnelOffer(result, 90));
    if (needsServerSide) candidates.push(createServerSideOffer(result, 92));
    if (!needsFunnel && needsFoundation) {
      candidates.push(createFoundationOffer(result, 74));
    }
    if (addOns.length > 0) candidates.push(createPlatformOffer(result, addOns, 70));
  } else {
    if (needsFoundation || !trackingDetected) {
      candidates.push(createFoundationOffer(result, 97));
    }
    if (needsFunnel) {
      candidates.push(createFunnelOffer(result, needsFoundation ? 86 : 95));
    }
    if (needsServerSide) {
      candidates.push(createServerSideOffer(result, 90));
    }
    if (addOns.length > 0) {
      candidates.push(createPlatformOffer(result, addOns, 73));
    }
    if (!needsFoundation) {
      candidates.push(createFoundationOffer(result, 62));
    }
  }

  const uniqueCandidates = [...new Map(candidates.map((card) => [card.id, card])).values()]
    .sort((a, b) => b.relevance - a.relevance);

  const shouldShowThree =
    uniqueCandidates.length >= 3 &&
    (ecommerce ||
      needsServerSide ||
      addOns.length > 0 ||
      result.issues.filter((issue) => issue.severity === 'error').length >= 2);

  const selectedCards = assignBadges(
    uniqueCandidates.slice(0, shouldShowThree ? 3 : 2)
  );

  const heading = ecommerce
    ? 'Empfohlene Setups für deinen Shop'
    : !trackingDetected || needsFoundation
    ? 'Empfohlene Setups für diese Website'
    : 'Sinnvolle nächste Schritte für dein Tracking';

  const subheading = ecommerce
    ? 'Aus der Analyse leiten wir die nächsten sinnvollen Umsetzungen für saubere Messung und bessere Datenqualität ab.'
    : 'Die Auswahl basiert auf Consent, Conversion-Setup und dem Potenzial deiner aktuellen Tracking-Basis.';

  const highlightPills = [
    `Score ${overallScore}/100`,
    `DSGVO ${gdprScore}/100`,
    `Tracking ${trackingScore}/100`,
    ecommerce
      ? 'Shop erkannt'
      : detectedPlatforms.length > 0
      ? `${detectedPlatforms.length} Tracking-Signale`
      : 'Basis-Tracking ausbaufähig',
  ].filter((entry): entry is string => Boolean(entry));

  return {
    scenario,
    heading,
    subheading,
    cards: selectedCards,
    addOns,
    detectedPlatforms,
    topIssues,
    highlightPills,
  };
}
