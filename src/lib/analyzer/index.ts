import { WebCrawler } from './crawler';
import { analyzeCookieBanner } from './cookieBannerAnalyzer';
import { analyzeTCF } from './tcfAnalyzer';
import { analyzeGoogleConsentMode, checkConsentModeCompleteness } from './googleConsentModeAnalyzer';
import { analyzeTrackingTags } from './trackingTagsAnalyzer';
import { AnalysisResult, Issue, CookieResult } from '@/types';

export async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  const crawler = new WebCrawler();
  
  try {
    await crawler.init();
    
    // URL validieren und normalisieren
    const normalizedUrl = normalizeUrl(url);
    
    // Website crawlen
    const crawlResult = await crawler.crawl(normalizedUrl);
    
    // Alle Analyzer ausführen
    const cookieBanner = analyzeCookieBanner(crawlResult);
    const tcf = analyzeTCF(crawlResult);
    const googleConsentMode = analyzeGoogleConsentMode(crawlResult);
    const trackingTags = analyzeTrackingTags(crawlResult);
    
    // Cookies kategorisieren
    const cookies = categorizeCookies(crawlResult.cookies);
    
    // Issues sammeln
    const issues = generateIssues(cookieBanner, tcf, googleConsentMode, trackingTags, cookies);
    
    // Score berechnen
    const score = calculateScore(cookieBanner, tcf, googleConsentMode, issues);
    
    return {
      url: normalizedUrl,
      timestamp: new Date().toISOString(),
      status: 'success',
      cookieBanner,
      tcf,
      googleConsentMode,
      trackingTags,
      cookies,
      score,
      issues,
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  } finally {
    await crawler.close();
  }
}

function normalizeUrl(url: string): string {
  let normalizedUrl = url.trim();
  
  // Protokoll hinzufügen wenn fehlend
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  // URL validieren
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

  // Bekannte Cookie-Kategorien
  const cookieCategories: Record<string, CookieResult['category']> = {
    // Notwendige Cookies
    'PHPSESSID': 'necessary',
    'JSESSIONID': 'necessary',
    'csrf': 'necessary',
    '_csrf': 'necessary',
    'session': 'necessary',
    'sessionid': 'necessary',
    
    // Analytics Cookies
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
    
    // Marketing Cookies
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
    
    // Funktionale Cookies
    'lang': 'functional',
    'locale': 'functional',
    'timezone': 'functional',
    'currency': 'functional',
  };

  return cookies.map(cookie => {
    let category: CookieResult['category'] = 'unknown';
    
    // Exakte Übereinstimmung
    if (cookieCategories[cookie.name]) {
      category = cookieCategories[cookie.name];
    } else {
      // Partial Match
      for (const [pattern, cat] of Object.entries(cookieCategories)) {
        if (cookie.name.toLowerCase().includes(pattern.toLowerCase())) {
          category = cat;
          break;
        }
      }
    }
    
    // Domain-basierte Kategorisierung
    if (category === 'unknown') {
      if (cookie.domain.includes('google') || cookie.domain.includes('doubleclick')) {
        category = cookie.name.startsWith('_g') ? 'analytics' : 'marketing';
      } else if (cookie.domain.includes('facebook') || cookie.domain.includes('fb.com')) {
        category = 'marketing';
      }
    }

    // Lifetime berechnen (Browser liefert Sekunden-Since-Epoch)
    const expiresMs = cookie.expires > 0 ? cookie.expires * 1000 : undefined;
    const lifetimeDays = expiresMs ? Math.round((expiresMs - now) / (1000 * 60 * 60 * 24)) : undefined;
    const isLongLived = lifetimeDays !== undefined ? lifetimeDays > 400 : false;
    
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
    };
  });
}

