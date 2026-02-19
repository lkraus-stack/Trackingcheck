import { WebCrawler, CookieConsentTestData, GoogleConsentSignals, AcceptOnlyTestResult } from './crawler';
import { analyzeCookieBanner } from './cookieBannerAnalyzer';
import { analyzeTCF } from './tcfAnalyzer';
import { analyzeGoogleConsentMode, checkConsentModeCompleteness } from './googleConsentModeAnalyzer';
import { analyzeTrackingTags } from './trackingTagsAnalyzer';
import { analyzeDataLayer } from './dataLayerAnalyzer';
import { analyzeThirdPartyDomains } from './thirdPartyAnalyzer';
import { analyzeGDPRCompliance, analyzeDMACompliance } from './complianceAnalyzer';
import {
  analyzeEventQuality,
  analyzeFunnelValidation,
  analyzeCookieLifetime,
  analyzeUnusedPotential,
  analyzeROASQuality,
  analyzeConversionTrackingAudit,
  analyzeCampaignAttribution,
  analyzeGTMAudit,
  analyzePrivacySandbox,
  analyzeEcommerceDeepDive,
} from './performanceMarketingAnalyzer';
import { 
  AnalysisResult, 
  Issue, 
  CookieResult, 
  CookieConsentTestResult, 
  CookieConsentIssue,
  AnalysisStep,
  DataLayerAnalysisResult,
  ThirdPartyDomainsResult,
  GDPRChecklistResult,
  DMACheckResult,
  ScoreBreakdown,
} from '@/types';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    const causeMessage = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
    return [error.message, causeMessage].filter(Boolean).join(' | ');
  }
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unbekannter Fehler';
  }
};

const isTargetClosedError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('targetcloseerror') ||
    message.includes('target closed') ||
    message.includes('protocol error (target.createtarget)') ||
    message.includes('session closed') ||
    message.includes('execution context was destroyed') ||
    message.includes('browser has disconnected')
  );
};

export async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  const crawler = new WebCrawler();
  const analysisSteps: AnalysisStep[] = [];
  
  const addStep = (step: string, status: AnalysisStep['status'], message: string, details?: string) => {
    analysisSteps.push({ step, status, message, details, timestamp: Date.now() });
  };

  try {
    addStep('init', 'running', 'Browser wird initialisiert...');
    await crawler.init();
    addStep('init', 'completed', 'Browser bereit');
    
    // URL validieren und normalisieren
    addStep('validate', 'running', 'URL wird validiert...');
    const normalizedUrl = normalizeUrl(url);
    addStep('validate', 'completed', `URL: ${normalizedUrl}`);
    
    // Website crawlen
    addStep('crawl', 'running', 'Website wird geladen und analysiert...', 'Netzwerk-Requests, Cookies und Scripts werden erfasst');
    const crawlResult = await crawler.crawl(normalizedUrl);
    addStep('crawl', 'completed', `${crawlResult.networkRequests.length} Requests erfasst`);
    
    // Alle Analyzer ausführen
    addStep('analyze_banner', 'running', 'Cookie-Banner wird analysiert...');
    const cookieBanner = analyzeCookieBanner(crawlResult);
    addStep('analyze_banner', 'completed', cookieBanner.detected ? `Banner erkannt: ${cookieBanner.provider || 'Unbekannter Anbieter'}` : 'Kein Banner erkannt');

    addStep('analyze_tcf', 'running', 'TCF Framework wird geprüft...');
    const tcf = analyzeTCF(crawlResult);
    addStep('analyze_tcf', 'completed', tcf.detected ? `TCF ${tcf.version || '2.x'} erkannt` : 'Kein TCF erkannt');

    addStep('analyze_consent_mode', 'running', 'Google Consent Mode wird analysiert...');
    let googleConsentMode = analyzeGoogleConsentMode(crawlResult);
    addStep('analyze_consent_mode', 'completed', 
      googleConsentMode.detected 
        ? `Consent Mode ${googleConsentMode.version || ''} erkannt${googleConsentMode.updateConsent?.detected ? ' (mit Update)' : ''}`
        : 'Kein Consent Mode erkannt'
    );

    addStep('analyze_tracking', 'running', 'Tracking-Tags werden identifiziert...');
    const trackingTags = analyzeTrackingTags(crawlResult);
    const trackingCount = [
      trackingTags.googleAnalytics.detected,
      trackingTags.googleTagManager.detected,
      trackingTags.metaPixel.detected,
      trackingTags.linkedInInsight.detected,
      trackingTags.tiktokPixel.detected,
      trackingTags.pinterestTag?.detected,
      trackingTags.snapchatPixel?.detected,
      trackingTags.twitterPixel?.detected,
      trackingTags.bingAds?.detected,
      trackingTags.criteo?.detected,
    ].filter(Boolean).length + trackingTags.other.length;
    addStep('analyze_tracking', 'completed', `${trackingCount} Tracking-Dienst(e) erkannt`);

    // NEU: DataLayer & E-Commerce analysieren
    addStep('analyze_datalayer', 'running', 'DataLayer und E-Commerce Events werden analysiert...');
    const dataLayerAnalysis = analyzeDataLayer(crawlResult);
    addStep('analyze_datalayer', 'completed', 
      dataLayerAnalysis.ecommerce.detected 
        ? `E-Commerce erkannt: ${dataLayerAnalysis.ecommerce.events.length} Events`
        : `${dataLayerAnalysis.events.length} DataLayer Events`
    );
    
    // Cookie-Consent-Test durchführen (nur wenn Banner erkannt wurde)
    let cookieConsentTest: CookieConsentTestResult | undefined;
    let acceptFallback: AcceptOnlyTestResult | undefined;
    if (cookieBanner.detected) {
      addStep('consent_test', 'running', 'Cookie-Consent wird getestet...', 'Cookies vor und nach Banner-Interaktion werden verglichen');

      const maxAttempts = 2;
      let consentTestData: CookieConsentTestData | undefined;
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          consentTestData = await crawler.performCookieConsentTest(normalizedUrl);
          break;
        } catch (error) {
          lastError = error;
          if (isTargetClosedError(error) && attempt < maxAttempts) {
            addStep('consent_test', 'running', `Consent-Test wird wiederholt (${attempt + 1}/${maxAttempts})`, 'Browser-Target wurde geschlossen');
            continue;
          }
          break;
        }
      }

      if (consentTestData) {
        cookieConsentTest = processCookieConsentTest(consentTestData);
        googleConsentMode = enrichConsentModeWithPostConsentSignals(
          googleConsentMode,
          consentTestData.afterAccept.consentSignals
        );
        addStep('consent_test', 'completed', 
          cookieConsentTest.analysis.trackingBeforeConsent 
            ? 'WARNUNG: Tracking vor Consent erkannt!'
            : 'Consent-Test abgeschlossen'
        );
      } else if (lastError && isTargetClosedError(lastError)) {
        addStep('consent_test', 'completed', 'Consent-Test übersprungen', 'Browser-Target wurde geschlossen');
      } else if (lastError) {
        console.error('Cookie consent test error:', lastError);
        addStep('consent_test', 'error', 'Consent-Test fehlgeschlagen', getErrorMessage(lastError));
      }
    }

    // Fallback: Wenn Consent-Test keine Cookies liefert, versuche Accept-only Flow
    if (
      cookieBanner.detected &&
      (!cookieConsentTest || cookieConsentTest.afterAccept.cookieCount === 0) &&
      crawlResult.cookies.length === 0
    ) {
      addStep('consent_fallback', 'running', 'Fallback: Accept-only Test läuft...');
      try {
        acceptFallback = await crawler.performAcceptOnlyTest(normalizedUrl);
        if (acceptFallback.cookies.length > 0) {
          addStep('consent_fallback', 'completed', `${acceptFallback.cookies.length} Cookies nach Accept gefunden`);
          googleConsentMode = enrichConsentModeWithPostConsentSignals(
            googleConsentMode,
            acceptFallback.consentSignals
          );
        } else {
          addStep('consent_fallback', 'completed', 'Fallback abgeschlossen, keine Cookies gefunden');
        }
      } catch (error) {
        console.error('Consent fallback error:', error);
        addStep('consent_fallback', 'error', 'Fallback fehlgeschlagen', getErrorMessage(error));
      }
    }
    
    // Cookies kategorisieren
    addStep('analyze_cookies', 'running', 'Cookies werden kategorisiert...');
    const cookiesToUse = cookieConsentTest?.afterAccept.cookies.length 
      ? cookieConsentTest.afterAccept.cookies 
      : acceptFallback?.cookies.length
      ? acceptFallback.cookies
      : categorizeCookies(crawlResult.cookies);
    const cookies = Array.isArray(cookiesToUse) && cookiesToUse.length > 0 && 'category' in cookiesToUse[0]
      ? cookiesToUse
      : categorizeCookies(crawlResult.cookies);
    addStep('analyze_cookies', 'completed', `${cookies.length} Cookies kategorisiert`);

    // NEU: Third-Party Domains analysieren
    addStep('analyze_third_party', 'running', 'Drittanbieter-Domains werden analysiert...');
    const thirdPartyDomains = analyzeThirdPartyDomains(crawlResult, cookies);
    addStep('analyze_third_party', 'completed', `${thirdPartyDomains.totalCount} Third-Party Domains`);

    // NEU: DSGVO Checkliste
    addStep('analyze_gdpr', 'running', 'DSGVO-Compliance wird geprüft...');
    const gdprChecklist = analyzeGDPRCompliance(
      cookieBanner,
      tcf,
      googleConsentMode,
      trackingTags,
      cookies,
      cookieConsentTest,
      thirdPartyDomains
    );
    addStep('analyze_gdpr', 'completed', `DSGVO Score: ${gdprChecklist.score}%`);

    // NEU: DMA Check
    addStep('analyze_dma', 'running', 'DMA-Compliance wird geprüft...');
    const dmaCheck = analyzeDMACompliance(trackingTags, googleConsentMode, tcf, cookieBanner);
    addStep('analyze_dma', 'completed', 
      dmaCheck.applicable 
        ? `${dmaCheck.gatekeepersDetected.length} Gatekeeper erkannt`
        : 'Keine DMA-Gatekeeper erkannt'
    );

    // NEU: Performance Marketing Analysen
    addStep('analyze_performance', 'running', 'Performance Marketing Analyse läuft...');
    
    const eventQualityScore = analyzeEventQuality(crawlResult, trackingTags, dataLayerAnalysis);
    const funnelValidation = analyzeFunnelValidation(crawlResult, dataLayerAnalysis);
    const cookieLifetimeAudit = analyzeCookieLifetime(cookies, trackingTags);
    const unusedPotential = analyzeUnusedPotential(crawlResult, trackingTags, dataLayerAnalysis);
    const roasQuality = dataLayerAnalysis.ecommerce.detected 
      ? analyzeROASQuality(dataLayerAnalysis)
      : undefined;
    const conversionTrackingAudit = analyzeConversionTrackingAudit(crawlResult, trackingTags, dataLayerAnalysis);
    const campaignAttribution = analyzeCampaignAttribution(crawlResult, trackingTags);
    const gtmAudit = analyzeGTMAudit(crawlResult, trackingTags);
    const privacySandbox = analyzePrivacySandbox(crawlResult);
    const ecommerceDeepDive = dataLayerAnalysis.ecommerce.detected
      ? analyzeEcommerceDeepDive(dataLayerAnalysis)
      : undefined;
    
    addStep('analyze_performance', 'completed', 
      `Event Quality: ${eventQualityScore.overallScore}%${funnelValidation.isEcommerce ? ` | Funnel: ${funnelValidation.overallScore}%` : ''} | Conversion Audit: ${conversionTrackingAudit.overallScore}%`
    );
    
    // Issues sammeln
    addStep('generate_issues', 'running', 'Probleme und Empfehlungen werden generiert...');
    const issues = generateIssues(
      cookieBanner, 
      tcf, 
      googleConsentMode, 
      trackingTags, 
      cookies, 
      cookieConsentTest,
      dataLayerAnalysis,
      thirdPartyDomains,
      gdprChecklist,
      dmaCheck,
      conversionTrackingAudit,
      campaignAttribution,
      gtmAudit,
      privacySandbox,
      ecommerceDeepDive
    );
    addStep('generate_issues', 'completed', `${issues.length} Hinweise generiert`);
    
    // Score berechnen
    const scoreBreakdown = calculateScoreBreakdown(
      cookieBanner,
      tcf,
      googleConsentMode,
      issues,
      cookieConsentTest,
      gdprChecklist,
      trackingTags,
      cookies
    );
    const score = scoreBreakdown.overall;
    
    return {
      url: normalizedUrl,
      timestamp: new Date().toISOString(),
      status: 'success',
      cookieBanner,
      tcf,
      googleConsentMode,
      trackingTags,
      cookies,
      cookieConsentTest,
      dataLayerAnalysis,
      thirdPartyDomains,
      gdprChecklist,
      dmaCheck,
      score,
      scoreBreakdown,
      issues,
      analysisSteps,
      // NEU: Performance Marketing
      eventQualityScore,
      funnelValidation,
      cookieLifetimeAudit,
      unusedPotential,
      roasQuality,
      conversionTrackingAudit,
      campaignAttribution,
      gtmAudit,
      privacySandbox,
      ecommerceDeepDive,
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  } finally {
    await crawler.close();
  }
}

