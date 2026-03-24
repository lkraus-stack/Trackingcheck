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
  timelineLabel: string;
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
    result.trackingTags.linkedInInsight.detected;

  return (
    ((result.cookieLifetimeAudit?.estimatedDataLoss ?? 0) >= 10 &&
      (result.cookieLifetimeAudit?.impactedCookies.length ?? 0) > 0) ||
    ((result.eventQualityScore?.overallScore ?? 100) < 80 &&
      getDetectedPlatforms(result).length >= 1) ||
    (result.trackingTags.metaPixel.detected &&
      !result.trackingTags.serverSideTracking.summary.hasMetaCAPI) ||
    (hasAdsPlatforms &&
      !result.trackingTags.serverSideTracking.summary.hasServerSideGTM) ||
    getDetectedPlatforms(result).length >= 2
  );
}

function getDifficultyPriceLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  if (difficulty === 'easy') return '290 bis 490 EUR';
  if (difficulty === 'medium') return '490 bis 890 EUR';
  return '990 bis 1.690 EUR';
}

function getPlatformPriceLabel(platform: string): string {
  const normalized = platform.toLowerCase();

  if (['amazon', 'otto', 'ebay'].includes(normalized)) {
    return '490 bis 890 EUR / Plattform';
  }

  if (['linkedin', 'tiktok'].includes(normalized)) {
    return '390 bis 590 EUR / Plattform';
  }

  return '290 bis 490 EUR / Plattform';
}

