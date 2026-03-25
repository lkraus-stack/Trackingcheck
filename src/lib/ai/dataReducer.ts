// Datenreduktions-Funktionen für KI-Anfragen
// Reduziert die Größe von AnalysisResult um 70-90% für Token-Einsparung

import type { AnalysisResult } from '@/types';

// Maximale Anzahl von Einträgen in Arrays (um Token zu sparen)
const MAX_COOKIES = 20;
const MAX_THIRD_PARTY_DOMAINS = 30;
const MAX_ISSUES = 30;
const MAX_CHAT_ISSUES = 20;

type SectionName =
  | 'cookie-banner'
  | 'consent-mode'
  | 'tcf'
  | 'tracking-tags'
  | 'datalayer'
  | 'third-party'
  | 'gdpr'
  | 'performance';

const SECTION_KEYWORDS: Record<SectionName, string[]> = {
  'cookie-banner': [
    'cookie',
    'banner',
    'cmp',
    'einwilligung',
    'zustimmung',
    'ablehnen',
    'akzeptieren',
    'essenzielle',
    'consent banner',
  ],
  'consent-mode': [
    'consent mode',
    'google consent',
    'gcm',
    'ad_storage',
    'analytics_storage',
    'ad_user_data',
    'ad_personalization',
    'google-signale',
  ],
  tcf: [
    'tcf',
    'iab',
    'tc string',
    'tcf 2.2',
    'vendor',
    'vendors',
    'transparency',
  ],
  'tracking-tags': [
    'tracking',
    'tag',
    'tags',
    'pixel',
    'ga4',
    'gtm',
    'google ads',
    'meta pixel',
    'tiktok',
    'linkedin',
    'bing',
    'server-side',
    'serverside',
  ],
  datalayer: [
    'datalayer',
    'data layer',
    'event',
    'events',
    'purchase',
    'add_to_cart',
    'checkout',
    'ecommerce',
    'funnel',
  ],
  'third-party': [
    'third',
    'third-party',
    'drittanbieter',
    'domain',
    'domains',
    'request',
    'requests',
    'server',
    'usa',
  ],
  gdpr: [
    'gdpr',
    'dsgvo',
    'compliance',
    'datenschutz',
    'rechtlich',
    'risiko',
    'compliant',
  ],
  performance: [
    'performance',
    'marketing',
    'conversion',
    'conversions',
    'attribution',
    'roas',
    'kampagne',
    'remarketing',
  ],
};

const BROAD_QUESTION_KEYWORDS = [
  'größte',
  'wichtigste',
  'zusammenfassung',
  'überblick',
  'insgesamt',
  'gesamt',
  'risiko',
  'risiken',
  'problem',
  'probleme',
  'empfehl',
  'nächste schritte',
  'naechste schritte',
  'zuerst',
  'priorität',
  'prioritaet',
  'fazit',
  'bewertung',
];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeUnknownValues(target: unknown, source: unknown): unknown {
  if (source === undefined) return target;
  if (target === undefined) return source;

  if (Array.isArray(target) && Array.isArray(source)) {
    const seen = new Set<string>();
    return [...target, ...source].filter((item) => {
      const key =
        typeof item === 'object' && item !== null
          ? JSON.stringify(item)
          : String(item);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  if (isPlainObject(target) && isPlainObject(source)) {
    const merged: Record<string, unknown> = { ...target };

    Object.entries(source).forEach(([key, value]) => {
      merged[key] = key in merged
        ? mergeUnknownValues(merged[key], value)
        : value;
    });

    return merged;
  }

  return source;
}

function mergeReducedData(
  target: ReducedAnalysisData,
  source: ReducedAnalysisData
): ReducedAnalysisData {
  const merged: ReducedAnalysisData = { ...target };

  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined) return;

    merged[key] = key in merged
      ? mergeUnknownValues(merged[key], value)
      : value;
  });

  return merged;
}