// Cookie-Consent-Test Daten verarbeiten
function processCookieConsentTest(testData: CookieConsentTestData): CookieConsentTestResult {
  const beforeCookies = categorizeCookies(testData.beforeConsent.cookies, testData.pageDomain);
  const afterAcceptCookies = categorizeCookies(testData.afterAccept.cookies, testData.pageDomain);
  const afterRejectCookies = categorizeCookies(testData.afterReject.cookies, testData.pageDomain);
  
  const beforeCookieNames = new Set(beforeCookies.map(c => c.name));
  const newCookiesAfterAccept = afterAcceptCookies.filter(c => !beforeCookieNames.has(c.name));
  const newCookiesAfterReject = afterRejectCookies.filter(c => !beforeCookieNames.has(c.name));
  
  const trackingCookiesBefore = beforeCookies.filter(
    c => c.category === 'analytics' || c.category === 'marketing'
  );
  
  const trackingCookiesAfterReject = afterRejectCookies.filter(
    c => c.category === 'analytics' || c.category === 'marketing'
  );
  
  const buttonText = testData.afterReject.buttonText?.toLowerCase() || '';
  
  // Erweiterte Pattern-Erkennung für Ablehn-Aktionen
  const rejectPatterns = [
    // Deutsch
    'ablehnen', 'alle ablehnen', 'verweigern', 'nicht einverstanden', 'nicht akzeptieren',
    'nur essenzielle', 'nur essenziell', 'nur notwendige', 'nur erforderliche',
    'nur technische', 'nur technisch', 'essentielle', 'essentiell',
    'notwendige cookies', 'notwendig', 'erforderlich',
    'ohne tracking', 'ohne marketing', 'ohne analyse',
    'weiter ohne', 'nur minimale', 'minimal',
    'datenschutzfreundlich', 'privatsphäre', 'einschränken',
    // Englisch  
    'reject', 'reject all', 'decline', 'deny', 'deny all',
    'only essential', 'only necessary', 'essential only', 'necessary only',
    'refuse', 'refuse all', 'no thanks', 'no thank you',
    'minimal cookies', 'strictly necessary', 'required only',
    'continue without', 'without tracking', 'without marketing',
  ];
  
  const savePatterns = ['speichern', 'save', 'confirm', 'bestätigen', 'auswahl bestätigen', 'save preferences'];
  
  const acceptPatterns = [
    // Deutsch
    'alle akzeptieren', 'alle annehmen', 'alle cookies akzeptieren', 
    'akzeptieren', 'annehmen', 'zustimmen', 'einverstanden',
    // Englisch
    'accept all', 'accept cookies', 'accept', 'agree', 'allow all', 'allow',
    'i agree', 'i accept', 'yes', 'ok', 'okay',
  ];
  
  // Prüfen ob "Speichern"-Button verwendet wurde
  const isSaveButton = savePatterns.some(p => buttonText.includes(p)) && 
    !rejectPatterns.some(p => buttonText.includes(p)) &&
    !acceptPatterns.some(p => buttonText.includes(p));
  
  // Prüfen ob ein "Nur Essenzielle" Button verwendet wurde
  const isEssentialOnlyButton = rejectPatterns.some(p => buttonText.includes(p));
  
  // WICHTIG: "Speichern" kann sowohl Akzeptieren als auch Ablehnen sein
  // Nur wenn NUR essentielle Cookies gesetzt wurden, ist es eine Ablehnung für Marketing
  // Wenn auch Marketing/Analytics Cookies gesetzt wurden, ist es eine Akzeptanz
  const onlyEssentialCookiesAfterSave = isSaveButton && 
    afterRejectCookies.length > 0 &&
    afterRejectCookies.every(c => c.category === 'necessary' || c.category === 'functional');
  
  // Wenn "Speichern" verwendet wurde, aber auch Marketing/Analytics Cookies gesetzt wurden,
  // dann war es KEINE Ablehnung, sondern eine Akzeptanz
  const saveButtonAcceptedMarketing = isSaveButton && 
    afterRejectCookies.some(c => c.category === 'analytics' || c.category === 'marketing');
  const isEssentialOnlyAction = isEssentialOnlyButton || onlyEssentialCookiesAfterSave;
  const treatAsAccept = saveButtonAcceptedMarketing && !isEssentialOnlyAction;
  
  const issues: CookieConsentIssue[] = [];
  
  if (trackingCookiesBefore.length > 0) {
    issues.push({
      severity: 'error',
      title: 'Tracking-Cookies vor Consent',
      description: `${trackingCookiesBefore.length} Tracking-Cookie(s) wurden gesetzt, BEVOR eine Einwilligung erteilt wurde: ${trackingCookiesBefore.map(c => c.name).join(', ')}`,
    });
  }
  
  // Nur Fehler melden, wenn es wirklich eine Ablehnung war
  // Wenn "Speichern" verwendet wurde und Marketing-Cookies gesetzt wurden, war es eine Akzeptanz
  if (trackingCookiesAfterReject.length > 0 && !treatAsAccept) {
    issues.push({
      severity: 'error',
      title: 'Tracking-Cookies trotz Ablehnung',
      description: `${trackingCookiesAfterReject.length} Tracking-Cookie(s) wurden trotz Ablehnung gesetzt: ${trackingCookiesAfterReject.map(c => c.name).join(', ')}`,
    });
  }
  
  if (testData.afterAccept.clickSuccessful && newCookiesAfterAccept.length === 0 && afterAcceptCookies.length === beforeCookies.length) {
    issues.push({
      severity: 'warning',
      title: 'Keine neuen Cookies nach Akzeptieren',
      description: 'Nach dem Klick auf "Akzeptieren" wurden keine zusätzlichen Cookies gesetzt. Der Banner könnte nicht korrekt funktionieren.',
    });
  }
  
  if (!testData.afterAccept.buttonFound) {
    issues.push({
      severity: 'warning',
      title: 'Akzeptieren-Button nicht gefunden',
      description: 'Der Akzeptieren-Button konnte nicht automatisch erkannt werden.',
    });
  }
  
  // Warnung nur ausgeben, wenn kein Button gefunden wurde UND es kein "Speichern"-Button war
  if (!testData.afterReject.buttonFound && !isSaveButton) {
    issues.push({
      severity: 'warning',
      title: 'Ablehnen-Button nicht gefunden',
      description: 'Der Ablehnen-Button konnte nicht automatisch erkannt werden. Möglicherweise ist keine einfache Ablehnung möglich.',
    });
  }
  
  // Info hinzufügen, wenn essenzielle Auswahl erkannt wurde
  if (isEssentialOnlyAction) {
    issues.push({
      severity: 'info',
      title: 'Nur essenzielle Cookies gewählt',
      description: 'Es wurden nur essenzielle Cookies gewählt. Marketing/Analytics gilt als abgelehnt.',
    });
  } else if (isSaveButton && saveButtonAcceptedMarketing) {
    // "Speichern" mit Marketing-Cookies = Akzeptanz (nicht als Ablehnung werten)
    issues.push({
      severity: 'info',
      title: '"Speichern"-Button verwendet',
      description: 'Ein "Speichern"-Button wurde verwendet. Da auch Marketing/Analytics Cookies gesetzt wurden, wurde dies als Akzeptanz gewertet, nicht als Ablehnung.',
    });
  }
  
  const consentWorksProperly = 
    testData.afterAccept.clickSuccessful && 
    (newCookiesAfterAccept.length > 0 || afterAcceptCookies.length > beforeCookies.length);
  
  // Ablehnung funktioniert korrekt, wenn:
  // 1. Expliziter Ablehnen-Button geklickt wurde und keine Tracking-Cookies gesetzt wurden
  // 2. ODER "Speichern"-Button wurde verwendet und NUR essentielle Cookies gesetzt wurden
  // NICHT als Ablehnung werten, wenn "Speichern" Marketing-Cookies gesetzt hat
  const rejectWorksProperly = isEssentialOnlyAction
    ? trackingCookiesAfterReject.length === 0
    : (testData.afterReject.clickSuccessful && trackingCookiesAfterReject.length === 0 && !treatAsAccept);
  
  // Bestimme die Reject-Methode
  let rejectMethod: 'direct' | 'essential-only' | 'save-button' | 'settings-toggle' | 'unknown' = 'unknown';
  if (isEssentialOnlyButton) {
    rejectMethod = 'essential-only';
  } else if (isSaveButton) {
    rejectMethod = 'save-button';
  } else if (testData.afterReject.clickSuccessful) {
    rejectMethod = 'direct';
  }

  return {
    beforeConsent: {
      cookies: beforeCookies,
      cookieCount: beforeCookies.length,
      trackingCookiesFound: trackingCookiesBefore.length > 0,
    },
    afterAccept: {
      cookies: afterAcceptCookies,
      cookieCount: afterAcceptCookies.length,
      newCookies: newCookiesAfterAccept,
      clickSuccessful: testData.afterAccept.clickSuccessful,
      buttonFound: testData.afterAccept.buttonFound,
      buttonText: testData.afterAccept.buttonText,
    },
    afterReject: {
      cookies: afterRejectCookies,
      cookieCount: afterRejectCookies.length,
      newCookies: newCookiesAfterReject,
      clickSuccessful: testData.afterReject.clickSuccessful,
      buttonFound: testData.afterReject.buttonFound,
      buttonText: testData.afterReject.buttonText,
      rejectMethod,
    },
    analysis: {
      consentWorksProperly,
      rejectWorksProperly,
      trackingBeforeConsent: trackingCookiesBefore.length > 0,
      issues,
      // NEU: Detaillierte Analyse
      rejectViaEssentialButton: isEssentialOnlyButton,
      rejectViaSaveButton: isSaveButton && !saveButtonAcceptedMarketing,
      marketingRejectedProperly: trackingCookiesAfterReject.length === 0,
    },
  };
}

