import { CrawlResult, NetworkRequest, WindowObjectData } from './crawler';
import { TrackingTagsResult } from '@/types';

// Tracking Tag Definitionen
const TRACKING_DEFINITIONS = {
  googleAnalytics: {
    scriptPatterns: [
      'google-analytics.com/analytics.js',
      'google-analytics.com/ga.js',
      'googletagmanager.com/gtag/js',
      'www.google-analytics.com',
    ],
    networkPatterns: [
      'google-analytics.com/collect',
      'google-analytics.com/g/collect',
      'analytics.google.com',
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
    ],
    networkPatterns: ['googletagmanager.com'],
    idPatterns: {
      GTM: /GTM-[A-Z0-9]{6,}/g,
    },
  },
  metaPixel: {
    scriptPatterns: [
      'connect.facebook.net/en_US/fbevents.js',
      'connect.facebook.net/signals',
      'facebook.com/tr',
    ],
    networkPatterns: [
      'facebook.com/tr',
      'facebook.net/en_US/fbevents',
    ],
    idPatterns: {
      PIXEL: /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{15,16})['"]/g,
    },
  },
  linkedInInsight: {
    scriptPatterns: [
      'snap.licdn.com/li.lms-analytics',
      'platform.linkedin.com',
    ],
    networkPatterns: [
      'px.ads.linkedin.com',
      'snap.licdn.com',
      'linkedin.com/px',
    ],
    idPatterns: {
      PARTNER: /_linkedin_partner_id\s*=\s*['"]?(\d+)['"]?/g,
    },
  },
  tiktokPixel: {
    scriptPatterns: [
      'analytics.tiktok.com',
      'tiktok.com/i18n/pixel',
    ],
    networkPatterns: [
      'analytics.tiktok.com',
      'tiktok.com/i18n/pixel',
    ],
    idPatterns: {
      PIXEL: /ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/g,
    },
  },
};

// Weitere bekannte Tracking-Dienste
const OTHER_TRACKING_SERVICES = [
  { name: 'Hotjar', patterns: ['static.hotjar.com', 'hotjar.com'] },
  { name: 'Microsoft Clarity', patterns: ['clarity.ms'] },
  { name: 'Pinterest Tag', patterns: ['pintrk', 's.pinimg.com/ct'] },
  { name: 'Twitter Pixel', patterns: ['static.ads-twitter.com', 'analytics.twitter.com'] },
  { name: 'Snapchat Pixel', patterns: ['sc-static.net/scevent'] },
  { name: 'Criteo', patterns: ['static.criteo.net', 'criteo.com'] },
  { name: 'Adobe Analytics', patterns: ['omtrdc.net', 'adobedtm.com'] },
  { name: 'Matomo/Piwik', patterns: ['matomo', 'piwik'] },
  { name: 'Plausible', patterns: ['plausible.io'] },
  { name: 'Hubspot', patterns: ['js.hs-scripts.com', 'js.hsforms.net'] },
  { name: 'Segment', patterns: ['cdn.segment.com', 'api.segment.io'] },
  { name: 'Mixpanel', patterns: ['cdn.mxpnl.com', 'mixpanel.com'] },
  { name: 'Amplitude', patterns: ['cdn.amplitude.com', 'amplitude.com'] },
  { name: 'Heap', patterns: ['heap-analytics.com', 'heapanalytics.com'] },
  { name: 'FullStory', patterns: ['fullstory.com'] },
  { name: 'Mouseflow', patterns: ['mouseflow.com'] },
  { name: 'Lucky Orange', patterns: ['luckyorange.com'] },
  { name: 'Crazy Egg', patterns: ['crazyegg.com'] },
  { name: 'VWO', patterns: ['dev.visualwebsiteoptimizer.com'] },
  { name: 'Optimizely', patterns: ['cdn.optimizely.com'] },
  { name: 'Google Optimize', patterns: ['optimize.google.com'] },
  { name: 'Taboola', patterns: ['cdn.taboola.com'] },
  { name: 'Outbrain', patterns: ['outbrain.com'] },
  { name: 'AdRoll', patterns: ['adroll.com'] },
  { name: 'Bing Ads', patterns: ['bat.bing.com', 'clarity.ms'] },
];

export function analyzeTrackingTags(crawlResult: CrawlResult): TrackingTagsResult {
  const { scripts, networkRequests, html, windowObjects } = crawlResult;
  const combinedContent = html + scripts.join(' ');

  // Google Analytics
  const googleAnalytics = analyzeGoogleAnalytics(combinedContent, networkRequests, windowObjects);

  // Google Tag Manager
  const googleTagManager = analyzeGoogleTagManager(combinedContent, networkRequests);

  // Meta Pixel
  const metaPixel = analyzeMetaPixel(combinedContent, networkRequests, windowObjects);

  // LinkedIn Insight
  const linkedInInsight = analyzeLinkedInInsight(combinedContent, networkRequests);

  // TikTok Pixel
  const tiktokPixel = analyzeTikTokPixel(combinedContent, networkRequests);

  // Andere Tracking-Dienste
  const other = analyzeOtherTracking(combinedContent, networkRequests);

  // Marketing-Parameter (gclid, wbraid, etc.)
  const marketingParameters = detectMarketingParameters(networkRequests);

  return {
    googleAnalytics,
    googleTagManager,
    metaPixel,
    linkedInInsight,
    tiktokPixel,
    other,
    marketingParameters,
  };
}

function analyzeGoogleAnalytics(
  content: string,
  requests: NetworkRequest[],
  windowObjects: WindowObjectData
): TrackingTagsResult['googleAnalytics'] {
  const def = TRACKING_DEFINITIONS.googleAnalytics;
  
  // Script-Erkennung
  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  // Network Request Erkennung
  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  // gtag Funktion vorhanden
  const gtagDetected = windowObjects.hasGtag || windowObjects.hasDataLayer;

  const detected = scriptDetected || networkDetected || gtagDetected;

  // Version und ID erkennen (Mehrfacherkennung)
  const ga4Matches = content.match(def.idPatterns.GA4) || [];
  const uaMatches = content.match(def.idPatterns.UA) || [];

  const measurementIds = [...new Set([...ga4Matches, ...uaMatches])];

  let version: 'UA' | 'GA4' | undefined;
  let measurementId: string | undefined;

  if (ga4Matches.length > 0) {
    version = 'GA4';
    measurementId = ga4Matches[0];
  }

  // UA ID suchen (Legacy)
  if (!measurementId && uaMatches.length > 0) {
    version = 'UA';
    measurementId = uaMatches[0];
  }

  return { 
    detected, 
    version, 
    measurementId,
    measurementIds,
    hasMultipleMeasurementIds: measurementIds.length > 1,
    hasLegacyUA: uaMatches.length > 0,
  };
}

function analyzeGoogleTagManager(
  content: string,
  requests: NetworkRequest[]
): TrackingTagsResult['googleTagManager'] {
  const def = TRACKING_DEFINITIONS.googleTagManager;

  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  const detected = scriptDetected || networkDetected;

  // Container ID suchen
  let containerId: string | undefined;
  const gtmMatches = content.match(def.idPatterns.GTM);
  if (gtmMatches && gtmMatches.length > 0) {
    containerId = gtmMatches[0];
  }

  return { detected, containerId };
}

function analyzeMetaPixel(
  content: string,
  requests: NetworkRequest[],
  windowObjects: WindowObjectData
): TrackingTagsResult['metaPixel'] {
  const def = TRACKING_DEFINITIONS.metaPixel;

  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  const fbqDetected = windowObjects.hasFbq;

  const detected = scriptDetected || networkDetected || fbqDetected;

  // Pixel ID suchen
  let pixelId: string | undefined;
  const pixelRegex = /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{15,16})['"]/;
  const match = content.match(pixelRegex);
  if (match) {
    pixelId = match[1];
  }

  return { detected, pixelId };
}

function analyzeLinkedInInsight(
  content: string,
  requests: NetworkRequest[]
): TrackingTagsResult['linkedInInsight'] {
  const def = TRACKING_DEFINITIONS.linkedInInsight;

  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  const detected = scriptDetected || networkDetected;

  // Partner ID suchen
  let partnerId: string | undefined;
  const partnerMatch = content.match(/_linkedin_partner_id\s*=\s*['"]?(\d+)['"]?/);
  if (partnerMatch) {
    partnerId = partnerMatch[1];
  }

  return { detected, partnerId };
}

function analyzeTikTokPixel(
  content: string,
  requests: NetworkRequest[]
): TrackingTagsResult['tiktokPixel'] {
  const def = TRACKING_DEFINITIONS.tiktokPixel;

  const scriptDetected = def.scriptPatterns.some(pattern => 
    content.toLowerCase().includes(pattern.toLowerCase())
  );

  const networkDetected = requests.some(req => 
    def.networkPatterns.some(pattern => req.url.toLowerCase().includes(pattern.toLowerCase()))
  );

  const detected = scriptDetected || networkDetected;

  // Pixel ID suchen
  let pixelId: string | undefined;
  const pixelMatch = content.match(/ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/);
  if (pixelMatch) {
    pixelId = pixelMatch[1];
  }

  return { detected, pixelId };
}

function analyzeOtherTracking(
  content: string,
  requests: NetworkRequest[]
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
      results.push({
        name: service.name,
        detected: true,
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