function getReducedCookieConsentTest(data: AnalysisResult): ReducedAnalysisData['cookieConsentTest'] {
  if (!data.cookieConsentTest) return undefined;

  return {
    analysis: data.cookieConsentTest.analysis,
    beforeConsent: {
      cookieCount: data.cookieConsentTest.beforeConsent.cookieCount,
      trackingCookiesFound: data.cookieConsentTest.beforeConsent.trackingCookiesFound,
    },
    afterAccept: {
      cookieCount: data.cookieConsentTest.afterAccept.cookieCount,
      clickSuccessful: data.cookieConsentTest.afterAccept.clickSuccessful,
      buttonFound: data.cookieConsentTest.afterAccept.buttonFound,
    },
    afterReject: {
      cookieCount: data.cookieConsentTest.afterReject.cookieCount,
      clickSuccessful: data.cookieConsentTest.afterReject.clickSuccessful,
      buttonFound: data.cookieConsentTest.afterReject.buttonFound,
    },
  };
}

function getCookieSummary(data: AnalysisResult): ReducedAnalysisData['cookieSummary'] {
  if (!data.cookies || !Array.isArray(data.cookies)) return undefined;

  const cookiesByCategory = data.cookies.reduce((acc, cookie) => {
    const category = cookie.category || 'unknown';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cookie);
    return acc;
  }, {} as Record<string, typeof data.cookies>);

  return {
    total: data.cookies.length,
    byCategory: Object.keys(cookiesByCategory).reduce((acc, cat) => {
      acc[cat] = cookiesByCategory[cat].length;
      return acc;
    }, {} as Record<string, number>),
    thirdParty: data.cookies.filter((cookie) => cookie.isThirdParty).length,
    longLived: data.cookies.filter((cookie) => cookie.isLongLived).length,
  };
}

export type ReducedAnalysisData = Record<string, unknown>;

/**
 * Reduziert AnalysisResult für KI-Anfragen
 * Entfernt große Arrays und behält nur relevante Zusammenfassungen
 */