function normalizeUrl(url: string): string {
  let normalizedUrl = url.trim();
  
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('Ungültige URL: ' + url);
  }
  
  return normalizedUrl;
}

function enrichConsentModeWithPostConsentSignals(
  current: AnalysisResult['googleConsentMode'],
  signals?: GoogleConsentSignals
): AnalysisResult['googleConsentMode'] {
  if (!signals) {
    return current;
  }

  const hasPostConsentEvidence = signals.dataLayerConsentDetected || signals.gcsOrGcdRequests > 0;
  if (!hasPostConsentEvidence) {
    return current;
  }

  const parameters = {
    ...current.parameters,
    ad_storage: current.parameters.ad_storage || !!signals.parameterValues.ad_storage,
    analytics_storage: current.parameters.analytics_storage || !!signals.parameterValues.analytics_storage,
    ad_user_data: current.parameters.ad_user_data || !!signals.parameterValues.ad_user_data,
    ad_personalization: current.parameters.ad_personalization || !!signals.parameterValues.ad_personalization,
  };

  let version = current.version;
  if (!version) {
    if (parameters.ad_user_data || parameters.ad_personalization) {
      version = 'v2';
    } else if (parameters.ad_storage || parameters.analytics_storage) {
      version = 'v1';
    }
  }

  const updateConsent = current.updateConsent?.detected
    ? current.updateConsent
    : {
        detected: true,
        triggeredAfterBanner: true,
        updateTrigger: 'banner_click' as const,
        updateSettings: {
          ad_storage: signals.parameterValues.ad_storage,
          analytics_storage: signals.parameterValues.analytics_storage,
          ad_user_data: signals.parameterValues.ad_user_data,
          ad_personalization: signals.parameterValues.ad_personalization,
        },
      };

  return {
    ...current,
    detected: true,
    version,
    parameters,
    updateConsent,
  };
}

