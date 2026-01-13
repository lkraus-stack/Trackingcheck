import { CrawlResult, NetworkRequest, WindowObjectData, NetworkRequestExtended, ResponseHeaderData } from './crawler';
import { 
  TrackingTagsResult, 
  ServerSideTrackingResult, 
  ServerSideIndicator, 
  FirstPartyEndpoint,
  ServerSideGTMResult,
  MetaServerSideResult 
} from '@/types';

// Erweiterte Tracking Tag Definitionen
const TRACKING_DEFINITIONS = {
  googleAnalytics: {
    scriptPatterns: [
      'google-analytics.com/analytics.js',
      'google-analytics.com/ga.js',
      'googletagmanager.com/gtag/js',
      'www.google-analytics.com',
      '/gtag/js',
      'gtag(',
    ],
    networkPatterns: [
      'google-analytics.com/collect',
      'google-analytics.com/g/collect',
      'analytics.google.com',
      '/g/collect',
      '/collect?v=',
    ],
    idPatterns: {
      UA: /UA-\d{4,10}-\d{1,4}/g,
      GA4: /G-[A-Z0-9]{10,}/g,
    },
  },
  googleTagManager: {
    scriptPatterns: [
      'googletagmanager.com/gtm.js',
      'googletagmanager.com/ns.html',
      'gtm.js?id=',
    ],
    networkPatterns: [
      'googletagmanager.com/gtm.js',
      'googletagmanager.com/ns.html',
    ],
    idPatterns: {
      GTM: /GTM-[A-Z0-9]{6,}/g,
    },
  },
  metaPixel: {
    // Erweiterte Patterns für alle Lokalisierungen und Varianten
    scriptPatterns: [
      'connect.facebook.net',
      'facebook.net/signals',
      'facebook.com/tr',
      'fbevents.js',
      '/en_US/fbevents',
      '/de_DE/fbevents',
      '/fr_FR/fbevents',
      '/es_ES/fbevents',
      '/it_IT/fbevents',
      '/signals/config',
      '/signals/plugins',
      'fbq(',
      'fbq.push',
      '_fbq',
      'facebook-jssdk',
    ],
    networkPatterns: [
      'facebook.com/tr',
      'facebook.com/tr/',
      'facebook.net',
      'connect.facebook',
      '/tr?id=',
      '/tr/?id=',
      'pixel.facebook.com',
      'www.facebook.com/tr',
    ],
    // Erweiterte ID-Patterns
    idPatterns: {
      PIXEL_INIT: /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{15,16})['"]/g,
      PIXEL_TRACK: /fbq\s*\(\s*['"]track['"]/g,
      PIXEL_ID_ONLY: /['"](\d{15,16})['"]/g,
      PIXEL_CONFIG: /pixel[_-]?id['":\s]+['"]?(\d{15,16})['"]?/gi,
    },
    // DataLayer Events die auf Meta Pixel hinweisen
    dataLayerIndicators: [
      'Facebook Pixel',
      'fb_pixel',
      'fbPixel',
      'meta_pixel',
      'MetaPixel',
      'facebook',
      'facebookPixel',
    ],
  },
  linkedInInsight: {
    scriptPatterns: [
      'snap.licdn.com/li.lms-analytics',
      'platform.linkedin.com',
      'linkedin.com/insight',
      '_linkedin_partner_id',
      'lintrk',
    ],
    networkPatterns: [
      'px.ads.linkedin.com',
      'snap.licdn.com',
      'linkedin.com/px',
      'linkedin.com/li/track',
      'dc.ads.linkedin.com',
    ],
    idPatterns: {
      PARTNER: /_linkedin_partner_id\s*=\s*['"]?(\d+)['"]?/g,
      DATA_PARTNER: /_linkedin_data_partner_ids\s*=\s*\[['"]?(\d+)['"]?\]/g,
    },
  },
  tiktokPixel: {
    scriptPatterns: [
      'analytics.tiktok.com',
      'tiktok.com/i18n/pixel',
      'ttq.load',
      'ttq.track',
      'tiktok-pixel',
    ],
    networkPatterns: [
      'analytics.tiktok.com',
      'tiktok.com/i18n/pixel',
      'business-api.tiktok.com',
    ],
    idPatterns: {
      PIXEL: /ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/g,
      PIXEL_ALT: /pixel[_-]?code['":\s]+['"]([A-Z0-9]+)['"]/gi,
    },
  },
};

// Erweiterte bekannte Tracking-Dienste
const OTHER_TRACKING_SERVICES = [
  { name: 'Hotjar', patterns: ['static.hotjar.com', 'hotjar.com', 'hj('] },
  { name: 'Microsoft Clarity', patterns: ['clarity.ms', 'clarity('] },
  { name: 'Pinterest Tag', patterns: ['pintrk', 's.pinimg.com/ct', 'pinterest.com/ct'] },
  { name: 'Twitter/X Pixel', patterns: ['static.ads-twitter.com', 'analytics.twitter.com', 'twq('] },
  { name: 'Snapchat Pixel', patterns: ['sc-static.net/scevent', 'snaptr('] },
  { name: 'Criteo', patterns: ['static.criteo.net', 'criteo.com', 'criteo.'] },
  { name: 'Adobe Analytics', patterns: ['omtrdc.net', 'adobedtm.com', '2o7.net'] },
  { name: 'Matomo/Piwik', patterns: ['matomo', 'piwik', '_paq.push'] },
  { name: 'Plausible', patterns: ['plausible.io'] },
  { name: 'Hubspot', patterns: ['js.hs-scripts.com', 'js.hsforms.net', 'hubspot.com'] },
  { name: 'Segment', patterns: ['cdn.segment.com', 'api.segment.io', 'analytics.js'] },
  { name: 'Mixpanel', patterns: ['cdn.mxpnl.com', 'mixpanel.com', 'mixpanel.track'] },
  { name: 'Amplitude', patterns: ['cdn.amplitude.com', 'amplitude.com', 'amplitude.getInstance'] },
  { name: 'Heap', patterns: ['heap-analytics.com', 'heapanalytics.com', 'heap.load'] },
  { name: 'FullStory', patterns: ['fullstory.com', "window['_fs_org']"] },
  { name: 'Mouseflow', patterns: ['mouseflow.com', 'mouseflow.'] },
  { name: 'Lucky Orange', patterns: ['luckyorange.com', 'luckyorange.net'] },
  { name: 'Crazy Egg', patterns: ['crazyegg.com', 'script.crazyegg'] },
  { name: 'VWO', patterns: ['dev.visualwebsiteoptimizer.com', 'vwo_'] },
  { name: 'Optimizely', patterns: ['cdn.optimizely.com', 'optimizely'] },
  { name: 'Google Optimize', patterns: ['optimize.google.com', 'gtag.*optimize'] },
  { name: 'Taboola', patterns: ['cdn.taboola.com', 'trc.taboola'] },
  { name: 'Outbrain', patterns: ['outbrain.com', 'widgets.outbrain'] },
  { name: 'AdRoll', patterns: ['adroll.com', 's.adroll.com'] },
  { name: 'Bing Ads/UET', patterns: ['bat.bing.com', 'bing.com/bat'] },
  { name: 'Reddit Pixel', patterns: ['rdt(', 'alb.reddit.com', 'redditstatic.com/ads'] },
  { name: 'Quora Pixel', patterns: ['qevents.js', 'quora.com/qevents'] },
  { name: 'TradeDesk', patterns: ['js.adsrvr.org', 'match.adsrvr.org'] },
  { name: 'Pardot', patterns: ['pi.pardot.com', 'pardot.com'] },
  { name: 'Marketo', patterns: ['munchkin.js', 'marketo.com', 'munchkin.marketo'] },
  { name: 'Intercom', patterns: ['widget.intercom.io', 'intercom.com'] },
  { name: 'Drift', patterns: ['js.driftt.com', 'drift.com'] },
  { name: 'Cookiebot', patterns: ['consent.cookiebot.com', 'cookiebot'] },
  { name: 'OneTrust', patterns: ['cdn.cookielaw.org', 'onetrust.com', 'optanon'] },
  { name: 'Usercentrics', patterns: ['usercentrics.eu', 'usercentrics.com'] },
];

// Server-Side Tracking Patterns
const SERVER_SIDE_PATTERNS = {
  sgtm: {
    // Server-Side GTM typische Patterns
    endpoints: [
      /\/gtm\//i,
      /\/gtag\//i,
      /\/g\/collect/i,
      /sgtm\./i,
      /gtm-server\./i,
      /tagging-server\./i,
      /tagging\./i,
      /ss-gtm\./i,
      /server\.(analytics|tracking|gtm)\./i,
    ],
    headers: [
      'x-gtm-server-preview',
      'x-sgtm-',
    ],
  },
  metaCAPI: {
    // Meta Conversions API Indikatoren
    patterns: [
      /event_id/i,
      /event_source_url/i,
      /action_source.*server/i,
      /fbc.*fbp/i, // Beide Parameter zusammen deutet auf Server-Side
    ],
    networkPatterns: [
      'graph.facebook.com',
      '/events?',
      'graph.facebook.com/v',
    ],
  },
  tiktokEventsAPI: {
    patterns: [
      'business-api.tiktok.com',
      '/pixel/track',
      'event_id',
    ],
  },
  linkedInCAPI: {
    patterns: [
      'api.linkedin.com/rest/conversionEvents',
      'api.linkedin.com/v2/conversionEvents',
    ],
  },
};

export function analyzeTrackingTags(crawlResult: CrawlResult): TrackingTagsResult {
  const { 
    scripts, 
    networkRequests, 
    html, 
    windowObjects, 
    networkRequestsExtended,
    responseHeaders,
    pageDomain 
  } = crawlResult;
  
  const combinedContent = html + scripts.join(' ');
  const gtmDetected = detectGTMPresence(combinedContent, networkRequests);

  // Google Analytics
  const googleAnalytics = analyzeGoogleAnalytics(combinedContent, networkRequests, windowObjects, gtmDetected);

  // Google Tag Manager - erweitert
  const googleTagManager = analyzeGoogleTagManager(combinedContent, networkRequests, networkRequestsExtended, responseHeaders, pageDomain);

  // Meta Pixel - komplett überarbeitet
  const metaPixel = analyzeMetaPixel(combinedContent, networkRequests, windowObjects, gtmDetected, networkRequestsExtended, pageDomain);

  // LinkedIn Insight
  const linkedInInsight = analyzeLinkedInInsight(combinedContent, networkRequests, windowObjects, gtmDetected);

  // TikTok Pixel
  const tiktokPixel = analyzeTikTokPixel(combinedContent, networkRequests, windowObjects, gtmDetected);

  // Andere Tracking-Dienste
  const other = analyzeOtherTracking(combinedContent, networkRequests, gtmDetected);

  // Marketing-Parameter
  const marketingParameters = detectMarketingParameters(networkRequests);

  // Server-Side Tracking Analyse
  const serverSideTracking = analyzeServerSideTracking(
    networkRequests, 
    networkRequestsExtended, 
    responseHeaders, 
    pageDomain,
    combinedContent
  );

  return {
    googleAnalytics,
    googleTagManager,
    metaPixel,
    linkedInInsight,
    tiktokPixel,
    other,
    marketingParameters,
    serverSideTracking,
  };
}

function detectGTMPresence(content: string, requests: NetworkRequest[]): boolean {
  const def = TRACKING_DEFINITIONS.googleTagManager;
  return def.scriptPatterns.some(pattern => content.toLowerCase().includes(pattern.toLowerCase())) ||
    requests.some(req => def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase())));
}

function analyzeGoogleAnalytics(
  content: string,
  requests: NetworkRequest[],
  windowObjects: WindowObjectData,
  gtmDetected: boolean
): TrackingTagsResult['googleAnalytics'] {
  const def = TRACKING_DEFINITIONS.googleAnalytics;
  
  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  const gtagDetected = windowObjects.hasGtag || windowObjects.hasDataLayer;
  const detected = scriptDetected || networkDetected || gtagDetected;

  // Mehrfacherkennung von IDs
  const ga4Matches = content.match(def.idPatterns.GA4) || [];
  const uaMatches = content.match(def.idPatterns.UA) || [];
  const measurementIds = [...new Set([...ga4Matches, ...uaMatches])];

  let version: 'UA' | 'GA4' | undefined;
  let measurementId: string | undefined;

  if (ga4Matches.length > 0) {
    version = 'GA4';
    measurementId = ga4Matches[0];
  } else if (uaMatches.length > 0) {
    version = 'UA';
    measurementId = uaMatches[0];
  }

  // Prüfe ob über GTM geladen
  const loadedViaGTM = gtmDetected && detected && !content.includes('gtag/js?id=');

  return { 
    detected, 
    version, 
    measurementId,
    measurementIds,
    hasMultipleMeasurementIds: measurementIds.length > 1,
    hasLegacyUA: uaMatches.length > 0,
    loadedViaGTM,
  };
}

function analyzeGoogleTagManager(
  content: string,
  requests: NetworkRequest[],
  extendedRequests: NetworkRequestExtended[],
  responseHeaders: ResponseHeaderData[],
  pageDomain: string
): TrackingTagsResult['googleTagManager'] {
  const def = TRACKING_DEFINITIONS.googleTagManager;

  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  const detected = scriptDetected || networkDetected;

  // Alle Container IDs finden
  const gtmMatches = content.match(def.idPatterns.GTM) || [];
  const containerIds = [...new Set(gtmMatches)];
  const containerId = containerIds[0];

  // Server-Side GTM Erkennung
  const serverSideGTM = detectServerSideGTM(requests, extendedRequests, responseHeaders, pageDomain);

  return { 
    detected, 
    containerId,
    containerIds,
    hasMultipleContainers: containerIds.length > 1,
    serverSideGTM,
  };
}

function detectServerSideGTM(
  requests: NetworkRequest[],
  extendedRequests: NetworkRequestExtended[],
  responseHeaders: ResponseHeaderData[],
  pageDomain: string
): ServerSideGTMResult {
  const indicators: string[] = [];
  let endpoint: string | undefined;
  let isFirstParty = false;
  let sgtmDomain: string | undefined;

  // Suche nach First-Party GTM Endpoints
  for (const req of requests) {
    const url = req.url.toLowerCase();
    
    // Prüfe ob Request zu einer Subdomain der Seite geht und GTM-typische Pfade hat
    try {
      const reqUrl = new URL(req.url);
      const reqDomain = reqUrl.hostname;
      
      // First-Party Check: Subdomain oder gleiche Domain
      const isSubdomain = reqDomain.endsWith(pageDomain) || pageDomain.endsWith(reqDomain.split('.').slice(-2).join('.'));
      
      if (isSubdomain) {
        // Prüfe auf sGTM-typische Patterns
        for (const pattern of SERVER_SIDE_PATTERNS.sgtm.endpoints) {
          if (pattern.test(url) || pattern.test(reqUrl.pathname)) {
            isFirstParty = true;
            endpoint = req.url;
            sgtmDomain = reqDomain;
            indicators.push(`First-Party Endpoint: ${reqDomain}${reqUrl.pathname}`);
            break;
          }
        }
      }
    } catch {
      // URL parsing failed
    }
  }

  // Prüfe Response Headers auf sGTM Indikatoren
  for (const resp of responseHeaders) {
    for (const headerPattern of SERVER_SIDE_PATTERNS.sgtm.headers) {
      const hasHeader = Object.keys(resp.headers).some(h => 
        h.toLowerCase().includes(headerPattern.toLowerCase())
      );
      if (hasHeader) {
        indicators.push(`Server-Side GTM Header gefunden: ${headerPattern}`);
        isFirstParty = true;
      }
    }
  }

  return {
    detected: indicators.length > 0,
    endpoint,
    isFirstParty,
    domain: sgtmDomain,
  };
}

function analyzeMetaPixel(
  content: string,
  requests: NetworkRequest[],
  windowObjects: WindowObjectData,
  gtmDetected: boolean,
  extendedRequests: NetworkRequestExtended[],
  pageDomain: string
): TrackingTagsResult['metaPixel'] {
  const def = TRACKING_DEFINITIONS.metaPixel;
  const detectionMethods: ('script' | 'network' | 'window' | 'dataLayer')[] = [];

  // 1. Script-Erkennung (erweitert für alle Lokalisierungen)
  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );
  if (scriptDetected) detectionMethods.push('script');

  // 2. Network Request Erkennung
  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );
  if (networkDetected) detectionMethods.push('network');

  // 3. Window Object Erkennung (erweitert)
  const windowDetected = windowObjects.hasFbq || 
    windowObjects.hasFbEvents || 
    windowObjects.additionalTrackingObjects._fbq ||
    windowObjects.additionalTrackingObjects.fbq;
  if (windowDetected) detectionMethods.push('window');

  // 4. DataLayer Analyse für GTM-geladene Pixel
  let dataLayerDetected = false;
  if (windowObjects.dataLayerContent) {
    const dataLayerStr = JSON.stringify(windowObjects.dataLayerContent).toLowerCase();
    dataLayerDetected = def.dataLayerIndicators.some(indicator => 
      dataLayerStr.includes(indicator.toLowerCase())
    );
    if (dataLayerDetected) detectionMethods.push('dataLayer');
  }

  // 5. fbq Queue Analyse
  if (windowObjects.fbqQueue) {
    const queueStr = JSON.stringify(windowObjects.fbqQueue);
    if (queueStr.includes('init') || queueStr.includes('track')) {
      if (!detectionMethods.includes('window')) detectionMethods.push('window');
    }
  }

  const detected = scriptDetected || networkDetected || windowDetected || dataLayerDetected;

  // Pixel IDs extrahieren (mehrere Methoden)
  const pixelIds: string[] = [];
  
  // Methode 1: fbq('init', 'ID') Pattern
  const initMatches = content.matchAll(def.idPatterns.PIXEL_INIT);
  for (const match of initMatches) {
    if (match[1] && !pixelIds.includes(match[1])) {
      pixelIds.push(match[1]);
    }
  }

  // Methode 2: Suche in Network Requests
  for (const req of requests) {
    if (req.url.includes('facebook.com/tr') || req.url.includes('facebook.net')) {
      const idMatch = req.url.match(/[?&]id=(\d{15,16})/);
      if (idMatch && idMatch[1] && !pixelIds.includes(idMatch[1])) {
        pixelIds.push(idMatch[1]);
      }
    }
  }

  // Methode 3: Pixel ID Config Patterns
  const configMatches = content.matchAll(def.idPatterns.PIXEL_CONFIG);
  for (const match of configMatches) {
    if (match[1] && !pixelIds.includes(match[1])) {
      pixelIds.push(match[1]);
    }
  }

  // Methode 4: Suche in fbq Queue
  if (windowObjects.fbqQueue) {
    const queueStr = JSON.stringify(windowObjects.fbqQueue);
    const queueIdMatches = queueStr.matchAll(/(\d{15,16})/g);
    for (const match of queueIdMatches) {
      if (match[1] && !pixelIds.includes(match[1])) {
        // Validiere dass es eine echte Pixel ID ist (nicht irgendeine Zahl)
        if (queueStr.includes(`"${match[1]}"`) || queueStr.includes(`'${match[1]}'`)) {
          pixelIds.push(match[1]);
        }
      }
    }
  }

  const pixelId = pixelIds[0];

  // Prüfe ob über GTM geladen
  const loadedViaGTM = gtmDetected && detected && 
    !content.includes('connect.facebook.net') && 
    (windowDetected || dataLayerDetected);

  // Server-Side (CAPI) Erkennung
  const serverSide = detectMetaServerSide(requests, extendedRequests, content, pageDomain);

  return { 
    detected, 
    pixelId,
    pixelIds,
    hasMultiplePixels: pixelIds.length > 1,
    loadedViaGTM,
    detectionMethod: detectionMethods,
    serverSide,
  };
}

function detectMetaServerSide(
  requests: NetworkRequest[],
  extendedRequests: NetworkRequestExtended[],
  content: string,
  pageDomain: string
): MetaServerSideResult {
  const indicators: string[] = [];
  const eventIds: string[] = [];
  let hasConversionsAPI = false;

  // Suche nach Conversions API Indikatoren
  for (const req of requests) {
    const url = req.url.toLowerCase();
    
    // Graph API Calls (typisch für CAPI)
    if (SERVER_SIDE_PATTERNS.metaCAPI.networkPatterns.some(p => url.includes(p.toLowerCase()))) {
      hasConversionsAPI = true;
      indicators.push('Facebook Graph API Aufruf erkannt');
    }

    // Event ID Parameter (Deduplizierung zwischen Browser und Server)
    if (url.includes('event_id=')) {
      const eventIdMatch = req.url.match(/event_id=([^&]+)/);
      if (eventIdMatch) {
        eventIds.push(eventIdMatch[1]);
        indicators.push('Event ID für Deduplizierung gefunden');
      }
    }

    // First-Party Pixel Proxy
    try {
      const reqUrl = new URL(req.url);
      if (reqUrl.hostname.includes(pageDomain) || pageDomain.includes(reqUrl.hostname.split('.').slice(-2).join('.'))) {
        if (url.includes('/tr') || url.includes('/pixel') || url.includes('/fb')) {
          indicators.push(`First-Party Pixel Proxy: ${reqUrl.hostname}`);
          hasConversionsAPI = true;
        }
      }
    } catch {
      // URL parsing failed
    }
  }

  // Prüfe Content auf CAPI-typische Patterns
  for (const pattern of SERVER_SIDE_PATTERNS.metaCAPI.patterns) {
    if (pattern.test(content)) {
      indicators.push('CAPI-typisches Pattern im Code gefunden');
    }
  }

  return {
    detected: indicators.length > 0,
    hasConversionsAPI,
    eventIds: [...new Set(eventIds)],
    indicators,
  };
}

function analyzeLinkedInInsight(
  content: string,
  requests: NetworkRequest[],
  windowObjects: WindowObjectData,
  gtmDetected: boolean
): TrackingTagsResult['linkedInInsight'] {
  const def = TRACKING_DEFINITIONS.linkedInInsight;

  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  const windowDetected = windowObjects.hasLintrk || 
    windowObjects.additionalTrackingObjects.lintrk ||
    windowObjects.additionalTrackingObjects._linkedin_data_partner_ids !== undefined;

  const detected = scriptDetected || networkDetected || windowDetected;

  // Partner ID suchen
  let partnerId: string | undefined;
  const partnerMatch = content.match(/_linkedin_partner_id\s*=\s*['"]?(\d+)['"]?/);
  if (partnerMatch) {
    partnerId = partnerMatch[1];
  }

  // Auch in Window Objects suchen
  if (!partnerId && windowObjects.additionalTrackingObjects._linkedin_data_partner_ids) {
    const ids = windowObjects.additionalTrackingObjects._linkedin_data_partner_ids;
    if (Array.isArray(ids) && ids.length > 0) {
      partnerId = String(ids[0]);
    }
  }

  const loadedViaGTM = gtmDetected && detected && !content.includes('snap.licdn.com');

  return { detected, partnerId, loadedViaGTM };
}

function analyzeTikTokPixel(
  content: string,
  requests: NetworkRequest[],
  windowObjects: WindowObjectData,
  gtmDetected: boolean
): TrackingTagsResult['tiktokPixel'] {
  const def = TRACKING_DEFINITIONS.tiktokPixel;

  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  const windowDetected = !!(windowObjects.hasTtq || 
    windowObjects.additionalTrackingObjects.ttq ||
    windowObjects.additionalTrackingObjects._ttq);

  const detected: boolean = !!(scriptDetected || networkDetected || windowDetected);

  // Pixel ID suchen
  let pixelId: string | undefined;
  const pixelMatch = content.match(/ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/);
  if (pixelMatch) {
    pixelId = pixelMatch[1];
  }

  const loadedViaGTM: boolean = !!(gtmDetected && detected && !content.includes('analytics.tiktok.com'));

  return { detected, pixelId, loadedViaGTM };
}

function analyzeOtherTracking(
  content: string,
  requests: NetworkRequest[],
  gtmDetected: boolean
): TrackingTagsResult['other'] {
  const results: TrackingTagsResult['other'] = [];
  const contentLower = content.toLowerCase();

  for (const service of OTHER_TRACKING_SERVICES) {
    const scriptDetected = service.patterns.some(pattern => 
      contentLower.includes(pattern.toLowerCase())
    );

    const networkDetected = requests.some(req => 
      service.patterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
    );

    if (scriptDetected || networkDetected) {
      // Prüfe ob wahrscheinlich über GTM geladen
      const likelyViaGTM = gtmDetected && !service.patterns.some(p => 
        content.includes(p) && !contentLower.includes('gtm')
      );

      results.push({
        name: service.name,
        detected: true,
        loadedViaGTM: likelyViaGTM,
      });
    }
  }

  return results;
}

function detectMarketingParameters(requests: NetworkRequest[]): TrackingTagsResult['marketingParameters'] {
  let gclid = false;
  let dclid = false;
  let wbraid = false;
  let pbraid = false;
  let fbclid = false;
  let msclkid = false;
  let utm = false;

  for (const req of requests) {
    const urlLower = req.url.toLowerCase();
    if (urlLower.includes('gclid=')) gclid = true;
    if (urlLower.includes('dclid=')) dclid = true;
    if (urlLower.includes('wbraid=')) wbraid = true;
    if (urlLower.includes('pbraid=')) pbraid = true;
    if (urlLower.includes('fbclid=')) fbclid = true;
    if (urlLower.includes('msclkid=')) msclkid = true;
    if (!utm && urlLower.includes('utm_')) utm = true;
  }

  const any = gclid || dclid || wbraid || pbraid || fbclid || msclkid || utm;

  return { gclid, dclid, wbraid, pbraid, fbclid, msclkid, utm, any };
}

function analyzeServerSideTracking(
  requests: NetworkRequest[],
  extendedRequests: NetworkRequestExtended[],
  responseHeaders: ResponseHeaderData[],
  pageDomain: string,
  content: string
): ServerSideTrackingResult {
  const indicators: ServerSideIndicator[] = [];
  const firstPartyEndpoints: FirstPartyEndpoint[] = [];

  // 1. Server-Side GTM Erkennung
  const sgtmResult = detectServerSideGTMIndicators(requests, extendedRequests, responseHeaders, pageDomain);
  if (sgtmResult.detected) {
    indicators.push({
      type: 'sgtm',
      confidence: sgtmResult.confidence,
      description: 'Server-Side Google Tag Manager erkannt',
      evidence: sgtmResult.evidence,
    });
    if (sgtmResult.endpoint) {
      firstPartyEndpoints.push({
        url: sgtmResult.endpoint,
        type: 'gtm',
        originalService: 'Google Tag Manager',
      });
    }
  }

  // 2. Meta Conversions API
  const capiResult = detectMetaCAPIIndicators(requests, content, pageDomain);
  if (capiResult.detected) {
    indicators.push({
      type: 'meta_capi',
      confidence: capiResult.confidence,
      description: 'Meta Conversions API (CAPI) erkannt',
      evidence: capiResult.evidence,
    });
  }

  // 3. TikTok Events API
  const tiktokResult = detectTikTokEventsAPI(requests, content);
  if (tiktokResult.detected) {
    indicators.push({
      type: 'tiktok_events_api',
      confidence: tiktokResult.confidence,
      description: 'TikTok Events API erkannt',
      evidence: tiktokResult.evidence,
    });
  }

  // 4. LinkedIn Conversions API
  const linkedInResult = detectLinkedInCAPI(requests, content);
  if (linkedInResult.detected) {
    indicators.push({
      type: 'linkedin_capi',
      confidence: linkedInResult.confidence,
      description: 'LinkedIn Conversions API erkannt',
      evidence: linkedInResult.evidence,
    });
  }

  // 5. First-Party Tracking Proxies
  const proxyResult = detectFirstPartyProxies(requests, pageDomain);
  if (proxyResult.detected) {
    indicators.push({
      type: 'first_party_proxy',
      confidence: proxyResult.confidence,
      description: 'First-Party Tracking Proxy erkannt',
      evidence: proxyResult.evidence,
    });
    firstPartyEndpoints.push(...proxyResult.endpoints);
  }

  return {
    detected: indicators.length > 0,
    indicators,
    firstPartyEndpoints,
    summary: {
      hasServerSideGTM: indicators.some(i => i.type === 'sgtm'),
      hasMetaCAPI: indicators.some(i => i.type === 'meta_capi'),
      hasFirstPartyProxy: indicators.some(i => i.type === 'first_party_proxy'),
      hasTikTokEventsAPI: indicators.some(i => i.type === 'tiktok_events_api'),
      hasLinkedInCAPI: indicators.some(i => i.type === 'linkedin_capi'),
    },
  };
}

function detectServerSideGTMIndicators(
  requests: NetworkRequest[],
  extendedRequests: NetworkRequestExtended[],
  responseHeaders: ResponseHeaderData[],
  pageDomain: string
): { detected: boolean; confidence: 'high' | 'medium' | 'low'; evidence: string[]; endpoint?: string } {
  const evidence: string[] = [];
  let endpoint: string | undefined;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  for (const req of requests) {
    try {
      const reqUrl = new URL(req.url);
      const reqDomain = reqUrl.hostname;
      
      // First-Party Domain Check
      const isFirstParty = reqDomain.endsWith(pageDomain) || 
        pageDomain.endsWith(reqDomain.split('.').slice(-2).join('.')) ||
        reqDomain.includes(pageDomain.split('.')[0]);

      if (isFirstParty) {
        const pathLower = reqUrl.pathname.toLowerCase();
        
        // GTM/Analytics-typische Pfade auf First-Party Domain
        if (pathLower.includes('/gtm') || pathLower.includes('/g/collect') || 
            pathLower.includes('/collect') || pathLower.includes('/gtag')) {
          evidence.push(`First-Party GTM Endpoint: ${reqDomain}${reqUrl.pathname}`);
          endpoint = req.url;
          confidence = 'high';
        }
        
        // Subdomain-Patterns für sGTM
        if (reqDomain.match(/^(gtm|sgtm|tag|tagging|tracking|analytics|data)\./)) {
          evidence.push(`sGTM-typische Subdomain: ${reqDomain}`);
          confidence = confidence === 'high' ? 'high' : 'medium';
        }
      }
    } catch {
      // URL parsing failed
    }
  }

  // Response Header Check
  for (const resp of responseHeaders) {
    const headers = Object.keys(resp.headers).map(h => h.toLowerCase());
    if (headers.some(h => h.includes('x-gtm') || h.includes('x-sgtm'))) {
      evidence.push('sGTM-spezifische Response Header erkannt');
      confidence = 'high';
    }
  }

  return {
    detected: evidence.length > 0,
    confidence,
    evidence,
    endpoint,
  };
}

function detectMetaCAPIIndicators(
  requests: NetworkRequest[],
  content: string,
  pageDomain: string
): { detected: boolean; confidence: 'high' | 'medium' | 'low'; evidence: string[] } {
  const evidence: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Graph API Aufrufe
  for (const req of requests) {
    if (req.url.includes('graph.facebook.com') && req.url.includes('/events')) {
      evidence.push('Facebook Graph API /events Aufruf erkannt');
      confidence = 'high';
    }
  }

  // Event ID Parameter (Deduplizierung)
  const hasEventId = requests.some(req => 
    req.url.includes('event_id=') && req.url.includes('facebook')
  );
  if (hasEventId) {
    evidence.push('Event ID für Browser/Server Deduplizierung gefunden');
    confidence = confidence === 'high' ? 'high' : 'medium';
  }

  // action_source=server Parameter
  if (content.includes('action_source') && content.includes('server')) {
    evidence.push('Server-Side action_source Parameter im Code');
    confidence = 'medium';
  }

  // First-Party Pixel Proxy
  for (const req of requests) {
    try {
      const reqUrl = new URL(req.url);
      const isFirstParty = reqUrl.hostname.includes(pageDomain) || 
        pageDomain.includes(reqUrl.hostname.split('.').slice(-2).join('.'));
      
      if (isFirstParty && (req.url.includes('/tr') || req.url.includes('/pixel') || req.url.includes('/fb'))) {
        evidence.push(`First-Party Facebook Pixel Proxy: ${reqUrl.hostname}`);
        confidence = 'high';
      }
    } catch {
      // URL parsing failed
    }
  }

  return {
    detected: evidence.length > 0,
    confidence,
    evidence,
  };
}

function detectTikTokEventsAPI(
  requests: NetworkRequest[],
  content: string
): { detected: boolean; confidence: 'high' | 'medium' | 'low'; evidence: string[] } {
  const evidence: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  for (const req of requests) {
    if (req.url.includes('business-api.tiktok.com')) {
      evidence.push('TikTok Business API Aufruf erkannt');
      confidence = 'high';
    }
  }

  if (content.includes('TikTok Events API') || content.includes('tiktok_events_api')) {
    evidence.push('TikTok Events API Referenz im Code');
    confidence = 'medium';
  }

  return {
    detected: evidence.length > 0,
    confidence,
    evidence,
  };
}

function detectLinkedInCAPI(
  requests: NetworkRequest[],
  content: string
): { detected: boolean; confidence: 'high' | 'medium' | 'low'; evidence: string[] } {
  const evidence: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  for (const req of requests) {
    if (SERVER_SIDE_PATTERNS.linkedInCAPI.patterns.some(p => req.url.includes(p))) {
      evidence.push('LinkedIn Conversions API Aufruf erkannt');
      confidence = 'high';
    }
  }

  if (content.includes('conversionEvents') && content.includes('linkedin')) {
    evidence.push('LinkedIn Conversions API Referenz im Code');
    confidence = 'medium';
  }

  return {
    detected: evidence.length > 0,
    confidence,
    evidence,
  };
}

function detectFirstPartyProxies(
  requests: NetworkRequest[],
  pageDomain: string
): { detected: boolean; confidence: 'high' | 'medium' | 'low'; evidence: string[]; endpoints: FirstPartyEndpoint[] } {
  const evidence: string[] = [];
  const endpoints: FirstPartyEndpoint[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  const trackingPatterns = [
    { pattern: '/collect', type: 'analytics' as const, service: 'Google Analytics' },
    { pattern: '/tr', type: 'pixel' as const, service: 'Facebook Pixel' },
    { pattern: '/pixel', type: 'pixel' as const, service: 'Generic Pixel' },
    { pattern: '/events', type: 'pixel' as const, service: 'Events Endpoint' },
    { pattern: '/track', type: 'analytics' as const, service: 'Tracking Endpoint' },
    { pattern: '/gtm', type: 'gtm' as const, service: 'Google Tag Manager' },
    { pattern: '/g/', type: 'analytics' as const, service: 'GA4' },
  ];

  for (const req of requests) {
    try {
      const reqUrl = new URL(req.url);
      const reqDomain = reqUrl.hostname;
      
      // Prüfe ob First-Party
      const domainParts = pageDomain.split('.');
      const baseDomain = domainParts.slice(-2).join('.');
      const isFirstParty = reqDomain.endsWith(baseDomain);

      if (isFirstParty && reqDomain !== pageDomain) {
        for (const tp of trackingPatterns) {
          if (reqUrl.pathname.includes(tp.pattern)) {
            evidence.push(`First-Party ${tp.service} Proxy: ${reqDomain}${reqUrl.pathname}`);
            endpoints.push({
              url: req.url,
              type: tp.type,
              originalService: tp.service,
            });
            confidence = 'high';
          }
        }
      }
    } catch {
      // URL parsing failed
    }
  }

  return {
    detected: evidence.length > 0,
    confidence,
    evidence,
    endpoints,
  };
}