export function reduceAnalysisResultForAI(data: AnalysisResult): ReducedAnalysisData {
  // Basis-Informationen behalten
  const reduced: ReducedAnalysisData = {
    url: data.url,
    timestamp: data.timestamp,
    status: data.status,
    score: data.score,
  };

  // Cookie Banner - vollständig behalten (klein)
  if (data.cookieBanner) {
    reduced.cookieBanner = data.cookieBanner;
  }

  // TCF - vollständig behalten (klein)
  if (data.tcf) {
    reduced.tcf = data.tcf;
  }

  // Google Consent Mode - vollständig behalten (klein)
  if (data.googleConsentMode) {
    reduced.googleConsentMode = data.googleConsentMode;
  }

  // Tracking Tags - vollständig behalten (wichtig, aber nicht riesig)
  if (data.trackingTags) {
    reduced.trackingTags = data.trackingTags;
  }

  // Cookies - nur Top N + Zusammenfassung
  if (data.cookies && Array.isArray(data.cookies)) {
    const cookiesByCategory = data.cookies.reduce((acc, cookie) => {
      const category = cookie.category || 'unknown';
      if (!acc[category]) acc[category] = [];
      acc[category].push(cookie);
      return acc;
    }, {} as Record<string, typeof data.cookies>);

    // Top Cookies pro Kategorie + kritische Cookies
    const topCookies: typeof data.cookies = [];
    Object.entries(cookiesByCategory).forEach(([, cookies]) => {
      const criticalCookies = cookies.filter(c => c.isThirdParty || c.category === 'marketing');
      const regularCookies = cookies.filter(c => !c.isThirdParty && c.category !== 'marketing');
      
      topCookies.push(...criticalCookies.slice(0, 5));
      topCookies.push(...regularCookies.slice(0, 2));
    });

    reduced.cookies = topCookies.slice(0, MAX_COOKIES);
    reduced.cookieSummary = getCookieSummary(data);
  }

  // Cookie Consent Test - reduziert (nur Zusammenfassung)
  if (data.cookieConsentTest) {
    reduced.cookieConsentTest = getReducedCookieConsentTest(data);
  }

  // DataLayer - reduziert (kein rawDataLayer, nur Events)
  if (data.dataLayerAnalysis) {
    reduced.dataLayerAnalysis = {
      hasDataLayer: data.dataLayerAnalysis.hasDataLayer,
      events: data.dataLayerAnalysis.events,
      ecommerce: data.dataLayerAnalysis.ecommerce,
      customDimensions: data.dataLayerAnalysis.customDimensions.slice(0, 20),
      userProperties: data.dataLayerAnalysis.userProperties.slice(0, 20),
      // rawDataLayer NICHT mitsenden (sehr groß)
      // Nur Zusammenfassung
      rawDataLayerSummary: data.dataLayerAnalysis.rawDataLayer ? {
        totalEntries: data.dataLayerAnalysis.rawDataLayer.length,
        eventTypes: [...new Set(data.dataLayerAnalysis.rawDataLayer
          .filter(e => e.event)
          .map(e => e.event))].slice(0, 10),
      } : undefined,
    };
  }

  // Third-Party Domains - nur Top N + Zusammenfassung
  if (data.thirdPartyDomains) {
    const sortedDomains = [...(data.thirdPartyDomains.domains || [])]
      .sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0));

    reduced.thirdPartyDomains = {
      totalCount: data.thirdPartyDomains.totalCount,
      domains: sortedDomains.slice(0, MAX_THIRD_PARTY_DOMAINS),
      categories: data.thirdPartyDomains.categories,
      riskAssessment: data.thirdPartyDomains.riskAssessment,
    };
  }

  // GDPR Checklist - vollständig behalten (wichtig, aber nicht riesig)
  if (data.gdprChecklist) {
    reduced.gdprChecklist = data.gdprChecklist;
  }

  // DMA Check - vollständig behalten (klein)
  if (data.dmaCheck) {
    reduced.dmaCheck = data.dmaCheck;
  }

  // Issues - nur Top N (nach Severity sortiert)
  if (data.issues && Array.isArray(data.issues)) {
    const sortedIssues = [...data.issues].sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    reduced.issues = sortedIssues.slice(0, MAX_ISSUES);
    if (data.issues.length > MAX_ISSUES) {
      reduced.issuesSummary = {
        total: data.issues.length,
        bySeverity: {
          error: data.issues.filter(i => i.severity === 'error').length,
          warning: data.issues.filter(i => i.severity === 'warning').length,
          info: data.issues.filter(i => i.severity === 'info').length,
        },
      };
    }
  }

  // Performance Marketing Features - reduzierte Versionen
  if (data.eventQualityScore) {
    reduced.eventQualityScore = {
      overallScore: data.eventQualityScore.overallScore,
      platforms: data.eventQualityScore.platforms,
      recommendations: data.eventQualityScore.recommendations?.slice(0, 10),
    };
  }

  if (data.funnelValidation) {
    reduced.funnelValidation = {
      isEcommerce: data.funnelValidation.isEcommerce,
      platform: data.funnelValidation.platform,
      funnelSteps: data.funnelValidation.funnelSteps,
      overallScore: data.funnelValidation.overallScore,
      criticalGaps: data.funnelValidation.criticalGaps,
      recommendations: data.funnelValidation.recommendations?.slice(0, 10),
    };
  }

  // Weitere Performance Marketing Features - nur Scores und Zusammenfassungen
  if (data.cookieLifetimeAudit) {
    reduced.cookieLifetimeAudit = {
      totalCookies: data.cookieLifetimeAudit.totalCookies,
      impactedCookies: data.cookieLifetimeAudit.impactedCookies?.slice(0, 10),
      safariUserPercentage: data.cookieLifetimeAudit.safariUserPercentage,
      estimatedDataLoss: data.cookieLifetimeAudit.estimatedDataLoss,
      recommendations: data.cookieLifetimeAudit.recommendations?.slice(0, 10),
      serverSideWouldHelp: data.cookieLifetimeAudit.serverSideWouldHelp,
    };
  }

  if (data.unusedPotential) {
    reduced.unusedPotential = {
      totalPotential: data.unusedPotential.totalPotential?.slice(0, 10),
      estimatedMonthlyValue: data.unusedPotential.estimatedMonthlyValue,
      quickWins: data.unusedPotential.quickWins?.slice(0, 5),
      missingPlatforms: data.unusedPotential.missingPlatforms?.slice(0, 5),
    };
  }

  if (data.roasQuality) {
    reduced.roasQuality = {
      overallScore: data.roasQuality.overallScore,
      valueTracking: data.roasQuality.valueTracking,
      dataCompleteness: data.roasQuality.dataCompleteness,
      estimatedDataLoss: data.roasQuality.estimatedDataLoss,
      recommendations: data.roasQuality.recommendations?.slice(0, 10),
    };
  }

  if (data.conversionTrackingAudit) {
    reduced.conversionTrackingAudit = {
      overallScore: data.conversionTrackingAudit.overallScore,
      platforms: data.conversionTrackingAudit.platforms,
      issues: data.conversionTrackingAudit.issues?.slice(0, 10),
      recommendations: data.conversionTrackingAudit.recommendations?.slice(0, 10),
    };
  }

  if (data.campaignAttribution) {
    reduced.campaignAttribution = {
      overallScore: data.campaignAttribution.overallScore,
      assessmentMode: data.campaignAttribution.assessmentMode,
      explanation: data.campaignAttribution.explanation,
      detectionBasis: data.campaignAttribution.detectionBasis,
      clickIdStatus: data.campaignAttribution.clickIdStatus,
      utmStatus: data.campaignAttribution.utmStatus,
      crossDomain: data.campaignAttribution.crossDomain,
      issues: data.campaignAttribution.issues?.slice(0, 10),
      recommendations: data.campaignAttribution.recommendations?.slice(0, 10),
    };
  }

  if (data.gtmAudit) {
    reduced.gtmAudit = {
      detected: data.gtmAudit.detected,
      containerIds: data.gtmAudit.containerIds,
      hasMultipleContainers: data.gtmAudit.hasMultipleContainers,
      hasNoScriptTag: data.gtmAudit.hasNoScriptTag,
      snippetInHead: data.gtmAudit.snippetInHead,
      consentDefaultBeforeGtm: data.gtmAudit.consentDefaultBeforeGtm,
      issues: data.gtmAudit.issues?.slice(0, 10),
      recommendations: data.gtmAudit.recommendations?.slice(0, 10),
      score: data.gtmAudit.score,
    };
  }

  if (data.privacySandbox) {
    reduced.privacySandbox = data.privacySandbox;
  }

  if (data.ecommerceDeepDive) {
    reduced.ecommerceDeepDive = {
      overallScore: data.ecommerceDeepDive.overallScore,
      coverage: data.ecommerceDeepDive.coverage,
      itemDataQuality: data.ecommerceDeepDive.itemDataQuality,
      revenueQuality: data.ecommerceDeepDive.revenueQuality,
      dynamicRemarketingReady: data.ecommerceDeepDive.dynamicRemarketingReady,
      recommendations: data.ecommerceDeepDive.recommendations?.slice(0, 10),
    };
  }

  return reduced;
}