function categorizeCookies(cookies: Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}>, pageDomain?: string): CookieResult[] {
  const now = Date.now();

  // Erweiterte Cookie-Kategorien
  const cookieCategories: Record<string, CookieResult['category']> = {
    // === ESSENTIELLE/NOTWENDIGE COOKIES ===
    // Session Cookies
    'PHPSESSID': 'necessary',
    'JSESSIONID': 'necessary',
    'ASP.NET_SessionId': 'necessary',
    'ASPSESSIONID': 'necessary',
    'session': 'necessary',
    'sessionid': 'necessary',
    'session_id': 'necessary',
    'connect.sid': 'necessary',
    
    // Security/CSRF
    'csrf': 'necessary',
    '_csrf': 'necessary',
    'csrftoken': 'necessary',
    '__csrf_token': 'necessary',
    'XSRF-TOKEN': 'necessary',
    '_xsrf': 'necessary',
    
    // CDN/Sicherheit
    '__cf': 'necessary',
    'cf_clearance': 'necessary',
    '__cfduid': 'necessary',
    '__cf_bm': 'necessary',
    '_cfuvid': 'necessary',
    
    // WordPress/CMS
    'wordpress_logged_in': 'necessary',
    'wp-settings': 'necessary',
    
    // === CMP COOKIES (ESSENZIELL) ===
    // Usercentrics
    'uc_consent': 'necessary',
    'UC_USER_INTERACTION': 'necessary',
    'ucData': 'necessary',
    'uc_user_interaction': 'necessary',
    'ucCookies': 'necessary',
    
    // Real Cookie Banner
    'rcb_consent': 'necessary',
    'real_cookie_banner': 'necessary',
    'rcb-': 'necessary',
    
    // OneTrust
    'OptanonConsent': 'necessary',
    'OptanonAlertBoxClosed': 'necessary',
    'OTGPPConsent': 'necessary',
    'euconsent-v2': 'necessary',
    
    // Cookiebot
    'CookieConsent': 'necessary',
    'CookieConsentBulkSetting': 'necessary',
    
    // Didomi
    'didomi_token': 'necessary',
    'euconsent': 'necessary',
    
    // Borlabs
    'borlabs-cookie': 'necessary',
    'BorlabsCookie': 'necessary',
    
    // Complianz
    'cmplz_': 'necessary',
    'cmplz_banner-status': 'necessary',
    'cmplz_consent': 'necessary',
    
    // Klaro
    'klaro': 'necessary',
    
    // Generische Consent Cookies
    'cookie_consent': 'necessary',
    'cookieconsent': 'necessary',
    'cookie-consent': 'necessary',
    'consent': 'necessary',
    'gdpr_consent': 'necessary',
    'cookies_accepted': 'necessary',
    'cookies_preferences_set': 'necessary',
    
    // TCF Cookies
    'eupubconsent': 'necessary',
    'eupubconsent-v2': 'necessary',
    '__tcfapi': 'necessary',
    
    // === ANALYTICS COOKIES ===
    // Google Analytics
    '_ga': 'analytics',
    '_gid': 'analytics',
    '_gat': 'analytics',
    '_ga_': 'analytics',
    '__utma': 'analytics',
    '__utmb': 'analytics',
    '__utmc': 'analytics',
    '__utmt': 'analytics',
    '__utmz': 'analytics',
    
    // Hotjar
    '_hjid': 'analytics',
    '_hjSessionUser': 'analytics',
    '_hjSession': 'analytics',
    '_hjAbsoluteSessionInProgress': 'analytics',
    '_hjFirstSeen': 'analytics',
    '_hjTLDTest': 'analytics',
    '_hjIncludedInSessionSample': 'analytics',
    
    // Microsoft Clarity
    '_clck': 'analytics',
    '_clsk': 'analytics',
    'CLID': 'analytics',
    
    // Mixpanel
    'mp_': 'analytics',
    'mixpanel': 'analytics',
    
    // Amplitude
    'amplitude': 'analytics',
    'amp_': 'analytics',
    
    // Matomo/Piwik
    '_pk_id': 'analytics',
    '_pk_ses': 'analytics',
    '_pk_ref': 'analytics',
    'piwik_': 'analytics',
    'matomo_': 'analytics',
    
    // Lucky Orange
    '_lo_': 'analytics',
    
    // Heap
    '_hp2_': 'analytics',
    
    // === MARKETING COOKIES ===
    // Meta/Facebook
    '_fbp': 'marketing',
    '_fbc': 'marketing',
    'fr': 'marketing',
    'sb': 'marketing',
    'datr': 'marketing',
    
    // Google Ads
    '_gcl_au': 'marketing',
    '_gcl_aw': 'marketing',
    '_gcl_dc': 'marketing',
    '_gcl_gb': 'marketing',
    '_gcl_gf': 'marketing',
    '_gcl_ha': 'marketing',
    'IDE': 'marketing',
    'NID': 'marketing',
    'DSID': 'marketing',
    '__gads': 'marketing',
    '__gpi': 'marketing',
    'ANID': 'marketing',
    '1P_JAR': 'marketing',
    'DV': 'marketing',
    
    // TikTok
    '_tt_enable_cookie': 'marketing',
    '_ttp': 'marketing',
    'tt_appId': 'marketing',
    'tt_sessionId': 'marketing',
    'tt_scid': 'marketing',
    
    // Pinterest
    '_pin_unauth': 'marketing',
    '_pinterest_cm': 'marketing',
    '_pinterest_sess': 'marketing',
    '_routing_id': 'marketing',
    
    // LinkedIn
    'lidc': 'marketing',
    'bcookie': 'marketing',
    'li_sugr': 'marketing',
    'li_': 'marketing',
    'AnalyticsSyncHistory': 'marketing',
    'UserMatchHistory': 'marketing',
    'ln_or': 'marketing',
    
    // Twitter/X
    'personalization_id': 'marketing',
    'muc_ads': 'marketing',
    'guest_id': 'marketing',
    'guest_id_ads': 'marketing',
    'guest_id_marketing': 'marketing',
    'twid': 'marketing',
    
    // Reddit
    '_rdt_uuid': 'marketing',
    
    // Snapchat
    '_scid': 'marketing',
    '_scid_r': 'marketing',
    'sc_at': 'marketing',
    
    // Criteo
    'cto_': 'marketing',
    'cto_bundle': 'marketing',
    
    // Microsoft/Bing
    '_uetsid': 'marketing',
    '_uetvid': 'marketing',
    'MUID': 'marketing',
    'MUIDB': 'marketing',
    
    // Taboola
    't_gid': 'marketing',
    'taboola': 'marketing',
    
    // Outbrain
    'outbrain_': 'marketing',
    
    // === FUNKTIONALE COOKIES ===
    'lang': 'functional',
    'language': 'functional',
    'locale': 'functional',
    'timezone': 'functional',
    'currency': 'functional',
    'country': 'functional',
    'region': 'functional',
    'theme': 'functional',
    'dark_mode': 'functional',
    'font_size': 'functional',
    'accessibility': 'functional',
  };

  // Bekannte Cookie-Dienste
  const cookieServices: Record<string, string> = {
    '_ga': 'Google Analytics',
    '_gid': 'Google Analytics',
    '_ga_': 'Google Analytics 4',
    '_fbp': 'Meta/Facebook',
    '_fbc': 'Meta/Facebook',
    'fr': 'Meta/Facebook',
    '_gcl': 'Google Ads',
    'IDE': 'Google DoubleClick',
    '_hjid': 'Hotjar',
    '_hjSession': 'Hotjar',
    '_clck': 'Microsoft Clarity',
    '_clsk': 'Microsoft Clarity',
    '_tt_': 'TikTok',
    '_ttp': 'TikTok',
    '_pin': 'Pinterest',
    'li_': 'LinkedIn',
    'lidc': 'LinkedIn',
    'bcookie': 'LinkedIn',
    '_scid': 'Snapchat',
    '_rdt_uuid': 'Reddit',
    'personalization_id': 'Twitter/X',
    'muc_ads': 'Twitter/X',
    '_pk_': 'Matomo/Piwik',
    'mp_': 'Mixpanel',
    'amplitude': 'Amplitude',
    '_uetsid': 'Bing/Microsoft Ads',
    '_uetvid': 'Bing/Microsoft Ads',
    'cto_': 'Criteo',
    'OptanonConsent': 'OneTrust',
    'CookieConsent': 'Cookiebot',
    'didomi_token': 'Didomi',
    'borlabs-cookie': 'Borlabs Cookie',
    'real_cookie_banner': 'Real Cookie Banner',
    'rcb_consent': 'Real Cookie Banner',
    'uc_consent': 'Usercentrics',
    'cmplz_': 'Complianz',
  };

  return cookies.map(cookie => {
    let category: CookieResult['category'] = 'unknown';
    let service: string | undefined;
    
    if (cookieCategories[cookie.name]) {
      category = cookieCategories[cookie.name];
    } else {
      for (const [pattern, cat] of Object.entries(cookieCategories)) {
        if (cookie.name.toLowerCase().includes(pattern.toLowerCase())) {
          category = cat;
          break;
        }
      }
    }
    
    if (category === 'unknown') {
      const domain = cookie.domain.toLowerCase();
      
      // Analytics-Domains
      if (domain.includes('google-analytics') || 
          domain.includes('analytics.google') ||
          domain.includes('hotjar') ||
          domain.includes('clarity.ms') ||
          domain.includes('mixpanel') ||
          domain.includes('amplitude') ||
          domain.includes('heap') ||
          domain.includes('fullstory') ||
          domain.includes('matomo') ||
          domain.includes('piwik')) {
        category = 'analytics';
      }
      // Google (differenziert)
      else if (domain.includes('google') || domain.includes('doubleclick') || domain.includes('googlesyndication')) {
        category = cookie.name.startsWith('_g') && !cookie.name.startsWith('_gcl') ? 'analytics' : 'marketing';
      }
      // Social Media Marketing
      else if (domain.includes('facebook') || domain.includes('fb.com') || domain.includes('fbcdn') || domain.includes('meta.com')) {
        category = 'marketing';
      }
      else if (domain.includes('linkedin')) {
        category = 'marketing';
      }
      else if (domain.includes('tiktok') || domain.includes('byteoversea') || domain.includes('tiktokcdn')) {
        category = 'marketing';
      }
      else if (domain.includes('twitter') || domain.includes('x.com') || domain.includes('twimg')) {
        category = 'marketing';
      }
      else if (domain.includes('pinterest')) {
        category = 'marketing';
      }
      else if (domain.includes('snapchat') || domain.includes('snapkit')) {
        category = 'marketing';
      }
      else if (domain.includes('reddit')) {
        category = 'marketing';
      }
      // Werbung/Retargeting
      else if (domain.includes('criteo') || domain.includes('taboola') || domain.includes('outbrain') || 
               domain.includes('adsrvr') || domain.includes('adnxs') || domain.includes('bing.com') ||
               domain.includes('msn.com') || domain.includes('yahoo') || domain.includes('amazon-adsystem')) {
        category = 'marketing';
      }
      // CMP Cookies sind essenziell
      else if (domain.includes('usercentrics') || domain.includes('cookiebot') || 
               domain.includes('onetrust') || domain.includes('didomi') ||
               domain.includes('quantcast') || domain.includes('trustarc')) {
        category = 'necessary';
      }
      // First-Party Cookies ohne erkannte Muster als functional behandeln
      else if (pageDomain && (domain.includes(pageDomain) || domain === '' || domain.startsWith('.'))) {
        // First-party Cookie - eher als functional einstufen wenn unklar
        category = 'functional';
      }
    }

    // Service ermitteln
    for (const [pattern, serviceName] of Object.entries(cookieServices)) {
      if (cookie.name.startsWith(pattern)) {
        service = serviceName;
        break;
      }
    }

    const expiresMs = cookie.expires > 0 ? cookie.expires * 1000 : undefined;
    const lifetimeDays = expiresMs ? Math.round((expiresMs - now) / (1000 * 60 * 60 * 24)) : undefined;
    const isLongLived = lifetimeDays !== undefined ? lifetimeDays > 400 : false;
    
    // Third-Party Erkennung (vereinfacht)
    const isThirdParty = !cookie.domain.startsWith('.') || cookie.domain.includes('google') || 
                         cookie.domain.includes('facebook') || cookie.domain.includes('doubleclick');
    
    return {
      name: cookie.name,
      value: cookie.value.length > 50 ? cookie.value.substring(0, 50) + '...' : cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires > 0 ? new Date(cookie.expires * 1000).toISOString() : undefined,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      category,
      lifetimeDays,
      isLongLived,
      isThirdParty,
      service,
    };
  });
}

