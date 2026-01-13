import { CrawlResult, NetworkRequest } from './crawler';
import { ThirdPartyDomainsResult, ThirdPartyDomain, CookieResult } from '@/types';

// Bekannte Third-Party Domains und ihre Kategorien
const KNOWN_DOMAINS: Record<string, { category: ThirdPartyDomain['category']; company: string; country: string; isEUBased: boolean }> = {
  // Advertising
  'doubleclick.net': { category: 'advertising', company: 'Google', country: 'US', isEUBased: false },
  'googlesyndication.com': { category: 'advertising', company: 'Google', country: 'US', isEUBased: false },
  'googleadservices.com': { category: 'advertising', company: 'Google', country: 'US', isEUBased: false },
  'google-analytics.com': { category: 'analytics', company: 'Google', country: 'US', isEUBased: false },
  'googletagmanager.com': { category: 'analytics', company: 'Google', country: 'US', isEUBased: false },
  'analytics.google.com': { category: 'analytics', company: 'Google', country: 'US', isEUBased: false },
  'facebook.com': { category: 'advertising', company: 'Meta', country: 'US', isEUBased: false },
  'facebook.net': { category: 'advertising', company: 'Meta', country: 'US', isEUBased: false },
  'connect.facebook.net': { category: 'advertising', company: 'Meta', country: 'US', isEUBased: false },
  'ads.linkedin.com': { category: 'advertising', company: 'LinkedIn/Microsoft', country: 'US', isEUBased: false },
  'licdn.com': { category: 'advertising', company: 'LinkedIn/Microsoft', country: 'US', isEUBased: false },
  'snap.licdn.com': { category: 'advertising', company: 'LinkedIn/Microsoft', country: 'US', isEUBased: false },
  'analytics.tiktok.com': { category: 'advertising', company: 'TikTok/ByteDance', country: 'CN', isEUBased: false },
  'ads-twitter.com': { category: 'advertising', company: 'X/Twitter', country: 'US', isEUBased: false },
  'twitter.com': { category: 'social', company: 'X/Twitter', country: 'US', isEUBased: false },
  'pinterest.com': { category: 'advertising', company: 'Pinterest', country: 'US', isEUBased: false },
  'pinimg.com': { category: 'advertising', company: 'Pinterest', country: 'US', isEUBased: false },
  'snapchat.com': { category: 'advertising', company: 'Snap Inc.', country: 'US', isEUBased: false },
  'sc-static.net': { category: 'advertising', company: 'Snap Inc.', country: 'US', isEUBased: false },
  'criteo.com': { category: 'advertising', company: 'Criteo', country: 'FR', isEUBased: true },
  'criteo.net': { category: 'advertising', company: 'Criteo', country: 'FR', isEUBased: true },
  'bing.com': { category: 'advertising', company: 'Microsoft', country: 'US', isEUBased: false },
  'bat.bing.com': { category: 'advertising', company: 'Microsoft', country: 'US', isEUBased: false },
  'taboola.com': { category: 'advertising', company: 'Taboola', country: 'US', isEUBased: false },
  'outbrain.com': { category: 'advertising', company: 'Outbrain', country: 'US', isEUBased: false },
  'adroll.com': { category: 'advertising', company: 'AdRoll', country: 'US', isEUBased: false },
  'amazon-adsystem.com': { category: 'advertising', company: 'Amazon', country: 'US', isEUBased: false },
  'adsrvr.org': { category: 'advertising', company: 'The Trade Desk', country: 'US', isEUBased: false },
  'demdex.net': { category: 'advertising', company: 'Adobe', country: 'US', isEUBased: false },
  'omtrdc.net': { category: 'analytics', company: 'Adobe', country: 'US', isEUBased: false },
  
  // Analytics
  'hotjar.com': { category: 'analytics', company: 'Hotjar', country: 'MT', isEUBased: true },
  'clarity.ms': { category: 'analytics', company: 'Microsoft', country: 'US', isEUBased: false },
  'mouseflow.com': { category: 'analytics', company: 'Mouseflow', country: 'DK', isEUBased: true },
  'fullstory.com': { category: 'analytics', company: 'FullStory', country: 'US', isEUBased: false },
  'heap.io': { category: 'analytics', company: 'Heap', country: 'US', isEUBased: false },
  'amplitude.com': { category: 'analytics', company: 'Amplitude', country: 'US', isEUBased: false },
  'mixpanel.com': { category: 'analytics', company: 'Mixpanel', country: 'US', isEUBased: false },
  'segment.io': { category: 'analytics', company: 'Segment/Twilio', country: 'US', isEUBased: false },
  'segment.com': { category: 'analytics', company: 'Segment/Twilio', country: 'US', isEUBased: false },
  'plausible.io': { category: 'analytics', company: 'Plausible', country: 'EU', isEUBased: true },
  'matomo.cloud': { category: 'analytics', company: 'Matomo', country: 'EU', isEUBased: true },
  'newrelic.com': { category: 'analytics', company: 'New Relic', country: 'US', isEUBased: false },
  'sentry.io': { category: 'analytics', company: 'Sentry', country: 'US', isEUBased: false },
  
  // Social
  'instagram.com': { category: 'social', company: 'Meta', country: 'US', isEUBased: false },
  'youtube.com': { category: 'social', company: 'Google', country: 'US', isEUBased: false },
  'youtu.be': { category: 'social', company: 'Google', country: 'US', isEUBased: false },
  'vimeo.com': { category: 'social', company: 'Vimeo', country: 'US', isEUBased: false },
  'tiktok.com': { category: 'social', company: 'TikTok/ByteDance', country: 'CN', isEUBased: false },
  
  // CDN
  'cloudflare.com': { category: 'cdn', company: 'Cloudflare', country: 'US', isEUBased: false },
  'cdnjs.cloudflare.com': { category: 'cdn', company: 'Cloudflare', country: 'US', isEUBased: false },
  'jsdelivr.net': { category: 'cdn', company: 'jsDelivr', country: 'EU', isEUBased: true },
  'unpkg.com': { category: 'cdn', company: 'Cloudflare', country: 'US', isEUBased: false },
  'bootstrapcdn.com': { category: 'cdn', company: 'StackPath', country: 'US', isEUBased: false },
  'googleapis.com': { category: 'cdn', company: 'Google', country: 'US', isEUBased: false },
  'gstatic.com': { category: 'cdn', company: 'Google', country: 'US', isEUBased: false },
  'ajax.googleapis.com': { category: 'cdn', company: 'Google', country: 'US', isEUBased: false },
  'fonts.googleapis.com': { category: 'cdn', company: 'Google', country: 'US', isEUBased: false },
  'fonts.gstatic.com': { category: 'cdn', company: 'Google', country: 'US', isEUBased: false },
  'akamaihd.net': { category: 'cdn', company: 'Akamai', country: 'US', isEUBased: false },
  'akamai.net': { category: 'cdn', company: 'Akamai', country: 'US', isEUBased: false },
  'fastly.net': { category: 'cdn', company: 'Fastly', country: 'US', isEUBased: false },
  'stackpath.com': { category: 'cdn', company: 'StackPath', country: 'US', isEUBased: false },
  
  // Functional
  'cookiebot.com': { category: 'functional', company: 'Cookiebot', country: 'DK', isEUBased: true },
  'cookielaw.org': { category: 'functional', company: 'OneTrust', country: 'US', isEUBased: false },
  'onetrust.com': { category: 'functional', company: 'OneTrust', country: 'US', isEUBased: false },
  'usercentrics.eu': { category: 'functional', company: 'Usercentrics', country: 'DE', isEUBased: true },
  'intercom.io': { category: 'functional', company: 'Intercom', country: 'US', isEUBased: false },
  'zendesk.com': { category: 'functional', company: 'Zendesk', country: 'US', isEUBased: false },
  'hubspot.com': { category: 'functional', company: 'HubSpot', country: 'US', isEUBased: false },
  'hs-scripts.com': { category: 'functional', company: 'HubSpot', country: 'US', isEUBased: false },
  'recaptcha.net': { category: 'functional', company: 'Google', country: 'US', isEUBased: false },
  'hcaptcha.com': { category: 'functional', company: 'hCaptcha', country: 'US', isEUBased: false },
  'stripe.com': { category: 'functional', company: 'Stripe', country: 'US', isEUBased: false },
  'paypal.com': { category: 'functional', company: 'PayPal', country: 'US', isEUBased: false },
};

