import type { CrawlResult, NetworkRequest, WindowObjectData } from '../crawler';

function createRequest(url: string, resourceType = 'script'): NetworkRequest {
  return {
    url,
    method: 'GET',
    resourceType,
    timestamp: Date.now(),
  };
}

function createWindowObjects(overrides: Partial<WindowObjectData> = {}): WindowObjectData {
  return {
    hasGtag: false,
    hasDataLayer: false,
    hasTcfApi: false,
    hasFbq: false,
    hasFbEvents: false,
    hasTtq: false,
    hasLintrk: false,
    additionalTrackingObjects: {},
    ...overrides,
  };
}

function createCrawlResult(overrides: Partial<CrawlResult> = {}): CrawlResult {
  return {
    html: '<html><head></head><body></body></html>',
    scripts: [],
    networkRequests: [],
    networkRequestsExtended: [],
    cookies: [],
    windowObjects: createWindowObjects(),
    consoleMessages: [],
    responseHeaders: [],
    pageUrl: 'https://fixture.example/',
    pageDomain: 'fixture.example',
    ...overrides,
  };
}

export const genericDataLayerOnlyFixture = createCrawlResult({
  html: '<script>window.dataLayer = window.dataLayer || []; dataLayer.push({event:"page_view"});</script>',
  windowObjects: createWindowObjects({
    hasDataLayer: true,
    dataLayerContent: [{ event: 'page_view', pageType: 'landing' }],
  }),
});

export const gaViaDataLayerFixture = createCrawlResult({
  html: `<script>
    window.dataLayer = window.dataLayer || [];
    dataLayer.push(['config', 'G-TEST123456']);
  </script>`,
  windowObjects: createWindowObjects({
    hasDataLayer: true,
    hasGtag: true,
    dataLayerContent: [['config', 'G-TEST123456']],
    gtagCalls: [['config', 'G-TEST123456']],
  }),
});

export const metaServerSideFixture = createCrawlResult({
  html: `<script>
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];fbq('init', '123456789012345');
  </script>`,
  networkRequests: [
    createRequest('https://connect.facebook.net/en_US/fbevents.js'),
    createRequest('https://www.facebook.com/tr?id=123456789012345&ev=PageView'),
    createRequest('https://graph.facebook.com/v19.0/123/events?event_id=evt_123', 'xhr'),
    createRequest('https://fixture.example/fb/events?event_id=evt_123', 'xhr'),
  ],
  networkRequestsExtended: [
    {
      ...createRequest('https://fixture.example/fb/events?event_id=evt_123', 'xhr'),
      redirectChain: [],
      initiator: 'script',
    },
  ],
  windowObjects: createWindowObjects({
    hasFbq: true,
    hasFbEvents: true,
    additionalTrackingObjects: { fbq: true, _fbq: true },
    fbqQueue: [['init', '123456789012345'], ['track', 'PageView']],
  }),
});

export const posthogFixture = createCrawlResult({
  html: `<script>
    posthog.init('project_123', { api_host: 'https://us.i.posthog.com' });
  </script>`,
  scripts: [
    `posthog.init('project_123', { api_host: 'https://us.i.posthog.com' });`,
  ],
  networkRequests: [
    createRequest('https://us.i.posthog.com/static/array.js'),
    createRequest('https://us.i.posthog.com/e/', 'fetch'),
  ],
});

export const consentModeV2Fixture = createCrawlResult({
  html: '<script>window.dataLayer = window.dataLayer || [];</script>',
  networkRequests: [
    createRequest('https://www.google-analytics.com/g/collect?v=2&gcs=G111&gcd=13r3r3r3', 'fetch'),
  ],
  windowObjects: createWindowObjects({
    hasGtag: true,
    hasDataLayer: true,
    dataLayerContent: [
      ['consent', 'default', {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      }],
      ['consent', 'update', {
        ad_storage: 'granted',
        analytics_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      }],
    ],
    consentModeCalls: [
      {
        source: 'gtag',
        args: ['consent', 'default', {
          ad_storage: 'denied',
          analytics_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        }],
      },
      {
        source: 'gtag',
        args: ['consent', 'update', {
          ad_storage: 'granted',
          analytics_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
        }],
      },
    ],
  }),
});

export const usercentricsBannerFixture = createCrawlResult({
  html: `
    <div id="usercentrics-root">
      <button>Alle akzeptieren</button>
      <button>Alle ablehnen</button>
      <button>Einstellungen</button>
      <a href="/datenschutz">Datenschutz</a>
    </div>
  `,
  networkRequests: [
    createRequest('https://app.usercentrics.eu/browser-ui/latest/loader.js'),
  ],
});