function generateIssues(
  cookieBanner: AnalysisResult['cookieBanner'],
  tcf: AnalysisResult['tcf'],
  googleConsentMode: AnalysisResult['googleConsentMode'],
  trackingTags: AnalysisResult['trackingTags'],
  cookies: CookieResult[],
  cookieConsentTest: CookieConsentTestResult | undefined,
  dataLayerAnalysis: DataLayerAnalysisResult,
  thirdPartyDomains: ThirdPartyDomainsResult,
  gdprChecklist: GDPRChecklistResult,
  dmaCheck: DMACheckResult,
  conversionTrackingAudit: AnalysisResult['conversionTrackingAudit'],
  campaignAttribution: AnalysisResult['campaignAttribution'],
  gtmAudit: AnalysisResult['gtmAudit'],
  privacySandbox: AnalysisResult['privacySandbox'],
  ecommerceDeepDive: AnalysisResult['ecommerceDeepDive']
): Issue[] {
  const issues: Issue[] = [];

  // Cookie-Consent-Test Issues
  if (cookieConsentTest) {
    for (const issue of cookieConsentTest.analysis.issues) {
      issues.push({
        severity: issue.severity,
        category: 'cookies',
        title: issue.title,
        description: issue.description,
        recommendation: issue.severity === 'error' 
          ? 'Prüfen Sie die Cookie-Implementierung und stellen Sie sicher, dass Cookies erst nach Einwilligung gesetzt werden.'
          : undefined,
      });
    }
    
    if (cookieConsentTest.analysis.consentWorksProperly && cookieConsentTest.analysis.rejectWorksProperly) {
      issues.push({
        severity: 'info',
        category: 'cookies',
        title: 'Cookie-Consent funktioniert korrekt',
        description: 'Der Cookie-Banner reagiert korrekt auf Akzeptieren und Ablehnen.',
      });
    }
  }

  // Cookie Banner Issues
  // Unterscheide zwischen "Major" Tracking (GA, GTM, Meta, etc.) und "Other" Tracking (PostHog, Hotjar, etc.)
  const hasMajorTracking = trackingTags.googleAnalytics.detected || 
    trackingTags.metaPixel.detected ||
    trackingTags.googleTagManager.detected ||
    trackingTags.linkedInInsight.detected ||
    trackingTags.tiktokPixel.detected;
  
  const hasOnlyOtherTracking = !hasMajorTracking && trackingTags.other.length > 0;
  const hasOnlyPostHog = hasOnlyOtherTracking && trackingTags.other.every(t => t.name === 'PostHog');
  const hasTrackingCookies = cookies.some(c => c.category === 'marketing' || c.category === 'analytics');
  
  // Kombinierte Variable für Abwärtskompatibilität
  const hasAnyClientSideTracking = hasMajorTracking || hasOnlyOtherTracking || hasTrackingCookies;
  
  // WICHTIG: Prüfen ob Server-Side Tracking Indikatoren vorhanden sind
  const hasServerSideIndicators = trackingTags.serverSideTracking.detected;

  if (!cookieBanner.detected) {
    if (hasMajorTracking || hasTrackingCookies) {
      // Major Tracking-Dienste ohne Cookie-Banner = Error
      issues.push({
        severity: 'error',
        category: 'cookie-banner',
        title: 'Kein Cookie-Banner erkannt',
        description: 'Tracking-Tags erkannt, aber kein Cookie-Banner/Consent-Management gefunden.',
        recommendation: 'Implementieren Sie einen DSGVO-konformen Cookie-Banner mit Consent-Management.',
      });
    } else if (hasOnlyOtherTracking) {
      // Nur "Other" Tracking (z.B. PostHog, Hotjar) ohne Cookie-Banner = Warning (weniger kritisch)
      const otherNames = trackingTags.other.map(o => o.name).join(', ');
      if (hasOnlyPostHog) {
        issues.push({
          severity: 'info',
          category: 'cookie-banner',
          title: 'PostHog ohne Cookie-Banner',
          description: 'PostHog erkannt, aber kein Cookie-Banner gefunden. Bei geschlossenen Alpha/Beta-Umgebungen kann das bewusst sein.',
          recommendation: 'Falls öffentlich ausgerollt: Consent-Management prüfen und ggf. Banner ergänzen.',
        });
      } else {
        issues.push({
          severity: 'warning',
          category: 'cookie-banner',
          title: 'Tracking-Tool ohne Cookie-Banner',
          description: `${otherNames} erkannt, aber kein Cookie-Banner gefunden. Je nach Konfiguration könnte ein Consent erforderlich sein.`,
          recommendation: 'Prüfen Sie, ob das Tool personenbezogene Daten sammelt und implementieren Sie ggf. ein Consent-Management.',
        });
      }
    } else if (hasServerSideIndicators) {
      // Server-Side Tracking erkannt, aber kein Banner - neutral bewerten
      issues.push({
        severity: 'info',
        category: 'cookie-banner',
        title: 'Server-Side Tracking erkannt',
        description: 'Es wurden Server-Side Tracking Indikatoren gefunden, aber kein Cookie-Banner erkannt. Das Consent-Management könnte serverseitig erfolgen oder der Banner wurde nicht erkannt.',
      });
    } else {
      // Kein Tracking erkannt - Website ist datenschutzfreundlich
      issues.push({
        severity: 'info',
        category: 'cookie-banner',
        title: 'Kein Tracking erkannt',
        description: 'Es wurden keine Tracking-Tags oder Marketing-Cookies erkannt. Die Website scheint datenschutzfreundlich zu sein. Ein Cookie-Banner ist möglicherweise nicht erforderlich.',
      });
    }
  } else {
    if (!cookieBanner.hasRejectButton) {
      issues.push({
        severity: 'warning',
        category: 'cookie-banner',
        title: 'Keine Ablehnen-Option erkannt',
        description: 'Der Cookie-Banner scheint keine einfache Möglichkeit zur Ablehnung zu bieten.',
        recommendation: 'DSGVO erfordert eine gleichwertige Ablehnen-Option neben der Akzeptieren-Option.',
      });
    }
    if (!cookieBanner.hasSettingsOption) {
      issues.push({
        severity: 'info',
        category: 'cookie-banner',
        title: 'Keine granularen Einstellungen erkannt',
        description: 'Es wurde keine Option für granulare Cookie-Einstellungen gefunden.',
        recommendation: 'Erwägen Sie die Implementierung von Kategorie-basierten Cookie-Einstellungen.',
      });
    }
  }

  // TCF Issues
  if (trackingTags.googleAnalytics.detected || trackingTags.metaPixel.detected) {
    if (!tcf.detected) {
      issues.push({
        severity: 'warning',
        category: 'tcf',
        title: 'TCF nicht implementiert',
        description: 'Tracking-Tags erkannt, aber kein IAB TCF Framework gefunden.',
        recommendation: 'Implementieren Sie das IAB Transparency & Consent Framework für bessere Compliance.',
      });
    } else if (!tcf.validTcString) {
      issues.push({
        severity: 'warning',
        category: 'tcf',
        title: 'Kein gültiger TC String',
        description: 'TCF erkannt, aber kein gültiger TC String gefunden.',
        recommendation: 'Stellen Sie sicher, dass der Consent Manager einen gültigen TC String generiert.',
      });
    }
  }

  // Google Consent Mode Issues - NUR wenn auch Google Tracking vorhanden ist
  if (trackingTags.googleAnalytics.detected || trackingTags.googleTagManager.detected) {
    const consentModeCheck = checkConsentModeCompleteness(googleConsentMode);
    
    if (!googleConsentMode.detected) {
      issues.push({
        severity: 'error',
        category: 'consent-mode',
        title: 'Google Consent Mode nicht erkannt',
        description: 'Google Tags erkannt, aber kein Google Consent Mode implementiert.',
        recommendation: 'Implementieren Sie Google Consent Mode v2 für DSGVO-konforme Google Ads und Analytics.',
      });
    } else if (googleConsentMode.version === 'v1') {
      issues.push({
        severity: 'error',
        category: 'consent-mode',
        title: 'Google Consent Mode v1 erkannt',
        description: 'Sie verwenden noch Google Consent Mode v1. Seit März 2024 ist v2 erforderlich.',
        recommendation: 'Aktualisieren Sie auf Google Consent Mode v2 mit ad_user_data und ad_personalization.',
      });
    }

    // NEU: Consent Mode Update Check - nur wenn Consent Mode erkannt wurde
    if (googleConsentMode.detected && !googleConsentMode.updateConsent?.detected) {
      issues.push({
        severity: 'warning',
        category: 'consent-mode',
        title: 'Consent Mode Update nicht erkannt',
        description: 'Es wurde kein gtag("consent", "update", {...}) Aufruf erkannt.',
        recommendation: 'Stellen Sie sicher, dass nach Banner-Interaktion der Consent Mode aktualisiert wird.',
      });
    } else if (googleConsentMode.updateConsent?.detected && !googleConsentMode.updateConsent.triggeredAfterBanner) {
      issues.push({
        severity: 'warning',
        category: 'consent-mode',
        title: 'Consent Update möglicherweise nicht verknüpft',
        description: 'Consent Update erkannt, aber Verknüpfung mit Banner-Interaktion nicht bestätigt.',
        recommendation: 'Prüfen Sie, ob der Consent Update nach Nutzerinteraktion ausgelöst wird.',
      });
    }

    if (consentModeCheck.missingV2Parameters.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'consent-mode',
        title: 'Fehlende Consent Mode v2 Parameter',
        description: `Folgende v2 Parameter fehlen: ${consentModeCheck.missingV2Parameters.join(', ')}`,
        recommendation: 'Fügen Sie die fehlenden Parameter für volle Google Ads Funktionalität hinzu.',
      });
    }
  } else if (!hasAnyClientSideTracking && !hasServerSideIndicators) {
    // Kein Client-Side UND kein Server-Side Tracking erkannt - neutral bewerten
    issues.push({
      severity: 'info',
      category: 'consent-mode',
      title: 'Kein Google Tracking erkannt',
      description: 'Es wurden keine clientseitigen Google Tracking-Tags erkannt. Falls Server-Side Tracking verwendet wird, kann dies nicht automatisch analysiert werden.',
    });
  } else if (!hasAnyClientSideTracking && hasServerSideIndicators) {
    // Server-Side Tracking erkannt, aber kein Client-Side Google Tracking
    issues.push({
      severity: 'info',
      category: 'consent-mode',
      title: 'Möglicherweise Server-Side Google Tracking',
      description: 'Es wurden Server-Side Tracking Indikatoren gefunden. Google Consent Mode wird möglicherweise serverseitig verwaltet.',
    });
  }

  // E-Commerce Issues
  if (dataLayerAnalysis.ecommerce.detected) {
    for (const ecomIssue of dataLayerAnalysis.ecommerce.issues) {
      issues.push({
        severity: ecomIssue.severity,
        category: 'ecommerce',
        title: `E-Commerce: ${ecomIssue.issue}`,
        description: `Event: ${ecomIssue.event}`,
        recommendation: ecomIssue.recommendation,
      });
    }

    // Wertübergabe-Prüfung
    if (!dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue) {
      const hasPurchase = dataLayerAnalysis.ecommerce.events.some(e => e.name === 'purchase');
      if (hasPurchase) {
        issues.push({
          severity: 'error',
          category: 'ecommerce',
          title: 'Kein Transaktionswert erkannt',
          description: 'Purchase-Event ohne Wertübergabe erkannt. Google Ads kann keine ROAS berechnen.',
          recommendation: 'Fügen Sie den "value" Parameter mit dem Bestellwert zum Purchase-Event hinzu.',
        });
      }
    }

    if (!dataLayerAnalysis.ecommerce.valueTracking.hasCurrency && dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue) {
      issues.push({
        severity: 'warning',
        category: 'ecommerce',
        title: 'Keine Währung angegeben',
        description: 'Transaktionswerte ohne Währung können zu Fehlberechnungen führen.',
        recommendation: 'Fügen Sie den "currency" Parameter (z.B. "EUR") zu allen E-Commerce Events hinzu.',
      });
    }
  }

  // Third-Party Domain Issues
  if (thirdPartyDomains.riskAssessment.highRiskDomains.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'general',
      title: 'Hochrisiko-Drittanbieter erkannt',
      description: `Datenübertragung zu Hochrisiko-Ländern: ${thirdPartyDomains.riskAssessment.highRiskDomains.join(', ')}`,
      recommendation: 'Prüfen Sie die Rechtsgrundlage für diese Datentransfers besonders sorgfältig.',
    });
  }

  if (thirdPartyDomains.riskAssessment.unknownDomains.length > 5) {
    issues.push({
      severity: 'info',
      category: 'general',
      title: 'Viele unbekannte Drittanbieter',
      description: `${thirdPartyDomains.riskAssessment.unknownDomains.length} unbekannte Drittanbieter-Domains erkannt.`,
      recommendation: 'Dokumentieren Sie alle Drittanbieter in Ihrer Datenschutzerklärung.',
    });
  }

  // Conversion Tracking Audit Issues
  if (conversionTrackingAudit) {
    for (const issue of conversionTrackingAudit.issues) {
      issues.push({
        severity: issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'info',
        category: 'conversion',
        title: issue.title,
        description: issue.description,
        recommendation: issue.impact,
      });
    }
    const hasConversionContext =
      conversionTrackingAudit.platforms.length > 0 ||
      dataLayerAnalysis.ecommerce.detected;
    if (conversionTrackingAudit.overallScore < 50 && hasConversionContext) {
      issues.push({
        severity: 'warning',
        category: 'conversion',
        title: 'Conversion Tracking Qualität niedrig',
        description: `Audit Score nur ${conversionTrackingAudit.overallScore}%.`,
        recommendation: 'Conversion-Tracking Setup prüfen und ergänzen.',
      });
    }
  }

  // Campaign Attribution Issues
  if (campaignAttribution) {
    for (const issue of campaignAttribution.issues) {
      issues.push({
        severity: issue.severity === 'high' ? 'warning' : issue.severity === 'medium' ? 'info' : 'info',
        category: 'attribution',
        title: issue.title,
        description: issue.description,
        recommendation: issue.impact,
      });
    }
  }

  // GTM Audit Issues
  if (gtmAudit) {
    for (const issue of gtmAudit.issues) {
      issues.push({
        severity: issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'info',
        category: 'gtm',
        title: issue.title,
        description: issue.description,
        recommendation: issue.impact,
      });
    }
  }

  // Privacy Sandbox Hinweise
  if (privacySandbox && privacySandbox.summary.detectedSignals === 0) {
    issues.push({
      severity: 'info',
      category: 'privacy',
      title: 'Keine Privacy Sandbox Signale erkannt',
      description: 'Es wurden keine Topics/Attribution/Protected Audience Signale erkannt.',
      recommendation: 'Cookie-less Tracking Roadmap prüfen.',
    });
  }

  // E-Commerce Deep Dive
  if (ecommerceDeepDive && ecommerceDeepDive.coverage.missingEvents.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'ecommerce',
      title: 'E-Commerce Events unvollständig',
      description: `Fehlende Events: ${ecommerceDeepDive.coverage.missingEvents.join(', ')}`,
      recommendation: 'Funnel-Events ergänzen, um Optimierung zu verbessern.',
    });
  }

  // GDPR Failed Checks
  const gdprFailedChecks = gdprChecklist.checks.filter(c => c.status === 'failed');
  for (const check of gdprFailedChecks.slice(0, 3)) {
    issues.push({
      severity: 'error',
      category: 'gdpr',
      title: `DSGVO: ${check.title}`,
      description: check.details || check.description,
      recommendation: check.recommendation,
    });
  }

  // DMA Non-Compliant Checks
  const dmaNonCompliant = dmaCheck.checks.filter(c => c.status === 'non_compliant');
  for (const check of dmaNonCompliant) {
    issues.push({
      severity: 'warning',
      category: 'dma',
      title: `DMA: ${check.requirement}`,
      description: `${check.gatekeeper}: ${check.details}`,
      recommendation: check.recommendation,
    });
  }

  // Tracking Tags Issues
  if (trackingTags.googleAnalytics.hasMultipleMeasurementIds) {
    issues.push({
      severity: 'warning',
      category: 'tracking',
      title: 'Mehrere Google Analytics IDs erkannt',
      description: `Es wurden mehrere Measurement IDs gefunden (${trackingTags.googleAnalytics.measurementIds.join(', ')}).`,
      recommendation: 'Prüfen Sie, ob doppelte Pageviews ausgelöst werden.',
    });
  }

  if (trackingTags.googleAnalytics.hasLegacyUA) {
    issues.push({
      severity: 'info',
      category: 'tracking',
      title: 'UA-Property erkannt',
      description: 'Universal Analytics (UA) ist abgekündigt.',
      recommendation: 'Entfernen Sie UA-Snippets und migrieren Sie auf GA4.',
    });
  }

  // Server-Side Tracking Info
  if (trackingTags.serverSideTracking.detected) {
    const summary = trackingTags.serverSideTracking.summary;
    
    if (summary.hasServerSideGTM) {
      issues.push({
        severity: 'info',
        category: 'tracking',
        title: 'Server-Side GTM erkannt',
        description: 'Server-Side GTM verbessert Datenqualität, erfordert aber Consent-Dokumentation.',
      });
    }

    if (summary.hasCookieBridging) {
      issues.push({
        severity: 'warning',
        category: 'tracking',
        title: 'Cookie Bridging erkannt',
        description: 'First-Party Cookie Bridging erkannt. Dies erfordert besondere DSGVO-Aufmerksamkeit.',
        recommendation: 'Dokumentieren Sie Cookie Bridging in Ihrer Datenschutzerklärung.',
      });
    }
  }

  // Cookie Issues
  const longLivedCookies = cookies.filter(c => c.isLongLived && (c.category === 'marketing' || c.category === 'analytics'));
  if (longLivedCookies.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'cookies',
      title: 'Sehr lange Cookie-Laufzeiten',
      description: `${longLivedCookies.length} Marketing/Analytics-Cookie(s) haben eine Laufzeit > 400 Tage.`,
      recommendation: 'Reduzieren Sie die Gültigkeit auf maximal 13 Monate.',
    });
  }

  return issues;
}