// Hochrisiko-Domains (Datentransfer in unsichere Länder)
const HIGH_RISK_COUNTRIES = ['CN', 'RU'];

export function analyzeThirdPartyDomains(
  crawlResult: CrawlResult,
  cookies: CookieResult[]
): ThirdPartyDomainsResult {
  const { networkRequests, pageDomain } = crawlResult;
  
  // Sammle alle Third-Party Domains
  const domainStats: Map<string, {
    requestCount: number;
    cookiesSet: number;
    dataTypes: Set<string>;
  }> = new Map();

  // Network Requests analysieren
  for (const request of networkRequests) {
    try {
      const url = new URL(request.url);
      const domain = extractBaseDomain(url.hostname);
      
      // Nur Third-Party Domains
      if (!isFirstParty(domain, pageDomain)) {
        const stats = domainStats.get(domain) || {
          requestCount: 0,
          cookiesSet: 0,
          dataTypes: new Set(),
        };
        
        stats.requestCount++;
        
        // Datentyp basierend auf Resource-Typ
        if (request.resourceType) {
          stats.dataTypes.add(request.resourceType);
        }
        
        domainStats.set(domain, stats);
      }
    } catch {
      // URL parsing fehlgeschlagen
    }
  }

  // Cookies pro Domain zählen
  for (const cookie of cookies) {
    const domain = extractBaseDomain(cookie.domain);
    if (domainStats.has(domain)) {
      const stats = domainStats.get(domain)!;
      stats.cookiesSet++;
    }
  }

  // ThirdPartyDomain Objekte erstellen
  const domains: ThirdPartyDomain[] = [];
  const categories = {
    advertising: 0,
    analytics: 0,
    social: 0,
    cdn: 0,
    functional: 0,
    unknown: 0,
  };

  const highRiskDomains: string[] = [];
  const crossBorderTransfers: string[] = [];
  const unknownDomains: string[] = [];

  for (const [domain, stats] of domainStats.entries()) {
    const knownInfo = findKnownDomain(domain);
    
    const thirdPartyDomain: ThirdPartyDomain = {
      domain,
      category: knownInfo?.category || 'unknown',
      requestCount: stats.requestCount,
      cookiesSet: stats.cookiesSet,
      dataTypes: Array.from(stats.dataTypes),
      company: knownInfo?.company,
      country: knownInfo?.country,
      isEUBased: knownInfo?.isEUBased,
    };

    domains.push(thirdPartyDomain);
    categories[thirdPartyDomain.category]++;

    // Risk Assessment
    if (knownInfo?.country && HIGH_RISK_COUNTRIES.includes(knownInfo.country)) {
      highRiskDomains.push(domain);
    }

    if (knownInfo?.country && !knownInfo.isEUBased && knownInfo.country !== 'US') {
      crossBorderTransfers.push(domain);
    } else if (knownInfo?.country && !knownInfo.isEUBased) {
      crossBorderTransfers.push(domain);
    }

    if (!knownInfo) {
      unknownDomains.push(domain);
    }
  }

  // Nach Request-Count sortieren
  domains.sort((a, b) => b.requestCount - a.requestCount);

  return {
    totalCount: domains.length,
    domains,
    categories,
    riskAssessment: {
      highRiskDomains,
      crossBorderTransfers: [...new Set(crossBorderTransfers)],
      unknownDomains,
    },
  };
}

