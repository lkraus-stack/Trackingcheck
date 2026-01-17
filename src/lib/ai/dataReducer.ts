// Datenreduktions-Funktionen für KI-Anfragen
// Reduziert die Größe von AnalysisResult um 70-90% für Token-Einsparung

import { AnalysisResult } from '@/types';

// Maximale Anzahl von Einträgen in Arrays (um Token zu sparen)
const MAX_COOKIES = 20;
const MAX_NETWORK_REQUESTS = 50;
const MAX_DATA_LAYER_ENTRIES = 30;
const MAX_THIRD_PARTY_DOMAINS = 30;
const MAX_ISSUES = 30;

/**
 * Reduziert AnalysisResult für KI-Anfragen
 * Entfernt große Arrays und behält nur relevante Zusammenfassungen
 */
export function reduceAnalysisResultForAI(data: AnalysisResult): Partial<AnalysisResult> {
  // Basis-Informationen behalten
  const reduced: any = {
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
    Object.entries(cookiesByCategory).forEach(([category, cookies]) => {
      const criticalCookies = cookies.filter(c => c.isThirdParty || c.category === 'marketing');
      const regularCookies = cookies.filter(c => !c.isThirdParty && c.category !== 'marketing');
      
      topCookies.push(...criticalCookies.slice(0, 5));
      topCookies.push(...regularCookies.slice(0, 2));
    });

    reduced.cookies = topCookies.slice(0, MAX_COOKIES);
    reduced.cookieSummary = {
      total: data.cookies.length,
      byCategory: Object.keys(cookiesByCategory).reduce((acc, cat) => {
        acc[cat] = cookiesByCategory[cat].length;
        return acc;
      }, {} as Record<string, number>),
      thirdParty: data.cookies.filter(c => c.isThirdParty).length,
      longLived: data.cookies.filter(c => c.isLongLived).length,
    };
  }

  // Cookie Consent Test - reduziert (nur Zusammenfassung)
  if (data.cookieConsentTest) {
    reduced.cookieConsentTest = {
      analysis: data.cookieConsentTest.analysis,
      beforeConsent: {
        cookieCount: data.cookieConsentTest.beforeConsent.cookieCount,
        trackingCookiesFound: data.cookieConsentTest.beforeConsent.trackingCookiesFound,
        // Cookies nicht mitsenden
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
): Partial<AnalysisResult> {
  const base = {
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
        // cookieConsentTest nicht inkludiert - würde große Arrays benötigen
        // Nur die Zusammenfassung ist verfügbar über cookieBanner-Ergebnisse
        cookies: data.cookies?.slice(0, 20),
      };

    case 'consent-mode':
    case 'google consent mode':
    case 'googleconsentmode':
      return {
        ...base,
        googleConsentMode: data.googleConsentMode,
        cookieBanner: data.cookieBanner,
      };

    case 'tcf':
      return {
        ...base,
        tcf: data.tcf,
        cookieBanner: data.cookieBanner,
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
      };

    case 'performance':
    case 'marketing':
      return {
        ...base,
        eventQualityScore: data.eventQualityScore,
        funnelValidation: data.funnelValidation,
        conversionTrackingAudit: data.conversionTrackingAudit,
        campaignAttribution: data.campaignAttribution,
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
): Partial<AnalysisResult> {
  const questionLower = question.toLowerCase();

  // Identifiziere relevante Themen aus der Frage
  const relevantSections: string[] = [];

  if (questionLower.includes('cookie') || questionLower.includes('banner')) {
    relevantSections.push('cookie-banner');
  }
  if (questionLower.includes('consent') || questionLower.includes('consent mode')) {
    relevantSections.push('consent-mode');
  }
  if (questionLower.includes('tcf')) {
    relevantSections.push('tcf');
  }
  if (questionLower.includes('tracking') || questionLower.includes('tag') || questionLower.includes('pixel')) {
    relevantSections.push('tracking-tags');
  }
  if (questionLower.includes('datalayer') || questionLower.includes('data layer')) {
    relevantSections.push('datalayer');
  }
  if (questionLower.includes('third') || questionLower.includes('domain')) {
    relevantSections.push('third-party');
  }
  if (questionLower.includes('gdpr') || questionLower.includes('dsgvo') || questionLower.includes('compliance')) {
    relevantSections.push('gdpr');
  }
  if (questionLower.includes('performance') || questionLower.includes('marketing') || questionLower.includes('conversion')) {
    relevantSections.push('performance');
  }

  // Wenn keine spezifischen Themen erkannt, verwende reduzierte Version
  if (relevantSections.length === 0) {
    return reduceAnalysisResultForAI(data);
  }

  // Kombiniere relevante Sektionen
  const reduced: any = {
    url: data.url,
    timestamp: data.timestamp,
    status: data.status,
    score: data.score,
  };

  relevantSections.forEach(section => {
    const sectionData = reduceForSection(data, section);
    Object.assign(reduced, sectionData);
  });

  // Füge immer Issues hinzu (können in jeder Frage relevant sein)
  if (data.issues) {
    reduced.issues = data.issues.slice(0, 20);
  }

  return reduced;
}