function calculateScoreBreakdown(
  cookieBanner: AnalysisResult['cookieBanner'],
  tcf: AnalysisResult['tcf'],
  googleConsentMode: AnalysisResult['googleConsentMode'],
  issues: Issue[],
  cookieConsentTest: CookieConsentTestResult | undefined,
  gdprChecklist: GDPRChecklistResult,
  trackingTags: AnalysisResult['trackingTags'],
  cookies: CookieResult[]
): ScoreBreakdown {
  const trackingScore = calculateTrackingSetupScore(
    cookieBanner,
    tcf,
    googleConsentMode,
    issues,
    cookieConsentTest,
    trackingTags,
    cookies
  );
  const gdprScore = gdprChecklist.score;
  const trackingDetected = hasAnyTracking(trackingTags, cookies);
  const overall = Math.round((gdprScore * 0.4) + (trackingScore * 0.6));

  return {
    overall: Math.max(0, Math.min(100, overall)),
    gdpr: Math.max(0, Math.min(100, gdprScore)),
    tracking: Math.max(0, Math.min(100, trackingScore)),
    trackingDetected,
  };
}

function hasAnyTracking(
  trackingTags: AnalysisResult['trackingTags'],
  cookies: CookieResult[]
): boolean {
  const hasTrackingCookies = cookies.some(c => c.category === 'marketing' || c.category === 'analytics');
  const hasTagTracking = trackingTags.googleAnalytics.detected ||
    trackingTags.googleTagManager.detected ||
    trackingTags.googleAdsConversion.detected ||
    trackingTags.metaPixel.detected ||
    trackingTags.linkedInInsight.detected ||
    trackingTags.tiktokPixel.detected ||
    trackingTags.pinterestTag.detected ||
    trackingTags.snapchatPixel.detected ||
    trackingTags.twitterPixel.detected ||
    trackingTags.redditPixel.detected ||
    trackingTags.bingAds.detected ||
    trackingTags.criteo.detected ||
    trackingTags.other.length > 0;
  const hasServerSideIndicators = trackingTags.serverSideTracking.detected;

  return hasTrackingCookies || hasTagTracking || hasServerSideIndicators;
}