function buildAddOns(result: AnalysisResult): OfferAddOn[] {
  const addOns: OfferAddOn[] = [];

  for (const item of result.unusedPotential?.totalPotential ?? []) {
    if (item.type === 'incomplete_setup' || item.type === 'missing_events') {
      addOns.push({
        id: `potential-${item.platform}-${item.title}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),
        title: item.title,
        description: item.recommendation,
        priceLabel: getDifficultyPriceLabel(item.difficulty),
        reason: item.currentState,
        recommended: item.difficulty !== 'hard',
      });
    }
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
      'Cookie-Banner und Consent-Auswahl sollten technisch und rechtlich sauber aufgesetzt werden.'
    );
  }

  if (!result.googleConsentMode.detected || result.googleConsentMode.version !== 'v2') {
    reasons.push('Google Consent Mode v2 fehlt oder ist unvollständig.');
  }

  if (!result.trackingTags.googleTagManager.detected || !result.trackingTags.googleAnalytics.detected) {
    reasons.push('Die Basis aus GTM und GA4 ist aktuell nicht sauber erkennbar.');
  }

  if ((result.conversionTrackingAudit?.overallScore ?? 100) < 70) {
    reasons.push('Wichtige Basis-Conversions sind noch nicht stabil messbar.');
  }

  if (reasons.length === 0) {
    reasons.push('Die Analyse zeigt Potenzial bei Basis-Tracking, Consent und Conversion-Grundlage.');
  }

  return reasons.slice(0, 3);
}

function buildFunnelReasons(result: AnalysisResult): string[] {
  const reasons: string[] = [];

  if (isEcommerceScenario(result)) {
    if ((result.funnelValidation?.criticalGaps.length ?? 0) > 0) {
      reasons.push(
        `Wichtige Funnel-Stufen fehlen: ${result.funnelValidation?.criticalGaps
          .slice(0, 3)
          .join(', ')}.`
      );
    }

    if ((result.ecommerceDeepDive?.coverage.missingEvents.length ?? 0) > 0) {
      reasons.push(
        `Shop-Events sind noch unvollständig: ${result.ecommerceDeepDive?.coverage.missingEvents
          .slice(0, 3)
          .join(', ')}.`
      );
    }

    if (
      result.funnelValidation?.funnelSteps.some(
        (step) => step.detected && !step.hasRequiredParams
      )
    ) {
      reasons.push(
        'Einzelne Funnel-Events senden noch nicht alle benötigten Parameter.'
      );
    }
  } else {
    if ((result.conversionTrackingAudit?.overallScore ?? 100) < 75) {
      reasons.push(
        `Die Conversion-Erfassung liegt aktuell nur bei ${result.conversionTrackingAudit?.overallScore ?? 0}%.`
      );
    }

    if (getMeaningfulEventCount(result) < 3) {
      reasons.push(
        'Zwischenstufen im Funnel sind kaum messbar; aktuell ist vor allem das Endergebnis sichtbar.'
      );
    }

    if ((result.campaignAttribution?.overallScore ?? 100) < 80) {
      reasons.push('Attributionssignale und Funnel-Kontext sind noch ausbaufähig.');
    }
  }

  if (reasons.length === 0) {
    reasons.push('Mehrstufiges Event-Tracking schafft deutlich bessere Optimierungsdaten.');
  }

  return reasons.slice(0, 3);
}

function buildEcommerceReasons(result: AnalysisResult): string[] {
  const reasons: string[] = [];

  if (!result.dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue) {
    reasons.push('Kaufwerte werden aktuell nicht zuverlässig an die Tracking-Plattformen übergeben.');
  }

  if (!result.dataLayerAnalysis.ecommerce.valueTracking.hasCurrency) {
    reasons.push('Die Währung fehlt in den E-Commerce Events.');
  }

  if (!result.dataLayerAnalysis.ecommerce.valueTracking.hasItemData) {
    reasons.push('Produktdaten fehlen für ROAS, Dynamic Remarketing und sauberes Reporting.');
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

  if ((result.cookieLifetimeAudit?.estimatedDataLoss ?? 0) >= 10) {
    reasons.push(
      `Browser-Limits verursachen voraussichtlich rund ${result.cookieLifetimeAudit?.estimatedDataLoss ?? 0}% Datenverlust.`
    );
  }

  if (
    result.trackingTags.metaPixel.detected &&
    !result.trackingTags.serverSideTracking.summary.hasMetaCAPI
  ) {
    reasons.push('Meta Pixel ist vorhanden, aber die Conversions API fehlt.');
  }

  if (
    (result.trackingTags.googleAnalytics.detected ||
      result.trackingTags.googleAdsConversion.detected) &&
    !result.trackingTags.serverSideTracking.summary.hasServerSideGTM
  ) {
    reasons.push('Google Tracking läuft aktuell nur clientseitig und ist dadurch anfälliger für Messverluste.');
  }

  if ((result.eventQualityScore?.overallScore ?? 100) < 80) {
    reasons.push(
      `Die Event Quality liegt aktuell nur bei ${result.eventQualityScore?.overallScore ?? 0}%.`
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'Server-Side Tracking schafft längere Cookie-Lifetimes und robustere Datenqualität.'
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
      `Sinnvolle Ausbaukanäle fehlen aktuell noch: ${missingPlatforms.join(', ')}.`
    );
  }

  if ((result.unusedPotential?.quickWins.length ?? 0) > 0) {
    reasons.push('Die Analyse zeigt direkt umsetzbare Quick Wins für zusätzliche Reichweite.');
  }

  if (reasons.length === 0) {
    reasons.push('Zusätzliche Plattformen können auf Basis des bestehenden Trackings sauber angebunden werden.');
  }

  return reasons.slice(0, 3);
}

function createFoundationOffer(result: AnalysisResult, relevance: number): OfferCandidate {
  return {
    id: 'tracking-foundation',
    relevance,
    title: 'Web-Tracking Basis',
    badge: 'Empfohlen',
    accent: 'indigo',
    description:
      'Sauberes Client-Side Setup für Consent, Website-Tracking und die wichtigsten Conversion-Ziele.',
    priceLabel: '790 bis 1.290 EUR',
    timelineLabel: 'ca. 3 bis 5 Werktage',
    bestFor: 'Websites mit lückenhaftem Basis-Tracking oder Consent-Setup',
    rationale: buildFoundationReasons(result),
    includes: [
      'GTM- und GA4-Grundsetup',
      'Consent Mode v2 und CMP-Mapping',
      'Basis-Conversions und Trigger-Logik',
      'QA, Debugging und Abnahme',
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
      ? 'Mehr Messpunkte entlang des Checkout-Funnels, damit Optimierung nicht nur auf dem Purchase basiert.'
      : 'Mehrstufige Funnel-Messung für Leads, Formulare und wichtige Zwischenschritte im Nutzerweg.',
    priceLabel: '1.290 bis 2.290 EUR',
    timelineLabel: 'ca. 5 bis 8 Werktage',
    bestFor: isEcommerce
      ? 'Shops mit Optimierungsbedarf im Checkout-Funnel'
      : 'Lead-Generierung, Form-Funnels und komplexere Customer Journeys',
    rationale: buildFunnelReasons(result),
    includes: isEcommerce
      ? [
          'Funnel-Stufen für Shop und Checkout',
          'Event- und Parameter-Mapping',
          'DataLayer-Verfeinerung inkl. QA',
          'Funnel-Analyse für Ads und Reporting',
        ]
      : [
          'Lead- und Mikro-Conversion-Tracking',
          'Funnel-Stufen für Formulare, Calls oder Qualifizierung',
          'Saubere Event-Namenslogik im DataLayer',
          'QA, Testfälle und Debugging',
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
      'Shop-Tracking mit Kaufwert, Währung, Produktdaten und sauberem ROAS-Fundament für Ads-Plattformen.',
    priceLabel: '1.490 bis 2.490 EUR',
    timelineLabel: 'ca. 5 bis 10 Werktage',
    bestFor: 'Shops mit Umsatz-, ROAS- und Conversion-Optimierung',
    rationale: buildEcommerceReasons(result),
    includes: [
      'GA4 E-Commerce Events',
      'Purchase-, Value-, Currency- und Item-Mapping',
      'Google Ads / Meta Conversion-Anbindung',
      'QA für Reporting, Remarketing und Wertübergabe',
    ],
  };
}

function createServerSideOffer(result: AnalysisResult, relevance: number): OfferCandidate {
  return {
    id: 'server-side-tracking',
    relevance,
    title: 'Server-Side Tracking',
    badge: 'Maximale Datenqualität',
    accent: 'amber',
    description:
      'Robustes Setup mit sGTM, First-Party Endpunkt, CAPI und consent-sensibler Datenübertragung.',
    priceLabel: '2.990 bis 4.990 EUR',
    timelineLabel: 'ca. 10 bis 15 Werktage',
    bestFor: 'Setups mit Ads-Budget, mehreren Plattformen oder messbarem Datenverlust',
    rationale: buildServerSideReasons(result),
    includes: [
      'Server-Side GTM Setup',
      'Meta CAPI / deduplizierte Event-Weitergabe',
      'First-Party Tracking-Endpunkt',
      'QA, Consent-Abgleich und Debugging',
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
    title: 'Plattform-Erweiterung',
    badge: 'Mehr Reichweite',
    accent: 'indigo',
    description:
      'Zusätzliche Werbeplattformen technisch sauber anbinden und mit passenden Events messbar machen.',
    priceLabel: '290 bis 690 EUR / Plattform',
    timelineLabel: 'ca. 1 bis 3 Werktage je Plattform',
    bestFor: 'Setups mit Potenzial auf weiteren Kanälen',
    rationale: buildPlatformReasons(result, addOns),
    includes: [
      'Pixel- oder Tag-Setup pro Plattform',
      'Event- und Conversion-Mapping',
      'Click-ID- und Consent-Prüfung',
      'QA und Übergabe',
    ],
  };
}

function assignBadges(cards: OfferCard[]): OfferCard[] {
  return cards.map((card, index) => {
    if (index === 0) {
      return { ...card, badge: 'Empfohlen' };
    }

    if (card.id === 'server-side-tracking') {
      return { ...card, badge: 'Maximale Datenqualität' };
    }

    if (card.id === 'platform-expansion') {
      return { ...card, badge: 'Mehr Reichweite' };
    }

    return { ...card, badge: index === 1 ? 'Nächster Schritt' : 'Ausbau' };
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
    ? 'Passende Tracking-Ausbaustufen für deinen Shop'
    : !trackingDetected || needsFoundation
    ? 'Passende Tracking-Ausbaustufen für diese Website'
    : 'Nächste Tracking-Ausbaustufen für mehr Datenqualität';

  const subheading = ecommerce
    ? 'Die Auswahl basiert auf Shop-Signalen, Wertübergabe, Funnel-Lücken und Plattform-Setup.'
    : 'Die Auswahl basiert auf Consent, Conversion-Setup, Funnel-Signalen und Plattform-Potenzial.';

  const highlightPills = [
    `Score ${overallScore}/100`,
    `DSGVO ${gdprScore}/100`,
    `Tracking ${trackingScore}/100`,
    ecommerce ? 'E-Commerce erkannt' : 'Kein Shop erkannt',
    detectedPlatforms.length > 0
      ? `${detectedPlatforms.length} Plattformsignale`
      : 'Kaum Plattformsignale',
    (result.cookieLifetimeAudit?.estimatedDataLoss ?? 0) > 0
      ? `~${result.cookieLifetimeAudit?.estimatedDataLoss ?? 0}% Datenverlust`
      : null,
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