/**
 * Reduziert AnalysisResult für spezifische Sektion
 * Sendet nur relevante Daten für die angefragte Sektion
 */
export function reduceForSection(
  data: AnalysisResult,
  sectionName: string
): ReducedAnalysisData {
  const base: ReducedAnalysisData = {
    url: data.url,
    timestamp: data.timestamp,
    status: data.status,
    score: data.score,
  };

  // Basierend auf Sektion nur relevante Daten senden
  switch (sectionName.toLowerCase()) {
    case 'cookie-banner':
    case 'cookie banner':
    case 'consent':
      return {
        ...base,
        cookieBanner: data.cookieBanner,
        cookieConsentTest: getReducedCookieConsentTest(data),
        cookies: data.cookies?.slice(0, 20),
        cookieSummary: getCookieSummary(data),
      };

    case 'consent-mode':
    case 'google consent mode':
    case 'googleconsentmode':
      return {
        ...base,
        googleConsentMode: data.googleConsentMode,
        cookieBanner: data.cookieBanner,
        cookieConsentTest: getReducedCookieConsentTest(data),
        trackingTags: {
          googleAnalytics: data.trackingTags?.googleAnalytics,
          googleTagManager: data.trackingTags?.googleTagManager,
          googleAdsConversion: data.trackingTags?.googleAdsConversion,
        },
      };

    case 'tcf':
      return {
        ...base,
        tcf: data.tcf,
        cookieBanner: data.cookieBanner,
        cookieConsentTest: getReducedCookieConsentTest(data),
      };

    case 'tracking-tags':
    case 'tracking tags':
    case 'tags':
      return {
        ...base,
        trackingTags: data.trackingTags,
        thirdPartyDomains: {
          ...data.thirdPartyDomains,
          domains: data.thirdPartyDomains?.domains?.slice(0, 20) || [],
        },
      };

    case 'datalayer':
    case 'data layer':
      return {
        ...base,
        dataLayerAnalysis: {
          hasDataLayer: data.dataLayerAnalysis?.hasDataLayer,
          events: data.dataLayerAnalysis?.events,
          ecommerce: data.dataLayerAnalysis?.ecommerce,
          customDimensions: data.dataLayerAnalysis?.customDimensions?.slice(0, 20),
          userProperties: data.dataLayerAnalysis?.userProperties?.slice(0, 20),
        },
      };

    case 'third-party':
    case 'third party':
    case 'domains':
      return {
        ...base,
        thirdPartyDomains: {
          ...data.thirdPartyDomains,
          domains: data.thirdPartyDomains?.domains?.slice(0, 30) || [],
        },
        cookies: data.cookies?.filter(c => c.isThirdParty).slice(0, 20),
      };

    case 'gdpr':
    case 'compliance':
      return {
        ...base,
        gdprChecklist: data.gdprChecklist,
        issues: data.issues?.slice(0, 20),
        cookieBanner: data.cookieBanner,
        googleConsentMode: data.googleConsentMode,
        thirdPartyDomains: data.thirdPartyDomains
          ? {
              totalCount: data.thirdPartyDomains.totalCount,
              riskAssessment: data.thirdPartyDomains.riskAssessment,
            }
          : undefined,
      };

    case 'performance':
    case 'marketing':
      return {
        ...base,
        eventQualityScore: data.eventQualityScore,
        funnelValidation: data.funnelValidation,
        conversionTrackingAudit: data.conversionTrackingAudit,
        campaignAttribution: data.campaignAttribution,
        trackingTags: data.trackingTags,
      };

    default:
      // Fallback: reduzierte Version für unbekannte Sektionen
      return reduceAnalysisResultForAI(data);
  }
}