function calculateTrackingSetupScore(
  cookieBanner: AnalysisResult['cookieBanner'],
  tcf: AnalysisResult['tcf'],
  googleConsentMode: AnalysisResult['googleConsentMode'],
  issues: Issue[],
  cookieConsentTest: CookieConsentTestResult | undefined,
  trackingTags: AnalysisResult['trackingTags'],
  cookies: CookieResult[]
): number {
  const hasMajorTracking = trackingTags.googleAnalytics.detected || 
    trackingTags.metaPixel.detected ||
    trackingTags.googleTagManager.detected ||
    trackingTags.linkedInInsight.detected ||
    trackingTags.tiktokPixel.detected;
  
  const hasOnlyOtherTracking = !hasMajorTracking && trackingTags.other.length > 0;
  const hasTrackingCookies = cookies.some(c => c.category === 'marketing' || c.category === 'analytics');
  const hasServerSideIndicators = trackingTags.serverSideTracking.detected;
  const hasAnyTracking = hasAnyTrackingSignal(hasMajorTracking, hasOnlyOtherTracking, hasTrackingCookies, hasServerSideIndicators, trackingTags);

  if (!hasAnyTracking) {
    return 0;
  }

  let score = 100;

  if (!hasMajorTracking && !hasTrackingCookies) {
    if (hasOnlyOtherTracking) {
      score = 80;
    } else if (hasServerSideIndicators) {
      score = 70;
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  
  score -= errors * 15;
  score -= warnings * 5;

  const hasRejectOption = cookieBanner.hasRejectButton || cookieBanner.hasEssentialSaveButton;
  if (cookieBanner.detected && cookieBanner.hasAcceptButton && hasRejectOption) {
    score += 5;
  }

  if (tcf.detected && tcf.validTcString) {
    score += 5;
  }

  if (googleConsentMode.detected && googleConsentMode.version === 'v2') {
    score += 5;
    if (googleConsentMode.updateConsent?.detected) {
      score += 3;
    }
  }

  if (hasServerSideIndicators) {
    score += 5;
  }

  if (cookieConsentTest) {
    if (cookieConsentTest.analysis.consentWorksProperly && cookieConsentTest.analysis.rejectWorksProperly) {
      score += 10;
    }
    
    if (cookieConsentTest.analysis.trackingBeforeConsent) {
      score -= 15;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function hasAnyTrackingSignal(
  hasMajorTracking: boolean,
  hasOnlyOtherTracking: boolean,
  hasTrackingCookies: boolean,
  hasServerSideIndicators: boolean,
  trackingTags: AnalysisResult['trackingTags']
): boolean {
  return hasMajorTracking ||
    hasOnlyOtherTracking ||
    hasTrackingCookies ||
    hasServerSideIndicators ||
    trackingTags.googleAdsConversion.detected ||
    trackingTags.pinterestTag.detected ||
    trackingTags.snapchatPixel.detected ||
    trackingTags.twitterPixel.detected ||
    trackingTags.redditPixel.detected ||
    trackingTags.bingAds.detected ||
    trackingTags.criteo.detected;
}

// Quick-Scan Funktion (schneller, weniger Details)
async function analyzeWebsiteQuick(url: string): Promise<AnalysisResult> {
  const crawler = new WebCrawler();
  const analysisSteps: AnalysisStep[] = [];
  
  const addStep = (step: string, status: AnalysisStep['status'], message: string, details?: string) => {
    analysisSteps.push({ step, status, message, details, timestamp: Date.now() });
  };

  try {
    addStep('init', 'running', 'Quick-Scan wird gestartet...');
    await crawler.init();
    addStep('init', 'completed', 'Browser bereit');
    
    const normalizedUrl = normalizeUrl(url);
    
    // Quick-Crawl (kürzer, kein Consent-Test)
    addStep('crawl', 'running', 'Seite wird schnell analysiert...');
    const crawlResult = await crawler.crawlQuick(normalizedUrl);
    addStep('crawl', 'completed', `${crawlResult.networkRequests.length} Requests erfasst`);
    
    // Basis-Analyzer (ohne Deep-Scan)
    addStep('analyze', 'running', 'Basis-Analyse läuft...');
    const cookieBanner = analyzeCookieBanner(crawlResult);
    const tcf = analyzeTCF(crawlResult);
    const googleConsentMode = analyzeGoogleConsentMode(crawlResult);
    const trackingTags = analyzeTrackingTags(crawlResult);
    const cookies = categorizeCookies(crawlResult.cookies);
    
    // DataLayer-Analyse (schnell, aber funktional)
    const dataLayerAnalysis = analyzeDataLayer(crawlResult);
    
    addStep('analyze', 'completed', 'Basis-Analyse abgeschlossen');

    const thirdPartyDomains: ThirdPartyDomainsResult = {
      totalCount: 0,
      domains: [],
      categories: {
        advertising: 0,
        analytics: 0,
        social: 0,
        cdn: 0,
        functional: 0,
        unknown: 0,
      },
      riskAssessment: {
        highRiskDomains: [],
        crossBorderTransfers: [],
        unknownDomains: [],
      },
    };

    const gdprChecklist = analyzeGDPRCompliance(
      cookieBanner,
      tcf,
      googleConsentMode,
      trackingTags,
      cookies,
      undefined,
      thirdPartyDomains
    );

    const dmaCheck: DMACheckResult = {
      applicable: false,
      gatekeepersDetected: [],
      checks: [],
      summary: { compliant: 0, nonCompliant: 0, requiresReview: 0 },
    };
    
    // Schnelle Issue-Generierung
    const issues: Issue[] = [];
    
    if (!cookieBanner.detected && (trackingTags.googleAnalytics.detected || trackingTags.metaPixel.detected)) {
      issues.push({
        severity: 'error',
        category: 'cookie-banner',
        title: 'Kein Cookie-Banner erkannt',
        description: 'Tracking erkannt, aber kein Cookie-Banner gefunden.',
        recommendation: 'Implementieren Sie einen DSGVO-konformen Cookie-Banner.',
      });
    }
    
    if (!googleConsentMode.detected && trackingTags.googleAnalytics.detected) {
      issues.push({
        severity: 'error',
        category: 'consent-mode',
        title: 'Google Consent Mode nicht erkannt',
        description: 'Google Tags ohne Consent Mode.',
        recommendation: 'Implementieren Sie Google Consent Mode v2.',
      });
    } else if (googleConsentMode.version === 'v1') {
      issues.push({
        severity: 'error',
        category: 'consent-mode',
        title: 'Veraltete Consent Mode Version',
        description: 'Google Consent Mode v1 erkannt. v2 ist seit März 2024 erforderlich.',
        recommendation: 'Aktualisieren Sie auf Consent Mode v2.',
      });
    }
    
    // Performance Marketing Analysen (auch im Quick Scan)
    addStep('analyze_performance', 'running', 'Performance Marketing Analyse läuft...');
    
    const eventQualityScore = analyzeEventQuality(crawlResult, trackingTags, dataLayerAnalysis);
    const funnelValidation = analyzeFunnelValidation(crawlResult, dataLayerAnalysis);
    const cookieLifetimeAudit = analyzeCookieLifetime(cookies, trackingTags);
    const unusedPotential = analyzeUnusedPotential(crawlResult, trackingTags, dataLayerAnalysis);
    const roasQuality = dataLayerAnalysis.ecommerce.detected 
      ? analyzeROASQuality(dataLayerAnalysis)
      : undefined;
    const conversionTrackingAudit = analyzeConversionTrackingAudit(crawlResult, trackingTags, dataLayerAnalysis);
    const campaignAttribution = analyzeCampaignAttribution(crawlResult, trackingTags);
    const gtmAudit = analyzeGTMAudit(crawlResult, trackingTags);
    const privacySandbox = analyzePrivacySandbox(crawlResult);
    const ecommerceDeepDive = dataLayerAnalysis.ecommerce.detected
      ? analyzeEcommerceDeepDive(dataLayerAnalysis)
      : undefined;
    
    addStep('analyze_performance', 'completed', 
      `Event Quality: ${eventQualityScore.overallScore}%${funnelValidation.isEcommerce ? ` | Funnel: ${funnelValidation.overallScore}%` : ''} | Conversion Audit: ${conversionTrackingAudit.overallScore}%`
    );
    
    const scoreBreakdown = calculateScoreBreakdown(
      cookieBanner,
      tcf,
      googleConsentMode,
      issues,
      undefined,
      gdprChecklist,
      trackingTags,
      cookies
    );
    const score = scoreBreakdown.overall;
    
    return {
      url: normalizedUrl,
      timestamp: new Date().toISOString(),
      status: 'success',
      cookieBanner,
      tcf,
      googleConsentMode,
      trackingTags,
      cookies,
      dataLayerAnalysis,
      thirdPartyDomains,
      gdprChecklist,
      dmaCheck,
      score: Math.max(0, Math.min(100, score)),
      scoreBreakdown,
      issues,
      analysisSteps,
      // Performance Marketing (auch im Quick Scan)
      eventQualityScore,
      funnelValidation,
      cookieLifetimeAudit,
      unusedPotential,
      roasQuality,
      conversionTrackingAudit,
      campaignAttribution,
      gtmAudit,
      privacySandbox,
      ecommerceDeepDive,
    };
  } catch (error) {
    console.error('Quick analysis error:', error);
    throw error;
  } finally {
    await crawler.close();
  }
}

export { WebCrawler } from './crawler';
export { analyzeCookieBanner } from './cookieBannerAnalyzer';
export { analyzeTCF } from './tcfAnalyzer';
export { analyzeGoogleConsentMode } from './googleConsentModeAnalyzer';
export { analyzeTrackingTags } from './trackingTagsAnalyzer';
export { analyzeDataLayer } from './dataLayerAnalyzer';
export { analyzeThirdPartyDomains } from './thirdPartyAnalyzer';
export { analyzeGDPRCompliance, analyzeDMACompliance } from './complianceAnalyzer';