function generateIssues(
  cookieBanner: AnalysisResult['cookieBanner'],
  tcf: AnalysisResult['tcf'],
  googleConsentMode: AnalysisResult['googleConsentMode'],
  trackingTags: AnalysisResult['trackingTags'],
  cookies: CookieResult[]
): Issue[] {
  const issues: Issue[] = [];

  // Cookie Banner Issues
  if (!cookieBanner.detected) {
    issues.push({
      severity: 'error',
      category: 'cookie-banner',
      title: 'Kein Cookie-Banner erkannt',
      description: 'Auf der Website wurde kein Cookie-Banner/Consent-Management gefunden.',
      recommendation: 'Implementieren Sie einen DSGVO-konformen Cookie-Banner mit Consent-Management.',
    });
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

  // Tracking ohne Consent
  const marketingCookies = cookies.filter(c => c.category === 'marketing');
  const analyticsCookies = cookies.filter(c => c.category === 'analytics');

  if (marketingCookies.length > 0 && !cookieBanner.detected) {
    issues.push({
      severity: 'error',
      category: 'cookies',
      title: 'Marketing-Cookies ohne Consent',
      description: `${marketingCookies.length} Marketing-Cookie(s) gefunden, aber kein Consent-Management.`,
      recommendation: 'Marketing-Cookies dürfen nur nach ausdrücklicher Einwilligung gesetzt werden.',
    });
  }

  if (analyticsCookies.length > 0 && !cookieBanner.detected) {
    issues.push({
      severity: 'warning',
      category: 'cookies',
      title: 'Analytics-Cookies ohne Consent',
      description: `${analyticsCookies.length} Analytics-Cookie(s) gefunden, aber kein Consent-Management.`,
      recommendation: 'Analytics-Cookies erfordern in der Regel Einwilligung gemäß DSGVO/ePrivacy.',
    });
  }

  // GA4/UA Implementierung
  if (trackingTags.googleAnalytics.hasMultipleMeasurementIds) {
    issues.push({
      severity: 'warning',
      category: 'tracking',
      title: 'Mehrere Google Analytics IDs erkannt',
      description: `Es wurden mehrere Measurement IDs gefunden (${trackingTags.googleAnalytics.measurementIds.join(', ')}).`,
      recommendation: 'Prüfen Sie, ob doppelte Pageviews ausgelöst werden oder Container konsolidiert werden sollten.',
    });
  }

  if (trackingTags.googleAnalytics.hasLegacyUA) {
    issues.push({
      severity: 'info',
      category: 'tracking',
      title: 'UA-Property erkannt',
      description: 'Universal Analytics (UA) ist abgekündigt. Behalten Sie nur GA4-Implementierungen bei.',
      recommendation: 'Entfernen Sie alte UA-Snippets und migrieren Sie alle Tags auf GA4.',
    });
  }

  // GTM über GTM geladen Info
  if (trackingTags.googleAnalytics.loadedViaGTM) {
    issues.push({
      severity: 'info',
      category: 'tracking',
      title: 'Google Analytics über GTM geladen',
      description: 'Google Analytics wird über den Google Tag Manager geladen.',
      recommendation: 'Dies ist eine Best Practice für zentralisiertes Tag-Management.',
    });
  }

  // Meta Pixel Erkennungsdetails
  if (trackingTags.metaPixel.detected) {
    const methods = trackingTags.metaPixel.detectionMethod.join(', ');
    if (trackingTags.metaPixel.loadedViaGTM) {
      issues.push({
        severity: 'info',
        category: 'tracking',
        title: 'Meta Pixel über GTM erkannt',
        description: `Der Meta Pixel wurde über den Google Tag Manager geladen. Erkennungsmethoden: ${methods}.`,
        recommendation: 'Stellen Sie sicher, dass der Pixel erst nach Consent-Erteilung ausgelöst wird.',
      });
    }

    if (trackingTags.metaPixel.hasMultiplePixels) {
      issues.push({
        severity: 'warning',
        category: 'tracking',
        title: 'Mehrere Meta Pixel IDs erkannt',
        description: `Es wurden ${trackingTags.metaPixel.pixelIds.length} Pixel IDs gefunden: ${trackingTags.metaPixel.pixelIds.join(', ')}.`,
        recommendation: 'Prüfen Sie, ob alle Pixel IDs notwendig sind oder ob doppelte Events ausgelöst werden.',
      });
    }
  }

  // Server-Side Tracking Issues
  if (trackingTags.serverSideTracking.detected) {
    const summary = trackingTags.serverSideTracking.summary;
    
    // Server-Side GTM
    if (summary.hasServerSideGTM) {
      issues.push({
        severity: 'info',
        category: 'tracking',
        title: 'Server-Side Google Tag Manager erkannt',
        description: 'Es wurde ein Server-Side GTM Setup erkannt. Dies verbessert die Datenqualität und reduziert Client-Side Blocking.',
        recommendation: 'Stellen Sie sicher, dass auch Server-Side Tags Consent-Signale respektieren.',
      });
    }

    // Meta Conversions API
    if (summary.hasMetaCAPI) {
      issues.push({
        severity: 'info',
        category: 'tracking',
        title: 'Meta Conversions API (CAPI) erkannt',
        description: 'Server-Side Tracking für Meta/Facebook wurde erkannt. Dies verbessert die Attribution und Event-Qualität.',
        recommendation: 'Implementieren Sie Event-Deduplizierung zwischen Browser-Pixel und Server-API.',
      });
    }

    // First-Party Proxies
    if (summary.hasFirstPartyProxy) {
      const endpoints = trackingTags.serverSideTracking.firstPartyEndpoints;
      issues.push({
        severity: 'info',
        category: 'tracking',
        title: 'First-Party Tracking Proxy erkannt',
        description: `Es wurden ${endpoints.length} First-Party Endpoint(s) für Tracking erkannt.`,
        recommendation: 'First-Party Tracking kann Ad-Blocker umgehen, erfordert aber besondere DSGVO-Aufmerksamkeit.',
      });
    }

    // TikTok Events API
    if (summary.hasTikTokEventsAPI) {
      issues.push({
        severity: 'info',
        category: 'tracking',
        title: 'TikTok Events API erkannt',
        description: 'Server-Side Tracking für TikTok wurde erkannt.',
        recommendation: 'Stellen Sie sicher, dass Server-Side Events mit Consent-Status synchronisiert sind.',
      });
    }

    // LinkedIn CAPI
    if (summary.hasLinkedInCAPI) {
      issues.push({
        severity: 'info',
        category: 'tracking',
        title: 'LinkedIn Conversions API erkannt',
        description: 'Server-Side Tracking für LinkedIn wurde erkannt.',
        recommendation: 'Implementieren Sie Event-Deduplizierung zwischen Insight Tag und Conversions API.',
      });
    }

    // Detaillierte Server-Side Indikatoren
    for (const indicator of trackingTags.serverSideTracking.indicators) {
      if (indicator.confidence === 'high' && indicator.evidence.length > 0) {
        issues.push({
          severity: 'info',
          category: 'tracking',
          title: `Server-Side Tracking: ${indicator.description}`,
          description: `Evidenz: ${indicator.evidence.slice(0, 2).join('; ')}`,
          recommendation: 'Server-Side Tracking erfordert besondere Datenschutz-Dokumentation.',
        });
      }
    }
  }

  // GTM Container Issues
  if (trackingTags.googleTagManager.hasMultipleContainers) {
    issues.push({
      severity: 'warning',
      category: 'tracking',
      title: 'Mehrere GTM Container erkannt',
      description: `Es wurden ${trackingTags.googleTagManager.containerIds.length} GTM Container gefunden: ${trackingTags.googleTagManager.containerIds.join(', ')}.`,
      recommendation: 'Konsolidieren Sie Container wenn möglich, um Konflikte und doppelte Tags zu vermeiden.',
    });
  }

  // Server-Side GTM im GTM Ergebnis
  if (trackingTags.googleTagManager.serverSideGTM?.detected) {
    const sgtm = trackingTags.googleTagManager.serverSideGTM;
    issues.push({
      severity: 'info',
      category: 'tracking',
      title: 'Server-Side GTM Endpoint',
      description: sgtm.isFirstParty 
        ? `First-Party sGTM auf ${sgtm.domain || 'eigener Domain'} erkannt.`
        : 'Server-Side GTM wurde erkannt.',
      recommendation: 'Dokumentieren Sie den Server-Side Datenfluss in Ihrer Datenschutzerklärung.',
    });
  }

  // Marketing-Parameter Monitoring
  if (trackingTags.marketingParameters.any) {
    const activeParams = Object.entries(trackingTags.marketingParameters)
      .filter(([key, value]) => key !== 'any' && value)
      .map(([key]) => key)
      .join(', ');

    issues.push({
      severity: 'info',
      category: 'tracking',
      title: 'Marketing-Parameter erkannt',
      description: `Folgende Kampagnen-Parameter wurden gefunden: ${activeParams}.`,
      recommendation: 'Stellen Sie sicher, dass Parameter nur nach Consent verarbeitet und gespeichert werden.',
    });
  }

  // Lange Laufzeiten von Cookies kennzeichnen (besonders Marketing/Analytics)
  const longLivedCookies = cookies.filter(c => c.isLongLived && (c.category === 'marketing' || c.category === 'analytics'));
  if (longLivedCookies.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'cookies',
      title: 'Sehr lange Cookie-Laufzeiten',
      description: `${longLivedCookies.length} Marketing/Analytics-Cookie(s) haben eine Laufzeit > 400 Tage.`,
      recommendation: 'Reduzieren Sie die Gültigkeit auf maximal 13 Monate, um DSGVO-Konformität zu erleichtern.',
    });
  }

  return issues;
}

function calculateScore(
  cookieBanner: AnalysisResult['cookieBanner'],
  tcf: AnalysisResult['tcf'],
  googleConsentMode: AnalysisResult['googleConsentMode'],
  issues: Issue[]
): number {
  let score = 100;

  // Abzüge für Errors
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  
  score -= errors * 20;
  score -= warnings * 5;

  // Bonus für gute Implementierung
  if (cookieBanner.detected && cookieBanner.hasAcceptButton && cookieBanner.hasRejectButton) {
    score += 5;
  }

  if (tcf.detected && tcf.validTcString) {
    score += 5;
  }

  if (googleConsentMode.detected && googleConsentMode.version === 'v2') {
    score += 5;
  }

  // Score begrenzen
  return Math.max(0, Math.min(100, score));
}

export { WebCrawler } from './crawler';
export { analyzeCookieBanner } from './cookieBannerAnalyzer';
export { analyzeTCF } from './tcfAnalyzer';
export { analyzeGoogleConsentMode } from './googleConsentModeAnalyzer';
export { analyzeTrackingTags } from './trackingTagsAnalyzer';