/**
 * Reduziert für Chat-Kontext basierend auf Frage
 * Analysiert die Frage und sendet nur relevante Teile
 */
export function reduceForQuestion(
  data: AnalysisResult,
  question: string
): ReducedAnalysisData {
  const questionLower = question.toLowerCase();
  const relevantSections = (Object.entries(SECTION_KEYWORDS) as Array<[SectionName, string[]]>)
    .filter(([, keywords]) => includesAny(questionLower, keywords))
    .map(([section]) => section);
  const isBroadQuestion = includesAny(questionLower, BROAD_QUESTION_KEYWORDS);

  // Bei breiten Risiko-/Zusammenfassungsfragen lieber mehr Kontext geben.
  if (relevantSections.length === 0 || isBroadQuestion) {
    return {
      ...reduceAnalysisResultForAI(data),
      focusAreas: relevantSections,
      questionType: isBroadQuestion ? 'broad' : 'general',
    };
  }

  let reduced: ReducedAnalysisData = {
    url: data.url,
    timestamp: data.timestamp,
    status: data.status,
    score: data.score,
    focusAreas: relevantSections,
    questionType: 'targeted',
  };

  relevantSections.forEach((section) => {
    const sectionData = reduceForSection(data, section);
    reduced = mergeReducedData(reduced, sectionData);
  });

  if (data.issues) {
    reduced.issues = data.issues.slice(0, MAX_CHAT_ISSUES);
  }

  return reduced;
}