function extractBaseDomain(hostname: string): string {
  // Entferne www. und extrahiere Basis-Domain
  const parts = hostname.replace(/^www\./, '').split('.');
  
  // Für bekannte Second-Level Domains
  const secondLevelDomains = ['co.uk', 'com.au', 'co.jp', 'com.br'];
  
  if (parts.length >= 3) {
    const lastTwo = parts.slice(-2).join('.');
    if (secondLevelDomains.includes(lastTwo)) {
      return parts.slice(-3).join('.');
    }
  }
  
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  
  return hostname;
}

function isFirstParty(domain: string, pageDomain: string): boolean {
  const baseDomain = extractBaseDomain(pageDomain);
  const requestBaseDomain = extractBaseDomain(domain);
  
  return baseDomain === requestBaseDomain || 
         domain.endsWith('.' + baseDomain) || 
         baseDomain.endsWith('.' + domain);
}

function findKnownDomain(domain: string): typeof KNOWN_DOMAINS[string] | undefined {
  // Exakte Übereinstimmung
  if (KNOWN_DOMAINS[domain]) {
    return KNOWN_DOMAINS[domain];
  }

  // Subdomain-Übereinstimmung
  for (const [knownDomain, info] of Object.entries(KNOWN_DOMAINS)) {
    if (domain.endsWith('.' + knownDomain) || domain === knownDomain) {
      return info;
    }
  }

  // Partial Match für bekannte Patterns
  const partialPatterns: Record<string, typeof KNOWN_DOMAINS[string]> = {
    'google': { category: 'analytics', company: 'Google', country: 'US', isEUBased: false },
    'facebook': { category: 'advertising', company: 'Meta', country: 'US', isEUBased: false },
    'fb': { category: 'advertising', company: 'Meta', country: 'US', isEUBased: false },
    'amazon': { category: 'advertising', company: 'Amazon', country: 'US', isEUBased: false },
    'microsoft': { category: 'functional', company: 'Microsoft', country: 'US', isEUBased: false },
    'adobe': { category: 'analytics', company: 'Adobe', country: 'US', isEUBased: false },
  };

  for (const [pattern, info] of Object.entries(partialPatterns)) {
    if (domain.includes(pattern)) {
      return info;
    }
  }

  return undefined;
}
