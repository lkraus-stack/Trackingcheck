import { WebCrawler, CookieConsentTestData } from './crawler';
import { analyzeCookieBanner } from './cookieBannerAnalyzer';
import { analyzeTCF } from './tcfAnalyzer';
import { analyzeGoogleConsentMode, checkConsentModeCompleteness } from './googleConsentModeAnalyzer';
import { analyzeTrackingTags } from './trackingTagsAnalyzer';
import { analyzeDataLayer } from './dataLayerAnalyzer';
import { analyzeThirdPartyDomains } from './thirdPartyAnalyzer';
import { analyzeGDPRCompliance, analyzeDMACompliance } from './complianceAnalyzer';
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
} from '@/types';

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
    const googleConsentMode = analyzeGoogleConsentMode(crawlResult);
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
    if (cookieBanner.detected) {
      try {
        addStep('consent_test', 'running', 'Cookie-Consent wird getestet...', 'Cookies vor und nach Banner-Interaktion werden verglichen');
        const consentTestData = await crawler.performCookieConsentTest(normalizedUrl);
        cookieConsentTest = processCookieConsentTest(consentTestData);
        addStep('consent_test', 'completed', 
          cookieConsentTest.analysis.trackingBeforeConsent 
            ? 'WARNUNG: Tracking vor Consent erkannt!'
            : 'Consent-Test abgeschlossen'
        );
      } catch (error) {
        console.error('Cookie consent test error:', error);
        addStep('consent_test', 'error', 'Consent-Test fehlgeschlagen');
      }
    }
    
    // Cookies kategorisieren
    addStep('analyze_cookies', 'running', 'Cookies werden kategorisiert...');
    const cookiesToUse = cookieConsentTest?.afterAccept.cookies.length 
      ? cookieConsentTest.afterAccept.cookies 
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
      dmaCheck
    );
    addStep('generate_issues', 'completed', `${issues.length} Hinweise generiert`);
    
    // Score berechnen
    const score = calculateScore(cookieBanner, tcf, googleConsentMode, issues, cookieConsentTest, gdprChecklist);
    
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
      issues,
      analysisSteps,
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
  const beforeCookies = categorizeCookies(testData.beforeConsent.cookies);
  const afterAcceptCookies = categorizeCookies(testData.afterAccept.cookies);
  const afterRejectCookies = categorizeCookies(testData.afterReject.cookies);
  
  const beforeCookieNames = new Set(beforeCookies.map(c => c.name));
  const newCookiesAfterAccept = afterAcceptCookies.filter(c => !beforeCookieNames.has(c.name));
  const newCookiesAfterReject = afterRejectCookies.filter(c => !beforeCookieNames.has(c.name));
  
  const trackingCookiesBefore = beforeCookies.filter(
    c => c.category === 'analytics' || c.category === 'marketing'
  );
  
  const trackingCookiesAfterReject = afterRejectCookies.filter(
    c => c.category === 'analytics' || c.category === 'marketing'
  );
  
  // Prüfen ob "Speichern"-Button verwendet wurde
  const isSaveButton = Boolean(testData.afterReject.buttonText && 
    (testData.afterReject.buttonText.toLowerCase().includes('speichern') || 
     testData.afterReject.buttonText.toLowerCase().includes('save')));
  
  // WICHTIG: "Speichern" kann sowohl Akzeptieren als auch Ablehnen sein
  // Nur wenn NUR essentielle Cookies gesetzt wurden, ist es eine Ablehnung für Marketing
  // Wenn auch Marketing/Analytics Cookies gesetzt wurden, ist es eine Akzeptanz
  const onlyEssentialCookiesAfterSave = isSaveButton && 
    afterRejectCookies.length > 0 &&
    afterRejectCookies.every(c => c.category === 'necessary');
  
  // Wenn "Speichern" verwendet wurde, aber auch Marketing/Analytics Cookies gesetzt wurden,
  // dann war es KEINE Ablehnung, sondern eine Akzeptanz
  const saveButtonAcceptedMarketing = isSaveButton && 
    afterRejectCookies.some(c => c.category === 'analytics' || c.category === 'marketing');
  
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
  if (trackingCookiesAfterReject.length > 0 && !saveButtonAcceptedMarketing) {
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
  
  // Info hinzufügen, wenn "Speichern"-Button verwendet wurde
  if (isSaveButton) {
    if (onlyEssentialCookiesAfterSave) {
      // "Speichern" mit nur essentiellen Cookies = Ablehnung für Marketing (korrekt)
    } else if (saveButtonAcceptedMarketing) {
      // "Speichern" mit Marketing-Cookies = Akzeptanz (nicht als Ablehnung werten)
      issues.push({
        severity: 'info',
        title: '"Speichern"-Button verwendet',
        description: 'Ein "Speichern"-Button wurde verwendet. Da auch Marketing/Analytics Cookies gesetzt wurden, wurde dies als Akzeptanz gewertet, nicht als Ablehnung.',
      });
    }
  }
  
  const consentWorksProperly = 
    testData.afterAccept.clickSuccessful && 
    (newCookiesAfterAccept.length > 0 || afterAcceptCookies.length > beforeCookies.length);
  
  // Ablehnung funktioniert korrekt, wenn:
  // 1. Expliziter Ablehnen-Button geklickt wurde und keine Tracking-Cookies gesetzt wurden
  // 2. ODER "Speichern"-Button wurde verwendet und NUR essentielle Cookies gesetzt wurden
  // NICHT als Ablehnung werten, wenn "Speichern" Marketing-Cookies gesetzt hat
  const rejectWorksProperly = 
    (testData.afterReject.clickSuccessful && trackingCookiesAfterReject.length === 0 && !saveButtonAcceptedMarketing) ||
    Boolean(isSaveButton && onlyEssentialCookiesAfterSave);
  
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
    },
    afterReject: {
      cookies: afterRejectCookies,
      cookieCount: afterRejectCookies.length,
      newCookies: newCookiesAfterReject,
      clickSuccessful: testData.afterReject.clickSuccessful,
      buttonFound: testData.afterReject.buttonFound,
    },
    analysis: {
      consentWorksProperly,
      rejectWorksProperly,
      trackingBeforeConsent: trackingCookiesBefore.length > 0,
      issues,
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

function categorizeCookies(cookies: Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}>): CookieResult[] {
  const now = Date.now();

  const cookieCategories: Record<string, CookieResult['category']> = {
    'PHPSESSID': 'necessary',
    'JSESSIONID': 'necessary',
    'csrf': 'necessary',
    '_csrf': 'necessary',
    'session': 'necessary',
    'sessionid': 'necessary',
    '__cf': 'necessary',
    'cf_clearance': 'necessary',
    
    '_ga': 'analytics',
    '_gid': 'analytics',
    '_gat': 'analytics',
    '__utma': 'analytics',
    '__utmb': 'analytics',
    '__utmc': 'analytics',
    '__utmz': 'analytics',
    '_hjid': 'analytics',
    '_hjSessionUser': 'analytics',
    'amplitude': 'analytics',
    'mixpanel': 'analytics',
    '_clck': 'analytics',
    '_clsk': 'analytics',
    
    '_fbp': 'marketing',
    '_fbc': 'marketing',
    'fr': 'marketing',
    '_gcl': 'marketing',
    'IDE': 'marketing',
    'NID': 'marketing',
    '_pin_unauth': 'marketing',
    'lidc': 'marketing',
    'bcookie': 'marketing',
    '_tt_': 'marketing',
    '_ttp': 'marketing',
    '_scid': 'marketing',
    '_rdt_uuid': 'marketing',
    'muc_ads': 'marketing',
    'personalization_id': 'marketing',
    
    'lang': 'functional',
    'locale': 'functional',
    'timezone': 'functional',
    'currency': 'functional',
  };

  // Bekannte Cookie-Dienste
  const cookieServices: Record<string, string> = {
    '_ga': 'Google Analytics',
    '_gid': 'Google Analytics',
    '_fbp': 'Meta/Facebook',
    '_fbc': 'Meta/Facebook',
    '_gcl': 'Google Ads',
    '_hjid': 'Hotjar',
    '_clck': 'Microsoft Clarity',
    '_tt_': 'TikTok',
    '_pin': 'Pinterest',
    'li_': 'LinkedIn',
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
      if (cookie.domain.includes('google') || cookie.domain.includes('doubleclick')) {
        category = cookie.name.startsWith('_g') ? 'analytics' : 'marketing';
      } else if (cookie.domain.includes('facebook') || cookie.domain.includes('fb.com')) {
        category = 'marketing';
      } else if (cookie.domain.includes('linkedin')) {
        category = 'marketing';
      } else if (cookie.domain.includes('tiktok')) {
        category = 'marketing';
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
  dmaCheck: DMACheckResult
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
  if (!cookieBanner.detected) {
    const hasTracking = trackingTags.googleAnalytics.detected || trackingTags.metaPixel.detected;
    if (hasTracking) {
      issues.push({
        severity: 'error',
        category: 'cookie-banner',
        title: 'Kein Cookie-Banner erkannt',
        description: 'Tracking-Tags erkannt, aber kein Cookie-Banner/Consent-Management gefunden.',
        recommendation: 'Implementieren Sie einen DSGVO-konformen Cookie-Banner mit Consent-Management.',
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

  // Google Consent Mode Issues
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

    // NEU: Consent Mode Update Check
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

function calculateScore(
  cookieBanner: AnalysisResult['cookieBanner'],
  tcf: AnalysisResult['tcf'],
  googleConsentMode: AnalysisResult['googleConsentMode'],
  issues: Issue[],
  cookieConsentTest: CookieConsentTestResult | undefined,
  gdprChecklist: GDPRChecklistResult
): number {
  let score = 100;

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  
  score -= errors * 15;
  score -= warnings * 5;

  // Bonus für gute Implementierung
  // Auch "Essenziell speichern"-Button wird als Ablehnen-Option gewertet
  const hasRejectOption = cookieBanner.hasRejectButton || cookieBanner.hasEssentialSaveButton;
  if (cookieBanner.detected && cookieBanner.hasAcceptButton && hasRejectOption) {
    score += 5;
  }

  if (tcf.detected && tcf.validTcString) {
    score += 5;
  }

  if (googleConsentMode.detected && googleConsentMode.version === 'v2') {
    score += 5;
    // Extra Bonus für Update-Funktion
    if (googleConsentMode.updateConsent?.detected) {
      score += 3;
    }
  }

  // Cookie-Consent-Test Bonus/Abzug
  if (cookieConsentTest) {
    if (cookieConsentTest.analysis.consentWorksProperly && cookieConsentTest.analysis.rejectWorksProperly) {
      score += 10;
    }
    
    if (cookieConsentTest.analysis.trackingBeforeConsent) {
      score -= 15;
    }
  }

  // GDPR Score einbeziehen
  const gdprWeight = gdprChecklist.score * 0.2;
  score = Math.round(score * 0.8 + gdprWeight);

  return Math.max(0, Math.min(100, score));
}

// Quick-Scan Funktion (schneller, weniger Details)
export async function analyzeWebsiteQuick(url: string): Promise<AnalysisResult> {
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
    addStep('analyze', 'completed', 'Basis-Analyse abgeschlossen');
    
    // Leere/minimale Ergebnisse für nicht durchgeführte Analysen
    const dataLayerAnalysis: DataLayerAnalysisResult = {
      hasDataLayer: crawlResult.windowObjects.hasDataLayer,
      events: [],
      ecommerce: {
        detected: false,
        events: [],
        valueTracking: {
          hasTransactionValue: false,
          hasCurrency: false,
          hasItemData: false,
          hasUserData: false,
          valueParameters: [],
          missingRecommended: [],
        },
        issues: [],
      },
      customDimensions: [],
      userProperties: [],
    };

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

    const gdprChecklist: GDPRChecklistResult = {
      score: 0,
      checks: [],
      summary: { passed: 0, failed: 0, warnings: 0, notApplicable: 0 },
    };

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
    
    // Schneller Score
    let score = 100;
    if (!cookieBanner.detected && (trackingTags.googleAnalytics.detected || trackingTags.metaPixel.detected)) score -= 20;
    if (!googleConsentMode.detected && trackingTags.googleAnalytics.detected) score -= 20;
    if (googleConsentMode.version === 'v1') score -= 15;
    if (cookieBanner.detected && !cookieBanner.hasRejectButton && !cookieBanner.hasEssentialSaveButton) score -= 10;
    
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
      issues,
      analysisSteps,
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
