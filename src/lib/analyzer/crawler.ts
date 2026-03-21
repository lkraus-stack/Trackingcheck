import type { Browser, Page, Frame, BrowserContext } from 'puppeteer-core';
import { getAnalyzerBrowserRuntime } from '@/lib/runtime/serverRuntime';

export interface CrawlResult {
  html: string;
  scripts: string[];
  networkRequests: NetworkRequest[];
  networkRequestsExtended: NetworkRequestExtended[];
  cookies: CookieData[];
  windowObjects: WindowObjectData;
  consoleMessages: string[];
  responseHeaders: ResponseHeaderData[];
  pageUrl: string;
  pageDomain: string;
  // Set-Cookie Headers aus Responses (für HttpOnly Cookies)
  setCookieHeaders?: Array<{ url: string; cookies: string[] }>;
  // Neue Cookie-Consent-Test-Daten
  cookieConsentTest?: CookieConsentTestData;
}

export interface CookieConsentTestData {
  pageDomain?: string;
  acceptNetworkRequests?: string[];
  beforeConsent: {
    cookies: CookieData[];
  };
  afterAccept: {
    cookies: CookieData[];
    clickSuccessful: boolean;
    buttonFound: boolean;
    buttonText?: string;
    consentSignals?: GoogleConsentSignals;
  };
  afterReject: {
    cookies: CookieData[];
    clickSuccessful: boolean;
    buttonFound: boolean;
    buttonText?: string;
  };
}

export interface AcceptOnlyTestResult {
  cookies: CookieData[];
  clickSuccessful: boolean;
  buttonFound: boolean;
  buttonText?: string;
  consentSignals?: GoogleConsentSignals;
}

export interface GoogleConsentSignals {
  dataLayerConsentDetected: boolean;
  gcsOrGcdRequests: number;
  parameterValues: Partial<Record<
    'ad_storage' | 'analytics_storage' | 'ad_user_data' | 'ad_personalization',
    'granted' | 'denied'
  >>;
}

export interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  timestamp: number;
}

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}

export interface WindowObjectData {
  hasGtag: boolean;
  hasDataLayer: boolean;
  hasTcfApi: boolean;
  hasFbq: boolean;
  hasFbEvents: boolean;
  hasTtq: boolean;
  hasLintrk: boolean;
  dataLayerContent?: unknown[];
  tcfApiResponse?: unknown;
  fbqQueue?: unknown[];
  /**
   * Runtime-Instrumentation (evaluateOnNewDocument) um Consent Mode zuverlässig zu erkennen,
   * auch wenn der Code in externen Scripts (z.B. GTM) steckt.
   */
  consentModeCalls?: Array<{
    source: 'gtag' | 'dataLayer' | 'gtag_stub' | 'unknown';
    args: unknown[];
  }>;
  gtagCalls?: unknown[][];
  dataLayerPushCalls?: unknown[][];
  // Zusätzliche Tracking-Objekte
  additionalTrackingObjects: {
    _fbq?: boolean;
    fbq?: boolean;
    _ttq?: boolean;
    ttq?: boolean;
    lintrk?: boolean;
    _linkedin_data_partner_ids?: unknown;
    snaptr?: boolean;
    pintrk?: boolean;
    twq?: boolean;
    clarity?: boolean;
    hj?: boolean;
  };
}

export interface ResponseHeaderData {
  url: string;
  headers: Record<string, string>;
  serverInfo?: string;
}

export interface NetworkRequestExtended extends NetworkRequest {
  responseHeaders?: Record<string, string>;
  initiator?: string;
  redirectChain?: string[];
}

type ConsentCallSource = 'gtag' | 'dataLayer' | 'gtag_stub' | 'unknown';

type RuntimeTrackingCheckerData = {
  consentModeCalls?: Array<{ source?: ConsentCallSource; args?: unknown[] }>;
  gtagCalls?: unknown[][];
  dataLayerPushCalls?: unknown[][];
};

type UsercentricsWindowApi = {
  isInitialized?: () => boolean;
  acceptAllConsents?: () => unknown;
};

type RealCookieBannerApi = {
  getOptions?: () => { groups?: unknown[] };
};

type CookiebotApi = {
  show?: () => unknown;
};

type OneTrustApi = {
  AllowAll?: () => unknown;
};

type BorlabsApi = {
  acceptAll?: () => unknown;
};

type GenericConsentApi = {
  consent?: () => unknown;
};

type WindowLikeRecord = Record<string, unknown> & {
  UC_UI?: UsercentricsWindowApi;
  __ucCmp?: unknown;
  CookieConsent?: { accept?: () => unknown };
  Cookiebot?: CookiebotApi;
  OnetrustActiveGroups?: unknown;
  consentApi?: GenericConsentApi;
  rcbConsentManager?: RealCookieBannerApi;
  realCookieBanner?: unknown;
  BorlabsCookie?: BorlabsApi;
  cmplz_banner?: unknown;
  OneTrust?: OneTrustApi;
  gtag?: unknown;
  dataLayer?: unknown;
  __trackingChecker?: RuntimeTrackingCheckerData;
};

type WrappedDataLayerArray = unknown[] & { __tcWrapped?: boolean };
type WrappedTrackingFunction = ((this: unknown, ...args: unknown[]) => unknown) & { __tcWrapped?: boolean };

const COMMON_BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
];

async function getBrowser(): Promise<Browser> {
  const runtime = getAnalyzerBrowserRuntime();

  if (runtime === 'serverless-chromium') {
    // Vercel/Serverless: Verwende @sparticuz/chromium
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require('@sparticuz/chromium');
    const puppeteerCore = (await import('puppeteer-core')).default;
    const args = Array.from(new Set([...chromium.args, ...COMMON_BROWSER_ARGS]));
    
    return puppeteerCore.launch({
      args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: { width: 1920, height: 1080 },
    }) as Promise<Browser>;
  } else {
    // Lokal: Verwende normales puppeteer
    const puppeteer = (await import('puppeteer')).default;
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined;
    return puppeteer.launch({
      headless: true,
      args: COMMON_BROWSER_ARGS,
      ...(executablePath ? { executablePath } : {}),
    }) as Promise<Browser>;
  }
}

export class WebCrawler {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    await this.ensureBrowser();
  }

  private isServerlessRuntime(): boolean {
    return getAnalyzerBrowserRuntime() === 'serverless-chromium';
  }

  private attachBrowserLifecycle(browser: Browser): void {
    const browserWithEvents = browser as unknown as {
      on?: (event: string, handler: () => void) => void;
    };

    browserWithEvents.on?.('disconnected', () => {
      if (this.browser === browser) {
        this.browser = null;
      }
    });
  }

  private isBrowserHealthy(): boolean {
    if (!this.browser) {
      return false;
    }

    const browserState = this.browser as unknown as {
      connected?: boolean;
      isConnected?: () => boolean;
    };

    if (typeof browserState.isConnected === 'function') {
      return browserState.isConnected();
    }

    if (typeof browserState.connected === 'boolean') {
      return browserState.connected;
    }

    return true;
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.isBrowserHealthy() && this.browser) {
      return this.browser;
    }

    await this.safeCloseBrowser();

    const browser = await getBrowser();
    this.browser = browser;
    this.attachBrowserLifecycle(browser);
    return browser;
  }

  async restartBrowser(): Promise<void> {
    await this.safeCloseBrowser();
    await this.ensureBrowser();
  }

  private async safeCloseBrowser(): Promise<void> {
    const browser = this.browser;
    this.browser = null;

    if (!browser) {
      return;
    }

    try {
      await browser.close();
    } catch {
      // Browser ist bereits geschlossen oder nicht mehr erreichbar
    }
  }

  private async waitForDocumentReady(page: Page, timeout: number): Promise<void> {
    await page
      .waitForFunction(() => document.readyState === 'interactive' || document.readyState === 'complete', {
        timeout,
      })
      .catch(() => null);
  }

  private async waitForNetworkIdleSafe(page: Page, timeout: number, idleTime = 800): Promise<void> {
    await page.waitForNetworkIdle({ timeout, idleTime }).catch(() => null);
  }

  private async waitForPageSignals(
    page: Page,
    options?: {
      timeout?: number;
      includeConsentSignals?: boolean;
    }
  ): Promise<void> {
    const timeout = options?.timeout ?? 5000;
    const includeConsentSignals = options?.includeConsentSignals ?? true;

    const tasks: Promise<unknown>[] = [
      this.waitForDocumentReady(page, Math.min(timeout, 2500)),
      this.waitForNetworkIdleSafe(page, Math.min(timeout, 4000)),
      this.waitForTrackingObjects(page, Math.min(timeout, 3000)),
    ];

    if (includeConsentSignals) {
      tasks.push(this.waitForConsentBanner(page, Math.min(timeout, 3500)));
    }

    await Promise.allSettled(tasks);
  }

  private async gotoAndStabilize(
    page: Page,
    url: string,
    options?: {
      navigationTimeout?: number;
      settleTimeout?: number;
      includeConsentSignals?: boolean;
    }
  ): Promise<void> {
    const navigationTimeout = options?.navigationTimeout ?? 25000;

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: navigationTimeout,
      });
    } catch (error) {
      if (this.shouldRetryWithHttp(error, url)) {
        const httpUrl = url.replace(/^https:/i, 'http:');
        await page.goto(httpUrl, {
          waitUntil: 'domcontentloaded',
          timeout: navigationTimeout,
        });
      } else {
        throw error;
      }
    }

    await this.waitForPageSignals(page, {
      timeout: options?.settleTimeout ?? 5000,
      includeConsentSignals: options?.includeConsentSignals,
    });
  }

  private shouldRetryWithHttp(error: unknown, url: string): boolean {
    if (!/^https:/i.test(url)) {
      return false;
    }

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      message.includes('err_ssl') ||
      message.includes('ssl protocol error') ||
      message.includes('certificate') ||
      message.includes('net::err_cert')
    );
  }

  // Quick-Crawl für schnellere Analyse (ohne Consent-Test, kürzere Wartezeiten)
  async crawlQuick(url: string): Promise<CrawlResult> {
    const browser = await this.ensureBrowser();
    const page = await browser.newPage();
    const urlObj = new URL(url);
    const pageDomain = urlObj.hostname;
    
    const networkRequests: NetworkRequest[] = [];
    const networkRequestsExtended: NetworkRequestExtended[] = [];
    const responseHeaders: ResponseHeaderData[] = [];
    const consoleMessages: string[] = [];

    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
      });
    });

    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    await this.setupPage(page);

    try {
      await this.gotoAndStabilize(page, url, {
        navigationTimeout: 15000,
        settleTimeout: 2500,
        includeConsentSignals: false,
      });

      const html = await page.content();

      const scripts = await page.evaluate(() => {
        const scriptElements = document.querySelectorAll('script');
        const scripts: string[] = [];
        scriptElements.forEach((script) => {
          if (script.src) scripts.push(script.src);
          if (script.innerHTML) scripts.push(script.innerHTML);
        });
        return scripts;
      });

      const windowObjects = await this.checkWindowObjects(page);

      const cookies = await page.cookies();
      const cookieData: CookieData[] = cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly ?? false,
        secure: cookie.secure,
        sameSite: cookie.sameSite as string | undefined,
      }));

      const finalPageUrl = page.url();
      const finalPageDomain = new URL(finalPageUrl).hostname;

      return {
        html,
        scripts,
        networkRequests,
        networkRequestsExtended,
        cookies: cookieData,
        windowObjects,
        consoleMessages,
        responseHeaders,
        pageUrl: finalPageUrl,
        pageDomain: finalPageDomain || pageDomain,
      };
    } finally {
      await page.close();
    }
  }

  async crawl(url: string): Promise<CrawlResult> {
    const browser = await this.ensureBrowser();
    const page = await browser.newPage();
    await this.setupPage(page);
    
    // URL und Domain extrahieren
    const urlObj = new URL(url);
    const pageDomain = urlObj.hostname;
    
    // Sammle Daten
    const networkRequests: NetworkRequest[] = [];
    const networkRequestsExtended: NetworkRequestExtended[] = [];
    const responseHeaders: ResponseHeaderData[] = [];
    const consoleMessages: string[] = [];

    // Network Request Listener - erweitert für mehr Details
    page.on('request', (request) => {
      const requestData: NetworkRequest = {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
      };
      networkRequests.push(requestData);
      
      // Erweiterte Request-Daten
      const extendedData: NetworkRequestExtended = {
        ...requestData,
        initiator: request.initiator()?.type,
        redirectChain: request.redirectChain().map(r => r.url()),
      };
      networkRequestsExtended.push(extendedData);
    });

    // Set-Cookie Header aus Responses sammeln (für HttpOnly Cookies)
    const setCookieHeaders: Array<{ url: string; cookies: string[] }> = [];
    
    // Response Listener für Header-Analyse (wichtig für Server-Side Tracking + Cookies)
    page.on('response', async (response) => {
      try {
        const headers = response.headers();
        const responseUrl = response.url();
        
        // Set-Cookie Headers erfassen (wichtig für HttpOnly Cookies die sonst nicht sichtbar sind)
        const setCookie = headers['set-cookie'];
        if (setCookie) {
          setCookieHeaders.push({
            url: responseUrl,
            cookies: Array.isArray(setCookie) ? setCookie : [setCookie],
          });
        }
        
        // Sammle wichtige Response-Headers für Tracking-Analyse
        if (this.isTrackingRelatedUrl(responseUrl)) {
          responseHeaders.push({
            url: responseUrl,
            headers: headers,
            serverInfo: headers['server'] || headers['x-powered-by'],
          });
        }
      } catch {
        // Response Header Fehler ignorieren
      }
    });

    // Console Message Listener
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    try {
      await this.gotoAndStabilize(page, url, {
        navigationTimeout: 25000,
        settleTimeout: 6000,
        includeConsentSignals: true,
      });

      // HTML Content (nach allen Wartezeiten für dynamisch injizierte Scripts)
      const html = await page.content();

      // Alle Script-Tags sammeln - erweitert
      const scripts = await page.evaluate(() => {
        const scriptElements = document.querySelectorAll('script');
        const scripts: string[] = [];
        
        scriptElements.forEach((script) => {
          // Script-Src
          if (script.src) {
            scripts.push(script.src);
          }
          // Inline-Script Inhalt
          if (script.innerHTML) {
            scripts.push(script.innerHTML);
          }
        });
        
        // Auch dynamisch erstellte Scripts im DOM erfassen
        const allScripts = document.getElementsByTagName('script');
        Array.from(allScripts).forEach((script) => {
          if (script.src && !scripts.includes(script.src)) {
            scripts.push(script.src);
          }
        });
        
        return scripts;
      });

      // Window Objects prüfen - erweitert
      const windowObjects = await this.checkWindowObjects(page);

      // Cookies sammeln
      const cookies = await page.cookies();
      const cookieData: CookieData[] = cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly ?? false,
        secure: cookie.secure,
        sameSite: cookie.sameSite as string | undefined,
      }));

      const finalPageUrl = page.url();
      const finalPageDomain = new URL(finalPageUrl).hostname;

      return {
        html,
        scripts,
        networkRequests,
        networkRequestsExtended,
        cookies: cookieData,
        windowObjects,
        consoleMessages,
        responseHeaders,
        setCookieHeaders,
        pageUrl: finalPageUrl,
        pageDomain: finalPageDomain || pageDomain,
      };
    } finally {
      await page.close();
    }
  }

  private isTrackingRelatedUrl(url: string): boolean {
    const trackingPatterns = [
      'googletagmanager.com',
      'google-analytics.com',
      'analytics.google.com',
      'facebook.com',
      'facebook.net',
      'connect.facebook',
      'linkedin.com',
      'licdn.com',
      'tiktok.com',
      'analytics.tiktok',
      'doubleclick.net',
      'googlesyndication.com',
      '/gtm',
      '/collect',
      '/tr',
      '/pixel',
      '/events',
      '/conversion',
    ];
    
    const urlLower = url.toLowerCase();
    return trackingPatterns.some(pattern => urlLower.includes(pattern));
  }

  private async waitForTrackingObjects(page: Page, timeout: number): Promise<void> {
    await page.waitForFunction(() => {
      const win = window as unknown as Record<string, unknown> & {
        __trackingChecker?: {
          dataLayerPushCalls?: unknown[][];
          consentModeCalls?: Array<{ args?: unknown[] }>;
        };
      };

      return (
        typeof win.fbq === 'function' ||
        typeof win.gtag === 'function' ||
        typeof win.ttq === 'object' ||
        typeof win.lintrk === 'function' ||
        typeof win.snaptr === 'function' ||
        typeof win.pintrk === 'function' ||
        typeof win.twq === 'function' ||
        (Array.isArray(win.dataLayer) && win.dataLayer.length > 0) ||
        Boolean(win.__trackingChecker?.dataLayerPushCalls?.length) ||
        Boolean(win.__trackingChecker?.consentModeCalls?.length)
      );
    }, {
      timeout,
      polling: 200,
    }).catch(() => null);
  }

  private async checkWindowObjects(page: Page): Promise<WindowObjectData> {
    return await page.evaluate(() => {
      const win = window as unknown as Record<string, unknown>;
      
      const result: WindowObjectData = {
        hasGtag: typeof win.gtag === 'function',
        hasDataLayer: Array.isArray(win.dataLayer),
        hasTcfApi: typeof win.__tcfapi === 'function',
        hasFbq: typeof win.fbq === 'function',
        hasFbEvents: typeof win._fbq !== 'undefined' || typeof win.fbevents !== 'undefined',
        hasTtq: typeof win.ttq === 'object' || typeof win._ttq !== 'undefined',
        hasLintrk: typeof win.lintrk === 'function' || typeof win._linkedin_data_partner_ids !== 'undefined',
        additionalTrackingObjects: {
          _fbq: typeof win._fbq !== 'undefined',
          fbq: typeof win.fbq === 'function',
          _ttq: typeof win._ttq !== 'undefined',
          ttq: typeof win.ttq === 'object',
          lintrk: typeof win.lintrk === 'function',
          _linkedin_data_partner_ids: win._linkedin_data_partner_ids,
          snaptr: typeof win.snaptr === 'function',
          pintrk: typeof win.pintrk === 'function',
          twq: typeof win.twq === 'function',
          clarity: typeof win.clarity === 'function',
          hj: typeof win.hj === 'function',
        },
      };

      // DataLayer Inhalt - erweitert auf mehr Einträge
      if (result.hasDataLayer && Array.isArray(win.dataLayer)) {
        result.dataLayerContent = (win.dataLayer as unknown[]).slice(0, 50); // Mehr Einträge für bessere Analyse
      }

      // Runtime Instrumentation Logs (falls vorhanden)
      try {
        const tc = (win as WindowLikeRecord).__trackingChecker;
        if (tc) {
          if (Array.isArray(tc.gtagCalls)) {
            result.gtagCalls = tc.gtagCalls.slice(0, 200);
          }
          if (Array.isArray(tc.dataLayerPushCalls)) {
            result.dataLayerPushCalls = tc.dataLayerPushCalls.slice(0, 200);
          }
          if (Array.isArray(tc.consentModeCalls)) {
            result.consentModeCalls = tc.consentModeCalls
              .filter((c) => Array.isArray(c?.args) && (c.args as unknown[]).length > 0)
              .slice(0, 200)
              .map((c) => ({
                source:
                  c?.source === 'gtag' || c?.source === 'dataLayer' || c?.source === 'gtag_stub'
                    ? c.source
                    : 'unknown',
                args: c.args as unknown[],
              }));
          }
        }
      } catch {
        // Instrumentation nicht verfügbar
      }

      // fbq Queue für Pixel-ID Erkennung
      if (result.hasFbq && typeof win.fbq === 'function') {
        try {
          const fbqObj = win.fbq as unknown as { queue?: unknown[]; getState?: () => unknown };
          if (fbqObj.queue) {
            result.fbqQueue = fbqObj.queue.slice(0, 20);
          }
          // Versuche Pixel-IDs aus dem fbq State zu extrahieren
          if (typeof fbqObj.getState === 'function') {
            const state = fbqObj.getState();
            if (state) {
              result.fbqQueue = result.fbqQueue || [];
              result.fbqQueue.push({ state });
            }
          }
        } catch {
          // fbq Queue nicht verfügbar
        }
      }

      // TCF API Response
      if (result.hasTcfApi) {
        try {
          (win.__tcfapi as (cmd: string, version: number, callback: (data: unknown) => void) => void)(
            'getTCData',
            2,
            (tcData) => {
              result.tcfApiResponse = tcData;
            }
          );
        } catch {
          // TCF API Aufruf fehlgeschlagen
        }
      }

      return result;
    });
  }

  private async createIsolatedContext(): Promise<BrowserContext | null> {
    if (this.isServerlessRuntime()) {
      return null;
    }

    const browser = await this.ensureBrowser();
    const browserAny = browser as unknown as {
      createBrowserContext?: () => Promise<BrowserContext>;
      createIncognitoBrowserContext?: () => Promise<BrowserContext>;
    };
    if (typeof browserAny.createBrowserContext === 'function') {
      return await browserAny.createBrowserContext();
    }
    if (typeof browserAny.createIncognitoBrowserContext === 'function') {
      return await browserAny.createIncognitoBrowserContext();
    }
    return null;
  }

  private async safeClosePage(page: Page | null | undefined): Promise<void> {
    if (!page) return;
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch {
      // Ignorieren - Page ist bereits geschlossen
    }
  }

  private async safeCloseContext(context: BrowserContext | null | undefined): Promise<void> {
    if (!context) return;
    try {
      await context.close();
    } catch {
      // Ignorieren - Context ist bereits geschlossen
    }
  }

  private getSearchContexts(page: Page): Array<Page | Frame> {
    const mainFrame = page.mainFrame();
    const frames = page.frames().filter(frame => frame !== mainFrame);
    return [page, ...frames];
  }

  private async waitForConsentBanner(page: Page, timeout = 4000): Promise<void> {
    const bannerSelectors = [
      // Usercentrics - erweitert
      '#usercentrics-root',
      '#uc-center-container',
      '#uc-ui-container',
      '.uc-root',
      '.uc-banner',
      '.uc-overlay',
      '[data-testid="uc-banner"]',
      '[data-testid="uc-first-layer"]',
      '[data-testid="uc-banner-content"]',
      '.sc-eCApnc', // Usercentrics styled-components
      '.sc-furwcr', // Weitere Usercentrics Klassen
      'div[class*="uc-"][class*="banner"]',

      // OneTrust
      '#onetrust-banner-sdk',
      '#onetrust-consent-sdk',
      '#onetrust-pc-sdk',
      '.ot-sdk-container',

      // Cookiebot
      '#CybotCookiebotDialog',
      '#CybotCookiebotDialogBody',
      '.CybotCookiebotDialog',

      // Didomi
      '#didomi-notice',
      '#didomi-popup',

      // Klaro
      '#klaro',
      '.klaro',

      // Real Cookie Banner - erweitert
      '#real-cookie-banner',
      '.real-cookie-banner',
      '#rcb-consent',
      '.rcb-consent',
      '.rcb-banner',
      '[data-rcb-root]',
      '[data-rcb-consent]',
      '.rcb-content',
      '.rcb-modal',
      'div[class*="rcb-"]',
      // Real Cookie Banner WordPress: iframe oder Shadow DOM
      'div[id*="real-cookie-banner"]',

      // Borlabs
      '#BorlabsCookieBox',
      '.borlabs-cookie',

      // Complianz
      '#cmplz-cookiebanner-container',
      '.cmplz-cookiebanner',

      // Generic
      '[id*="cookie-consent"]',
      '[class*="cookie-consent"]',
      '[id*="cookie-banner"]',
      '[class*="cookie-banner"]',
      '[id*="cookie-notice"]',
      '[class*="cookie-notice"]',
      '[aria-modal="true"]',
      '[role="dialog"]',
      '[role="alertdialog"]',
    ];

    const selectorTimeout = Math.max(1000, Math.min(timeout, 3500));
    const waits: Promise<unknown>[] = bannerSelectors.map(selector =>
      page.waitForSelector(selector, { timeout: selectorTimeout, visible: true }).catch(() => null)
    );
    
    // Warten auf CMP JavaScript APIs
    waits.push(
      page.waitForFunction(() => {
        const win = window as unknown as WindowLikeRecord;
        const uc = win.UC_UI;
        const ucReady = uc && typeof uc.isInitialized === 'function' ? uc.isInitialized() : Boolean(uc);
        return Boolean(
          ucReady ||
          win.__ucCmp ||
          win.CookieConsent ||
          win.Cookiebot ||
          win.OnetrustActiveGroups ||
          win.consentApi ||
          win.rcbConsentManager ||
          win.realCookieBanner ||
          win.BorlabsCookie ||
          win.cmplz_banner
        );
      }, { timeout: Math.max(1200, Math.min(timeout, 4000)) }).catch(() => null)
    );

    // Zusätzlich: Warten auf sichtbare Banner-Elemente im Shadow DOM
    waits.push(
      page.waitForFunction(() => {
        // Suche nach Shadow DOM Elementen
        const shadowHosts = document.querySelectorAll('[id*="usercentrics"], [id*="cookie"], [id*="consent"]');
        for (const host of shadowHosts) {
          const shadow = (host as HTMLElement).shadowRoot;
          if (shadow) {
            const buttons = shadow.querySelectorAll('button');
            if (buttons.length > 0) return true;
          }
        }
        return false;
      }, { timeout: Math.max(1000, Math.min(timeout, 3000)) }).catch(() => null)
    );

    await Promise.allSettled(waits);
  }

  private async waitForCmpApi(page: Page, timeout = 4000): Promise<void> {
    // Erweiterte CMP-API Erkennung mit mehreren Versuchen
    const maxAttempts = 3;
    const delayMs = Math.max(250, Math.floor(timeout / (maxAttempts + 1)));
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiReady = await page.evaluate(() => {
        const win = window as unknown as WindowLikeRecord;
        
        // Usercentrics prüfen
        const uc = win.UC_UI;
        if (uc) {
          if (typeof uc.isInitialized === 'function') {
            if (uc.isInitialized()) return { ready: true, cmp: 'usercentrics' };
          } else if (typeof uc.acceptAllConsents === 'function') {
            // UC_UI existiert und hat Methoden - wahrscheinlich ready
            return { ready: true, cmp: 'usercentrics' };
          }
        }
        if (win.__ucCmp) return { ready: true, cmp: 'usercentrics_alt' };
        
        // Real Cookie Banner prüfen
        if (win.consentApi && typeof win.consentApi.consent === 'function') {
          return { ready: true, cmp: 'real_cookie_banner' };
        }
        if (win.rcbConsentManager && typeof win.rcbConsentManager.getOptions === 'function') {
          const groups = win.rcbConsentManager.getOptions()?.groups;
          if (Array.isArray(groups) && groups.length > 0) {
            return { ready: true, cmp: 'real_cookie_banner' };
          }
        }
        
        // Cookiebot prüfen
        if (win.Cookiebot && typeof win.Cookiebot.show === 'function') {
          return { ready: true, cmp: 'cookiebot' };
        }
        
        // OneTrust prüfen
        if (win.OneTrust && typeof win.OneTrust.AllowAll === 'function') {
          return { ready: true, cmp: 'onetrust' };
        }
        
        // Borlabs prüfen
        if (win.BorlabsCookie && typeof win.BorlabsCookie.acceptAll === 'function') {
          return { ready: true, cmp: 'borlabs' };
        }
        
        // Generisches CookieConsent prüfen
        if (win.CookieConsent && typeof win.CookieConsent.accept === 'function') {
          return { ready: true, cmp: 'generic' };
        }
        
        return { ready: false, cmp: null };
      });
      
      if (apiReady.ready) {
        return;
      }
      
      // Kurz warten und erneut versuchen
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    // Fallback: Warten auf irgendein CMP-Zeichen
    await page.waitForFunction(() => {
      const win = window as unknown as WindowLikeRecord;
      return Boolean(
        win.UC_UI ||
        win.__ucCmp ||
        win.CookieConsent ||
        win.Cookiebot ||
        win.OneTrust ||
        win.consentApi ||
        win.rcbConsentManager ||
        win.BorlabsCookie ||
        win.cmplz_banner
      );
    }, { timeout }).catch(() => null);
  }

  private async tryClickSelectors(
    context: Page | Frame,
    selectors: string[],
    textPatterns: string[]
  ): Promise<{ found: boolean; clicked: boolean; buttonText?: string }> {
    for (const selector of selectors) {
      try {
        if (selector.includes(':has-text')) {
          const textMatch = selector.match(/:has-text\("([^"]+)"\)/);
          if (textMatch) {
            const searchText = textMatch[1].toLowerCase();
            const tagType = selector.split(':')[0];

            const result = await context.evaluate((tag, text) => {
              const elements = document.querySelectorAll(tag);
              for (const el of elements) {
                const textContent = el.textContent?.toLowerCase() || '';
                const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
                const title = el.getAttribute('title')?.toLowerCase() || '';
                const value = (el as HTMLInputElement).value?.toLowerCase() || '';
                const combinedText = `${textContent} ${ariaLabel} ${title} ${value}`;

                if (combinedText.includes(text.toLowerCase())) {
                  (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
                  (el as HTMLElement).click();
                  const label = el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || (el as HTMLInputElement).value;
                  return { found: true, text: label?.trim() };
                }
              }
              return { found: false };
            }, tagType, searchText);

            if (result.found) {
              await new Promise(resolve => setTimeout(resolve, 1500));
              return { found: true, clicked: true, buttonText: result.text };
            }
          }
        } else {
          const element = await context.$(selector);
          if (element) {
            const box = await element.boundingBox();
            if (box && box.width > 0 && box.height > 0) {
              await element.evaluate(el => (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' }));
              const buttonText = await element.evaluate(el =>
                (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || (el as HTMLInputElement).value || '').trim()
              );
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 1500));
              return { found: true, clicked: true, buttonText: buttonText || undefined };
            }
          }
        }
      } catch {
        // Selector fehlgeschlagen, nächsten versuchen
      }
    }

    return this.deepSearchAndClick(context, textPatterns);
  }

  private async tryClickWithRetries(
    page: Page,
    selectors: string[],
    textPatterns: string[],
    attempts = 3,
    delayMs = 800
  ): Promise<{ found: boolean; clicked: boolean; buttonText?: string }> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const contexts = this.getSearchContexts(page);
      for (const context of contexts) {
        const result = await this.tryClickSelectors(context, selectors, textPatterns);
        if (result.found) {
          return result;
        }
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return { found: false, clicked: false };
  }

  private async deepSearchAndClick(
    context: Page | Frame,
    patterns: string[]
  ): Promise<{ found: boolean; clicked: boolean; buttonText?: string }> {
    try {
      const result = await context.evaluate((patternsLower: string[]) => {
        const selectors = 'button, a, div, span, a[role="button"], [role="button"], input[type="button"], input[type="submit"], label';
        const lowered = patternsLower.map(p => p.toLowerCase());

        // Rekursive Shadow DOM Suche mit erhöhter maximaler Tiefe für komplexe CMPs
        const collectElements = (root: Document | ShadowRoot, depth = 0, maxDepth = 10): Element[] => {
          if (depth > maxDepth) return [];
          
          const elements = Array.from(root.querySelectorAll(selectors));
          const all = Array.from(root.querySelectorAll('*'));

          for (const el of all) {
            const shadow = (el as HTMLElement).shadowRoot;
            if (shadow) {
              elements.push(...collectElements(shadow, depth + 1, maxDepth));
            }
            // Auch in iframes suchen (wenn same-origin)
            if (el.tagName === 'IFRAME') {
              try {
                const iframeDoc = (el as HTMLIFrameElement).contentDocument;
                if (iframeDoc) {
                  elements.push(...collectElements(iframeDoc, depth + 1, maxDepth));
                }
              } catch {
                // Cross-origin iframe ignorieren
              }
            }
          }

          return elements;
        };

        const candidates = collectElements(document);

        // Sortiere Kandidaten: Buttons zuerst, dann nach Größe
        const sortedCandidates = candidates.sort((a, b) => {
          const aIsButton = a.tagName === 'BUTTON' || a.getAttribute('role') === 'button';
          const bIsButton = b.tagName === 'BUTTON' || b.getAttribute('role') === 'button';
          if (aIsButton && !bIsButton) return -1;
          if (!aIsButton && bIsButton) return 1;
          
          const aRect = (a as HTMLElement).getBoundingClientRect();
          const bRect = (b as HTMLElement).getBoundingClientRect();
          return (bRect.width * bRect.height) - (aRect.width * aRect.height);
        });

        for (const el of sortedCandidates) {
          const text = el.textContent?.toLowerCase().trim() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          const title = el.getAttribute('title')?.toLowerCase() || '';
          const value = (el as HTMLInputElement).value?.toLowerCase() || '';
          const dataTestId = el.getAttribute('data-testid')?.toLowerCase() || '';
          const dataQa = el.getAttribute('data-qa')?.toLowerCase() || '';
          const dataAction = el.getAttribute('data-action')?.toLowerCase() || '';
          const dataConsent = el.getAttribute('data-consent')?.toLowerCase() || '';
          const id = el.id?.toLowerCase() || '';
          const className = el.className?.toString?.()?.toLowerCase() || '';

          const combinedText = `${text} ${ariaLabel} ${title} ${value} ${dataTestId} ${dataQa} ${dataAction} ${dataConsent} ${id} ${className}`;

          for (const pattern of lowered) {
            if (combinedText.includes(pattern)) {
              const rect = (el as HTMLElement).getBoundingClientRect();
              const style = window.getComputedStyle(el as HTMLElement);
              
              // Verbesserte Sichtbarkeitsprüfung
              const isVisible = rect.width > 0 && 
                               rect.height > 0 && 
                               style.display !== 'none' && 
                               style.visibility !== 'hidden' &&
                               style.opacity !== '0' &&
                               rect.top < window.innerHeight &&
                               rect.bottom > 0;
              
              if (isVisible) {
                (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
                
                // Mehrfache Click-Methoden versuchen
                try {
                  (el as HTMLElement).focus();
                (el as HTMLElement).click();
                  
                  // Fallback: MouseEvent dispatchen
                  const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                  });
                  el.dispatchEvent(clickEvent);
                } catch {
                  (el as HTMLElement).click();
                }
                
                const label = el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || (el as HTMLInputElement).value;
                return { found: true, text: label?.trim()?.substring(0, 100) };
              }
            }
          }
        }

        return { found: false };
      }, patterns);

      if (result.found) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { found: true, clicked: true, buttonText: result.text };
      }
    } catch {
      // Fallback fehlgeschlagen
    }

    return { found: false, clicked: false };
  }

  private async applyCmpConsentViaApi(
    page: Page,
    action: 'accept' | 'reject' | 'essential'
  ): Promise<{ applied: boolean; method?: string }> {
    try {
      // WICHTIG: Verwende String-basierte Evaluation um __name Kompilierungsproblem zu vermeiden
      const jsCode = `
        (function(action) {
          var win = window;
          var method;
          
          // Helper function
          function tryCallMethod(obj, methodNames) {
            for (var i = 0; i < methodNames.length; i++) {
              var methodName = methodNames[i];
              var fn = obj && obj[methodName];
            if (typeof fn === 'function') {
              try {
                  fn.call(obj);
                  return methodName;
                } catch (e) {
                // ignore
              }
            }
          }
          return undefined;
          }
          
          // USERCENTRICS API
          if (win.UC_UI) {
            var isReady = typeof win.UC_UI.isInitialized === 'function' ? win.UC_UI.isInitialized() : true;
            
            if (!isReady && typeof win.UC_UI.showFirstLayer === 'function') {
              try { win.UC_UI.showFirstLayer(); } catch(e) {}
            }
            
            if (action === 'accept') {
              if (typeof win.UC_UI.acceptAllConsents === 'function') {
                win.UC_UI.acceptAllConsents();
                method = 'UC_UI.acceptAllConsents';
              } else if (typeof win.UC_UI.acceptAll === 'function') {
                win.UC_UI.acceptAll();
                method = 'UC_UI.acceptAll';
              }
            } else {
              if (typeof win.UC_UI.denyAllConsents === 'function') {
                win.UC_UI.denyAllConsents();
                method = 'UC_UI.denyAllConsents';
              } else if (typeof win.UC_UI.rejectAll === 'function') {
                win.UC_UI.rejectAll();
                method = 'UC_UI.rejectAll';
              } else if (typeof win.UC_UI.denyAll === 'function') {
                win.UC_UI.denyAll();
                method = 'UC_UI.denyAll';
              }
            }
            
            if (method) {
              try {
                if (typeof win.UC_UI.saveConsents === 'function') win.UC_UI.saveConsents();
                if (typeof win.UC_UI.closeCMP === 'function') win.UC_UI.closeCMP();
              } catch(e) {}
            }
          }
          
          // Usercentrics alternative API (__ucCmp)
          if (!method && win.__ucCmp) {
            if (action === 'accept') {
              var m = tryCallMethod(win.__ucCmp, ['acceptAllConsents', 'acceptAll']);
              if (m) method = '__ucCmp.' + m;
            } else {
              var m = tryCallMethod(win.__ucCmp, ['denyAllConsents', 'denyAll', 'rejectAllConsents', 'rejectAll']);
              if (m) method = '__ucCmp.' + m;
            }
          }
          
          // REAL COOKIE BANNER API
          if (!method && win.consentApi) {
            var rcbManager = win.rcbConsentManager;
            var options = rcbManager && rcbManager.getOptions ? rcbManager.getOptions() : null;
            var groups = (options && options.groups) || [];
            
            var allItemIds = [];
            var essentialItemIds = [];
            
            for (var i = 0; i < groups.length; i++) {
              var g = groups[i];
              if (g && g.items) {
                for (var j = 0; j < g.items.length; j++) {
                  var item = g.items[j];
                  if (item && item.id !== undefined) {
                    allItemIds.push(item.id);
                    if (g.isEssential) {
                      essentialItemIds.push(item.id);
                    }
                  }
                }
              }
            }
            
            if (action === 'accept') {
              if (typeof win.consentApi.consent === 'function' && allItemIds.length > 0) {
                var successCount = 0;
                for (var k = 0; k < allItemIds.length; k++) {
                  try {
                    win.consentApi.consent(allItemIds[k]);
                    successCount++;
                  } catch(e) {}
                }
                if (successCount > 0) {
                  method = 'consentApi.consent (' + successCount + ' items)';
                }
              }
            } else {
              if (typeof win.consentApi.consent === 'function' && essentialItemIds.length > 0) {
                for (var k = 0; k < essentialItemIds.length; k++) {
                  try {
                    win.consentApi.consent(essentialItemIds[k]);
                  } catch(e) {}
                }
                method = 'consentApi.consent (essential only, ' + essentialItemIds.length + ' items)';
              }
            }
          }
          
          // COOKIEBOT API
          if (!method && win.Cookiebot) {
            if (action === 'accept') {
              if (typeof win.Cookiebot.submitCustomConsent === 'function') {
                win.Cookiebot.submitCustomConsent(true, true, true);
                method = 'Cookiebot.submitCustomConsent';
              } else {
                var m = tryCallMethod(win.Cookiebot, ['acceptAll', 'accept']);
                if (m) method = 'Cookiebot.' + m;
              }
            } else {
              if (typeof win.Cookiebot.submitCustomConsent === 'function') {
                win.Cookiebot.submitCustomConsent(false, false, false);
                method = 'Cookiebot.submitCustomConsent (deny)';
              } else {
                var m = tryCallMethod(win.Cookiebot, ['decline', 'reject', 'denyAll']);
                if (m) method = 'Cookiebot.' + m;
              }
            }
          }
          
          // ONETRUST API
          if (!method && win.OneTrust) {
            if (action === 'accept') {
              var m = tryCallMethod(win.OneTrust, ['AllowAll', 'acceptAll']);
              if (m) method = 'OneTrust.' + m;
            } else {
              var m = tryCallMethod(win.OneTrust, ['RejectAll', 'rejectAll']);
              if (m) method = 'OneTrust.' + m;
            }
          }
          
          // BORLABS COOKIE API
          if (!method && win.BorlabsCookie) {
            if (action === 'accept') {
              var m = tryCallMethod(win.BorlabsCookie, ['acceptAll', 'allowAll']);
              if (m) method = 'BorlabsCookie.' + m;
            } else {
              var m = tryCallMethod(win.BorlabsCookie, ['denyAll', 'declineAll', 'rejectAll']);
              if (m) method = 'BorlabsCookie.' + m;
            }
          }
          
          // GENERIC CookieConsent API
          if (!method && win.CookieConsent) {
            if (action === 'accept') {
              var m = tryCallMethod(win.CookieConsent, ['acceptAll', 'accept', 'allowAll']);
              if (m) method = 'CookieConsent.' + m;
            } else {
              var m = tryCallMethod(win.CookieConsent, ['rejectAll', 'denyAll', 'reject', 'decline']);
              if (m) method = 'CookieConsent.' + m;
            }
          }
          
          return { applied: !!method, method: method };
        })('${action}')
      `;
      
      const result = await page.evaluate(jsCode) as { applied: boolean; method?: string };

      // Warten nach API-Aufruf
      if (result.applied) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      return result;
    } catch {
      return { applied: false };
    }
  }

  private async findAndClickSettingsButton(
    page: Page
  ): Promise<{ found: boolean; clicked: boolean; buttonText?: string }> {
    const settingsSelectors = [
      // Allgemeine Patterns
      'button[id*="settings"]',
      'button[class*="settings"]',
      'button[id*="preferences"]',
      'button[class*="preferences"]',
      'button[id*="manage"]',
      'button[class*="manage"]',
      'a[id*="settings"]',
      'a[class*="settings"]',
      '[data-action*="settings"]',
      '[data-consent*="settings"]',
      '[data-action*="preferences"]',
      '[data-consent*="preferences"]',
      '[data-action*="manage"]',

      // Texte
      'button:has-text("Einstellungen")',
      'button:has-text("Cookie-Einstellungen")',
      'button:has-text("Datenschutzeinstellungen")',
      'button:has-text("Datenschutz-Einstellungen")',
      'button:has-text("Datenschutz-Einstellungen ändern")',
      'button:has-text("Privatsphäre-Einstellungen")',
      'button:has-text("Privatsphäre-Einstellungen ändern")',
      'button:has-text("Präferenzen")',
      'button:has-text("Anpassen")',
      'button:has-text("Optionen")',
      'button:has-text("Mehr Optionen")',
      'button:has-text("Mehr Details")',
      'button:has-text("Privacy Settings")',
      'button:has-text("Privacy Center")',
      'button:has-text("Customize")',
      'button:has-text("Preferences")',
      'button:has-text("Settings")',
      'button:has-text("Manage")',

      // OneTrust
      '#onetrust-pc-btn-handler',
      '.ot-sdk-show-settings',

      // Usercentrics
      '.uc-btn-settings',
      '.uc-settings-button',
      '.uc-btn-manage',
      '.uc-manage-settings',
      '.uc-btn-open-details',
      '[data-testid="uc-open-details-button"]',
      '[data-testid="uc-settings-button"]',

      // Real Cookie Banner
      '.rcb-btn-settings',
      '.rcb-settings',
      '.rcb-btn-customize',
      '#rcb-consent-settings',
      '[data-rcb-action="settings"]',
      
      // CookieYes
      '.cky-btn-customize',
      '#cky-btn-customize',
      '.cky-preference-btn-wrapper button',
      
      // Osano
      '.osano-cm-manage',
      '.osano-cm-link--privacy-settings',
    ];

    const settingsPatterns = [
      'einstellungen',
      'cookie-einstellungen',
      'datenschutzeinstellungen',
      'datenschutz-einstellungen',
      'privatsphäre-einstellungen',
      'privatsphaere-einstellungen',
      'präferenzen',
      'anpassen',
      'optionen',
      'more options',
      'more details',
      'privacy settings',
      'privacy center',
      'customize',
      'preferences',
      'settings',
      'manage',
    ];

    return this.tryClickWithRetries(page, settingsSelectors, settingsPatterns);
  }

  private async findAndClickEssentialOnlyButton(
    page: Page
  ): Promise<{ found: boolean; clicked: boolean; buttonText?: string }> {
    const essentialSelectors = [
      'button:has-text("Nur notwendige")',
      'button:has-text("Nur essenzielle")',
      'button:has-text("Nur essenziell")',
      'button:has-text("Nur erforderliche")',
      'button:has-text("Nur technisch")',
      'button:has-text("Nur funktional")',
      'button:has-text("Only essential")',
      'button:has-text("Only necessary")',
      'button:has-text("Essential only")',
      'button:has-text("Necessary only")',
      '.uc-btn-deny',
      '.uc-deny-all',
      '.rcb-btn-essential',
      '.rcb-btn-necessary',
      '[data-rcb-action="accept-essential"]',
      '[data-rcb-action="accept-necessary"]',
      '[data-rcb-action="essential"]',
      '[data-rcb-action="necessary"]',
    ];

    const essentialPatterns = [
      'nur notwendige',
      'nur essenzielle',
      'nur essenziell',
      'nur erforderliche',
      'nur technisch',
      'nur funktional',
      'only essential',
      'only necessary',
      'essential only',
      'necessary only',
      'technical only',
    ];

    return this.tryClickWithRetries(page, essentialSelectors, essentialPatterns);
  }

  private async toggleNonEssentialCategories(page: Page): Promise<boolean> {
    try {
      return await page.evaluate(() => {
        const keywords = [
          'marketing',
          'advertising',
          'ads',
          'analytics',
          'statistik',
          'statistics',
          'performance',
          'tracking',
          'personalisierung',
          'personalization',
          'targeting',
        ];

        const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
        const candidates = Array.from(document.querySelectorAll('label, span, p, div'));
        let toggled = false;

        const findInput = (el: Element): HTMLInputElement | null => {
          if (el instanceof HTMLLabelElement) {
            const forId = el.getAttribute('for');
            if (forId) {
              const input = document.getElementById(forId);
              if (input instanceof HTMLInputElement) return input;
            }
            const input = el.querySelector('input[type="checkbox"]');
            return input instanceof HTMLInputElement ? input : null;
          }

          const input = el.querySelector('input[type="checkbox"]');
          return input instanceof HTMLInputElement ? input : null;
        };

        for (const el of candidates) {
          const text = normalize(el.textContent || '');
          if (!text) continue;
          if (!keywords.some(k => text.includes(k))) continue;

          const input = findInput(el) || findInput(el.parentElement || el);
          if (input) {
            if (input.checked) {
              input.click();
              toggled = true;
            }
            continue;
          }

          const switchEl = el.querySelector('[role="switch"][aria-checked="true"]') as HTMLElement | null;
          if (switchEl) {
            switchEl.click();
            toggled = true;
          }
        }

        return toggled;
      });
    } catch {
      return false;
    }
  }

  // Cookie-Banner-Buttons finden und klicken
  private async findAndClickConsentButton(
    page: Page,
    type: 'accept' | 'reject'
  ): Promise<{ found: boolean; clicked: boolean; buttonText?: string }> {
    // Selektoren für Akzeptieren-Buttons
    const acceptSelectors = [
      // Allgemeine Patterns
      'button[id*="accept"]',
      'button[class*="accept"]',
      'a[id*="accept"]',
      'a[class*="accept"]',
      '[data-action="accept"]',
      '[data-consent="accept"]',
      
      // Deutsche Texte
      'button:has-text("Alles akzeptieren")',
      'button:has-text("Alle akzeptieren")',
      'button:has-text("Akzeptieren")',
      'button:has-text("Alle Cookies akzeptieren")',
      'button:has-text("Zustimmen")',
      'button:has-text("Einverstanden")',
      'button:has-text("OK")',
      'button:has-text("Verstanden")',
      'button:has-text("Annehmen")',
      'button:has-text("Ich stimme zu")',
      'button:has-text("Weiter")',
      
      // Englische Texte
      'button:has-text("Accept all")',
      'button:has-text("Accept")',
      'button:has-text("I agree")',
      'button:has-text("Allow all")',
      'button:has-text("Allow cookies")',
      'button:has-text("Got it")',
      'button:has-text("Agree")',
      
      // Bekannte CMPs - Cookiebot
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '#CybotCookiebotDialogBodyButtonAccept',
      '.CybotCookiebotDialogBodyButton[id*="Accept"]',
      
      // OneTrust
      '#onetrust-accept-btn-handler',
      '.onetrust-accept-btn-handler',
      '#accept-recommended-btn-handler',
      
      // Usercentrics
      '.uc-btn-accept-banner',
      '[data-testid="uc-accept-all-button"]',
      '#uc-btn-accept-banner',
      '.sc-hKFxyN', // Usercentrics styled button
      '.uc-btn-accept',
      '.uc-btn-accept-all',
      '.uc-accept-all',
      '#uc-accept-all-button',
      '[data-testid="uc-accept-button"]',
      
      // Quantcast
      '#accept-choices',
      '.qc-cmp2-summary-buttons button[mode="primary"]',
      
      // CookieYes
      '.cky-btn-accept',
      '#cky-btn-accept',
      
      // Cookie Consent (Osano)
      '.cc-accept-all',
      '.osano-cm-accept-all',
      '.osano-cm-button--type_accept',
      
      // TrustArc
      '#consent_prompt_submit',
      '.pdynamicbutton .call',
      '#truste-consent-button',
      
      // Didomi
      '#didomi-notice-agree-button',
      // NICHT: .didomi-continue-without-agreeing - das ist Ablehnung, nicht Akzeptieren!
      
      // Klaro
      '#klaro .cm-btn-success',
      '.klaro .cm-btn-accept-all',
      
      // Complianz
      '.cmplz-accept',
      '#cmplz-accept-all',
      '.cmplz-btn.cmplz-accept',
      
      // Borlabs
      '#BorlabsCookieBoxButtonAccept',
      '.BorlabsCookie button[data-cookie-accept-all]',
      
      // GDPR Cookie Consent
      '#gdpr-cookie-accept',
      '.gdpr-cookie-accept',
      
      // Iubenda
      '.iubenda-cs-accept-btn',
      '#iubenda-cs-accept-btn',
      
      // Termly
      '#termly-code-snippet-support button[aria-label*="accept"]',
      '.t-acceptAllBtn',
      
      // Cookie Notice
      '#cn-accept-cookie',
      '.cn-button[data-cookie-action="accept"]',
      
      // WP GDPR
      '.wpgdprc-button',
      '#wpgdprc-consent-accept',
      
      // Shopify Cookie Banner
      '.shopify-section .cookie-banner__button--accept',
      '#shopify-pc__banner__btn-accept',

      // Real Cookie Banner
      '.rcb-btn-accept',
      '.rcb-btn-accept-all',
      '.rcb-accept-all',
      '#rcb-consent-accept',
      '[data-rcb-action="accept"]',
      '[data-rcb-action="accept-all"]',
    ];

    // Selektoren für Ablehnen-Buttons
    const rejectSelectors = [
      // Allgemeine Patterns
      'button[id*="reject"]',
      'button[id*="decline"]',
      'button[id*="deny"]',
      'button[class*="reject"]',
      'button[class*="decline"]',
      'a[id*="reject"]',
      '[data-action="reject"]',
      '[data-consent="reject"]',
      
      // Deutsche Texte
      'button:has-text("Alle ablehnen")',
      'button:has-text("Ablehnen")',
      'button:has-text("Nur notwendige")',
      'button:has-text("Nur essenzielle")',
      'button:has-text("Nur essenziell")',
      'button:has-text("Nur erforderliche")',
      'button:has-text("Nur technisch")',
      'button:has-text("Nur funktional")',
      'button:has-text("Nein, danke")',
      'button:has-text("Nicht akzeptieren")',
      'button:has-text("Nicht zustimmen")',
      'button:has-text("Auswahl speichern")',
      'button:has-text("Essenziell")',
      
      // Englische Texte
      'button:has-text("Reject all")',
      'button:has-text("Reject")',
      'button:has-text("Decline")',
      'button:has-text("Only necessary")',
      'button:has-text("Deny")',
      'button:has-text("Refuse")',
      'button:has-text("Essential only")',
      'button:has-text("Necessary only")',
      
      // Bekannte CMPs - Cookiebot
      '#CybotCookiebotDialogBodyButtonDecline',
      '.CybotCookiebotDialogBodyButton[id*="Decline"]',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
      
      // OneTrust
      '#onetrust-reject-all-handler',
      '.onetrust-reject-all-handler',
      
      // Usercentrics
      '.uc-btn-deny-banner',
      '[data-testid="uc-deny-all-button"]',
      '#uc-btn-deny-banner',
      '.uc-btn-deny',
      '.uc-btn-reject',
      '.uc-deny-all',
      '.uc-reject-all',
      '#uc-deny-all-button',
      
      // Quantcast
      '#deny-consent',
      '.qc-cmp2-summary-buttons button[mode="secondary"]',
      
      // CookieYes
      '.cky-btn-reject',
      '#cky-btn-reject',
      // NICHT: .cky-btn-customize - das öffnet nur Einstellungen, ist kein Reject!
      
      // Cookie Consent (Osano)
      '.cc-deny',
      '.osano-cm-deny',
      '.osano-cm-button--type_deny',
      
      // TrustArc
      '#consent_prompt_decline',
      '#truste-consent-required',
      
      // Didomi
      '#didomi-notice-disagree-button',
      '.didomi-dismiss-button',
      '.didomi-continue-without-agreeing', // "Continue without agreeing" = Ablehnung
      '.didomi-learn-more-button', // "Learn more" kann zu Ablehnung führen
      
      // Klaro
      '#klaro .cm-btn-decline',
      '.klaro .cm-btn-deny',
      
      // Complianz
      '.cmplz-deny',
      '#cmplz-deny-all',
      '.cmplz-btn.cmplz-deny',
      
      // Borlabs
      '#BorlabsCookieBoxButtonDecline',
      '.BorlabsCookie button[data-cookie-refuse]',
      
      // GDPR Cookie Consent
      '#gdpr-cookie-decline',
      '.gdpr-cookie-decline',
      
      // Iubenda
      '.iubenda-cs-reject-btn',
      '#iubenda-cs-reject-btn',
      
      // Termly
      '.t-declineAllBtn',
      
      // Cookie Notice
      '#cn-refuse-cookie',
      '.cn-button[data-cookie-action="refuse"]',
      
      // WP GDPR
      '#wpgdprc-consent-deny',
      
      // Shopify Cookie Banner
      '.shopify-section .cookie-banner__button--decline',
      '#shopify-pc__banner__btn-decline',

      // Real Cookie Banner
      '.rcb-btn-reject',
      '.rcb-btn-deny',
      '.rcb-reject',
      '.rcb-deny',
      '.rcb-btn-necessary',
      '.rcb-btn-essential',
      '#rcb-consent-decline',
      '[data-rcb-action="reject"]',
      '[data-rcb-action="deny"]',
    ];

    const selectors = type === 'accept' ? acceptSelectors : rejectSelectors;
    const textPatterns = type === 'accept' 
      ? ['alles akzeptieren', 'alle akzeptieren', 'akzeptieren', 'accept', 'zustimmen', 'agree', 'allow', 'einverstanden', 'verstanden', 'ok', 'annehmen', 'weiter', 'got it', 'continue', 'alle erlauben']
      : ['ablehnen', 'reject', 'decline', 'deny', 'nur essenzielle', 'nur essenziell', 'nur notwendig', 'nur erforderliche', 'nur technisch', 'nur funktional', 'only necessary', 'essential', 'refuse', 'nicht akzeptieren', 'essenziell', 'necessary only', 'auswahl speichern'];

    return this.tryClickWithRetries(page, selectors, textPatterns);
  }

  // "Speichern"-Button finden (kann sowohl Akzeptieren als auch Ablehnen sein, je nach Auswahl)
  private async findAndClickSaveButton(
    page: Page
  ): Promise<{ found: boolean; clicked: boolean; buttonText?: string }> {
    const saveSelectors = [
      // Speichern-Buttons
      'button:has-text("Speichern")',
      'button:has-text("Save")',
      'button:has-text("Auswahl speichern")',
      'button:has-text("Einstellungen speichern")',
      'button:has-text("Save selection")',
      'button:has-text("Save preferences")',
      // Nur Essenzielle-Buttons
      'button:has-text("Nur essenzielle")',
      'button:has-text("Nur essenziell")',
      'button:has-text("Nur notwendige")',
      'button:has-text("Nur erforderliche")',
      'button:has-text("Nur technisch")',
      'button:has-text("Nur funktional")',
      'button:has-text("Only essential")',
      'button:has-text("Only necessary")',
      'button:has-text("Essential only")',
      'button:has-text("Necessary only")',
      // ID/Class-basierte Selektoren
      'button[id*="save"]',
      'button[class*="save"]',
      'button[id*="essential"]',
      'button[class*="essential"]',
      'button[id*="necessary"]',
      'button[class*="necessary"]',

      // Usercentrics
      '.uc-btn-save',
      '.uc-save-button',
      '#uc-save-button',
      '[data-testid="uc-save-button"]',

      // Real Cookie Banner
      '.rcb-btn-save',
      '.rcb-save',
      '#rcb-consent-save',
      '[data-rcb-action="save"]',
    ];

    const savePatterns = [
      'speichern',
      'save',
      'nur essenzielle',
      'nur essenziell',
      'nur notwendige',
      'nur erforderliche',
      'nur technisch',
      'nur funktional',
      'only essential',
      'only necessary',
      'essential only',
      'necessary only',
      'technical only',
    ];

    return this.tryClickWithRetries(page, saveSelectors, savePatterns);
  }

  // Cookie-Consent-Test durchführen
  async performCookieConsentTest(url: string): Promise<CookieConsentTestData> {
    const browser = await this.ensureBrowser();

    const result: CookieConsentTestData = {
      pageDomain: new URL(url).hostname,
      beforeConsent: { cookies: [] },
      afterAccept: { cookies: [], clickSuccessful: false, buttonFound: false },
      afterReject: { cookies: [], clickSuccessful: false, buttonFound: false },
    };

    // Test 1: Cookies vor Consent + Akzeptieren
    const acceptContext = await this.createIsolatedContext();
    const pageAccept = acceptContext ? await acceptContext.newPage() : await browser.newPage();
    const acceptNetworkRequests: string[] = [];
    pageAccept.on('request', (request) => {
      acceptNetworkRequests.push(request.url());
    });
    await this.setupPage(pageAccept);
    
    try {
      await this.clearStorage(pageAccept, url);
      await this.gotoAndStabilize(pageAccept, url, {
        navigationTimeout: 20000,
        settleTimeout: 5000,
        includeConsentSignals: true,
      });

      // Cookies VOR jeder Interaktion sammeln
      result.beforeConsent.cookies = await this.collectCookies(pageAccept);

      await this.waitForConsentBanner(pageAccept, 3500);

      // Akzeptieren-Button finden und klicken
      let acceptResult = await this.findAndClickConsentButton(pageAccept, 'accept');
      
      // Wenn DOM-Klick fehlschlägt, versuche API-Aufruf
      if (!acceptResult.found) {
        await this.waitForCmpApi(pageAccept, 3000);
        const apiResult = await this.applyCmpConsentViaApi(pageAccept, 'accept');
        if (apiResult.applied) {
          acceptResult = { found: true, clicked: true, buttonText: apiResult.method };
        }
      }
      
      // Fallback: Settings-Button öffnen und dann Accept suchen
      if (!acceptResult.found) {
          const settingsResult = await this.findAndClickSettingsButton(pageAccept);
          if (settingsResult.clicked) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            acceptResult = await this.findAndClickConsentButton(pageAccept, 'accept');
        }
      }
      
      // Letzter Fallback: Wenn API vorhanden aber Banner nicht sichtbar, trotzdem API nutzen
      if (!acceptResult.found) {
        const hasApi = await pageAccept.evaluate(() => {
          const win = window as unknown as WindowLikeRecord;
          return !!(win.consentApi || win.UC_UI || win.Cookiebot || win.OneTrust);
        });
        if (hasApi) {
          const apiResult = await this.applyCmpConsentViaApi(pageAccept, 'accept');
          if (apiResult.applied) {
            acceptResult = { found: true, clicked: true, buttonText: apiResult.method + ' (no banner)' };
          }
        }
      }
      result.afterAccept.buttonFound = acceptResult.found;
      result.afterAccept.clickSuccessful = acceptResult.clicked;
      result.afterAccept.buttonText = acceptResult.buttonText;

      // Warten auf Cookie-Änderungen + Reload für Consent-basierte Scripts
      if (acceptResult.clicked) {
        await this.waitAfterConsentClick(pageAccept);
      }

      // Cookies NACH Akzeptieren sammeln
      result.afterAccept.cookies = await this.collectCookiesAfterConsentAction(pageAccept);
      result.afterAccept.consentSignals = await this.collectGoogleConsentSignals(pageAccept, acceptNetworkRequests);

    } finally {
      await this.safeClosePage(pageAccept);
      await this.safeCloseContext(acceptContext);
    }

    result.acceptNetworkRequests = acceptNetworkRequests;

    // Test 2: Ablehnen in neuem, sauberen Tab
    const rejectBrowser = await this.ensureBrowser();
    const rejectContext = await this.createIsolatedContext();
    const pageReject = rejectContext ? await rejectContext.newPage() : await rejectBrowser.newPage();
    await this.setupPage(pageReject);
    
    try {
      await this.clearStorage(pageReject, url);
      await this.gotoAndStabilize(pageReject, url, {
        navigationTimeout: 20000,
        settleTimeout: 5000,
        includeConsentSignals: true,
      });

      // Ablehnen-Button finden und klicken
      await this.waitForConsentBanner(pageReject, 3500);

      let rejectResult = await this.findAndClickConsentButton(pageReject, 'reject');
      
      // Wenn DOM-Klick fehlschlägt, versuche API-Aufruf
      if (!rejectResult.found) {
        await this.waitForCmpApi(pageReject, 3000);
        const apiResult = await this.applyCmpConsentViaApi(pageReject, 'reject');
        if (apiResult.applied) {
          rejectResult = { found: true, clicked: true, buttonText: apiResult.method };
        }
      }
      
      // Fallback: Settings-Button öffnen und dann Essential/Save suchen
      if (!rejectResult.found) {
          const settingsResult = await this.findAndClickSettingsButton(pageReject);
          if (settingsResult.clicked) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            const essentialResult = await this.findAndClickEssentialOnlyButton(pageReject);
            if (essentialResult.found) {
              rejectResult = essentialResult;
            } else {
              const toggled = await this.toggleNonEssentialCategories(pageReject);
              if (toggled) {
                await new Promise(resolve => setTimeout(resolve, 600));
              }
              rejectResult = await this.findAndClickConsentButton(pageReject, 'reject');
            }
        }
      }
      
      // Letzter Fallback: Wenn API vorhanden aber Banner nicht sichtbar, trotzdem API nutzen
      if (!rejectResult.found) {
        const hasApi = await pageReject.evaluate(() => {
          const win = window as unknown as WindowLikeRecord;
          return !!(win.consentApi || win.UC_UI || win.Cookiebot || win.OneTrust);
        });
        if (hasApi) {
          const apiResult = await this.applyCmpConsentViaApi(pageReject, 'reject');
          if (apiResult.applied) {
            rejectResult = { found: true, clicked: true, buttonText: apiResult.method + ' (no banner)' };
          }
        }
      }
      
      // Wenn kein expliziter Ablehnen-Button gefunden wurde, versuche "Speichern"-Button
      // WICHTIG: "Speichern" kann sowohl Akzeptieren als auch Ablehnen sein, je nach Auswahl
      // Wir prüfen nach dem Klick, welche Cookies gesetzt wurden
      if (!rejectResult.found) {
        const saveResult = await this.findAndClickSaveButton(pageReject);
        if (saveResult.found) {
          result.afterReject.buttonFound = saveResult.found;
          result.afterReject.clickSuccessful = saveResult.clicked;
          result.afterReject.buttonText = saveResult.buttonText;
          
          if (saveResult.clicked) {
            await this.waitAfterConsentClick(pageReject);
            result.afterReject.cookies = await this.collectCookiesAfterConsentAction(pageReject);
          }
        } else {
          result.afterReject.buttonFound = rejectResult.found;
          result.afterReject.clickSuccessful = rejectResult.clicked;
          result.afterReject.buttonText = rejectResult.buttonText;
        }
      } else {
        result.afterReject.buttonFound = rejectResult.found;
        result.afterReject.clickSuccessful = rejectResult.clicked;
        result.afterReject.buttonText = rejectResult.buttonText;

        // Warten auf Cookie-Änderungen + Reload
        if (rejectResult.clicked) {
          await this.waitAfterConsentClick(pageReject);
        }

        // Cookies NACH Ablehnen sammeln
        result.afterReject.cookies = await this.collectCookiesAfterConsentAction(pageReject);
      }

    } finally {
      await this.safeClosePage(pageReject);
      await this.safeCloseContext(rejectContext);
    }

    return result;
  }

  // Fallback: Nur Accept ausführen und Cookies sammeln
  async performAcceptOnlyTest(url: string): Promise<AcceptOnlyTestResult> {
    const browser = await this.ensureBrowser();

    const acceptContext = await this.createIsolatedContext();
    const pageAccept = acceptContext ? await acceptContext.newPage() : await browser.newPage();
    const acceptNetworkRequests: string[] = [];
    pageAccept.on('request', (request) => {
      acceptNetworkRequests.push(request.url());
    });

    await this.setupPage(pageAccept);

    try {
      await this.clearStorage(pageAccept, url);
      await this.gotoAndStabilize(pageAccept, url, {
        navigationTimeout: 20000,
        settleTimeout: 5000,
        includeConsentSignals: true,
      });

      await this.waitForConsentBanner(pageAccept, 3500);

      let acceptResult = await this.findAndClickConsentButton(pageAccept, 'accept');

      if (!acceptResult.found) {
        await this.waitForCmpApi(pageAccept, 3000);
        const apiResult = await this.applyCmpConsentViaApi(pageAccept, 'accept');
        if (apiResult.applied) {
          acceptResult = { found: true, clicked: true, buttonText: apiResult.method };
        }
      }

      if (!acceptResult.found) {
        const settingsResult = await this.findAndClickSettingsButton(pageAccept);
        if (settingsResult.clicked) {
          await new Promise(resolve => setTimeout(resolve, 1200));
          acceptResult = await this.findAndClickConsentButton(pageAccept, 'accept');
        }
      }

      if (!acceptResult.found) {
        const hasApi = await pageAccept.evaluate(() => {
          const win = window as unknown as WindowLikeRecord;
          return !!(win.consentApi || win.UC_UI || win.Cookiebot || win.OneTrust);
        });
        if (hasApi) {
          const apiResult = await this.applyCmpConsentViaApi(pageAccept, 'accept');
          if (apiResult.applied) {
            acceptResult = { found: true, clicked: true, buttonText: apiResult.method + ' (no banner)' };
          }
        }
      }

      if (acceptResult.clicked) {
        await this.waitAfterConsentClick(pageAccept);
      }

      const cookies = await this.collectCookiesAfterConsentAction(pageAccept);
      const consentSignals = await this.collectGoogleConsentSignals(pageAccept, acceptNetworkRequests);

      return {
        cookies,
        clickSuccessful: acceptResult.clicked,
        buttonFound: acceptResult.found,
        buttonText: acceptResult.buttonText,
        consentSignals,
      };
    } finally {
      await this.safeClosePage(pageAccept);
      await this.safeCloseContext(acceptContext);
    }
  }

  private async collectGoogleConsentSignals(page: Page, networkRequests: string[]): Promise<GoogleConsentSignals> {
    const gcsOrGcdRequests = networkRequests.filter((url) =>
      /[?&](gcs|gcd)=/i.test(url)
    ).length;

    // String-basierte Evaluation verhindert "__name is not defined" in Page-Context
    const jsCode = `
      (function() {
        var values = {};
        var dataLayerConsentDetected = false;
        var readConsentValues = function(obj) {
          if (!obj || typeof obj !== 'object') return;
          var keys = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'];
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var raw = obj[key];
            if (raw === 'granted' || raw === 'denied') {
              values[key] = raw;
            }
          }
        };

        var dl = window.dataLayer;
        if (Array.isArray(dl)) {
          for (var i = 0; i < dl.length; i++) {
            var entry = dl[i];
            if (entry && typeof entry === 'object') {
              var command = entry['0'];
              var action = entry['1'];
              var payload = entry['2'];

              if (command === 'consent' && (action === 'default' || action === 'update')) {
                dataLayerConsentDetected = true;
                readConsentValues(payload);
              }

              if (typeof entry.event === 'string' && entry.event.toLowerCase().indexOf('consent') !== -1) {
                dataLayerConsentDetected = true;
              }

              readConsentValues(entry);
            }
          }
        }

        return { dataLayerConsentDetected: dataLayerConsentDetected, parameterValues: values };
      })()
    `;

    const dataLayerSignals = await page.evaluate(jsCode) as {
      dataLayerConsentDetected: boolean;
      parameterValues: Partial<Record<
        'ad_storage' | 'analytics_storage' | 'ad_user_data' | 'ad_personalization',
        'granted' | 'denied'
      >>;
    };

    return {
      dataLayerConsentDetected: dataLayerSignals.dataLayerConsentDetected,
      gcsOrGcdRequests,
      parameterValues: dataLayerSignals.parameterValues,
    };
  }

  private mergeCookies(...cookieGroups: CookieData[][]): CookieData[] {
    const mergedCookies = new Map<string, CookieData>();

    for (const cookies of cookieGroups) {
      for (const cookie of cookies) {
        const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
        mergedCookies.set(key, cookie);
      }
    }

    return Array.from(mergedCookies.values());
  }

  private async collectCookiesAfterConsentAction(page: Page): Promise<CookieData[]> {
    const immediateCookies = await this.collectCookies(page);

    if (!this.isServerlessRuntime()) {
      return immediateCookies;
    }

    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      await this.waitForPageSignals(page, {
        timeout: 3500,
        includeConsentSignals: false,
      });
      const reloadedCookies = await this.collectCookies(page);
      return this.mergeCookies(immediateCookies, reloadedCookies);
    } catch {
      return immediateCookies;
    }
  }

  private async collectCookies(page: Page): Promise<CookieData[]> {
    const allCookiesMap = new Map<string, CookieData>();
    
    // Methode 1: CDP Session für alle Cookies (inkl. HttpOnly, Secure, etc.)
    try {
      const client = await page.createCDPSession();
      const cdpResult = await client.send('Network.getAllCookies');
      if (Array.isArray(cdpResult?.cookies)) {
        for (const cookie of cdpResult.cookies) {
          const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
          allCookiesMap.set(key, this.mapCookie(cookie));
        }
      }
      await client.detach();
    } catch {
      // CDP nicht verfügbar
    }

    // Methode 2: Page.cookies() für aktuelle Seite
    try {
      const pageCookies = await page.cookies();
      for (const cookie of pageCookies) {
        const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
        if (!allCookiesMap.has(key)) {
          allCookiesMap.set(key, this.mapCookie(cookie));
        }
      }
    } catch {
      // Fallback fehlgeschlagen
    }

    // Methode 3: document.cookie als zusätzliche Quelle (erfasst nur nicht-HttpOnly Cookies)
    try {
      const docCookies = await page.evaluate(() => {
        const cookies: Array<{ name: string; value: string; domain: string; path: string }> = [];
        const cookieString = document.cookie;
        if (cookieString) {
          const pairs = cookieString.split(';');
          for (const pair of pairs) {
            const [name, ...valueParts] = pair.trim().split('=');
            if (name) {
              cookies.push({
                name: name.trim(),
                value: valueParts.join('=') || '',
                domain: window.location.hostname,
                path: '/',
              });
            }
          }
        }
        return cookies;
      });
      
      for (const cookie of docCookies) {
        const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
        if (!allCookiesMap.has(key)) {
          allCookiesMap.set(key, {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: 0,
            httpOnly: false,
            secure: false,
            sameSite: undefined,
          });
        }
      }
    } catch {
      // document.cookie nicht verfügbar
    }

    return Array.from(allCookiesMap.values());
  }

  private async clearStorage(page: Page, url: string): Promise<void> {
    try {
      const client = await page.createCDPSession();
      const origin = new URL(url).origin;
      await client.send('Storage.clearDataForOrigin', {
        origin,
        storageTypes: 'all',
      });
      await client.send('Network.clearBrowserCookies');
      await client.send('Network.clearBrowserCache');
    } catch {
      // Storage clearing fehlgeschlagen
    }
  }

  private async waitAfterConsentClick(page: Page): Promise<void> {
    await this.waitForPageSignals(page, {
      timeout: 5000,
      includeConsentSignals: false,
    });

    if (this.isServerlessRuntime()) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await this.waitForPageSignals(page, {
        timeout: 3000,
        includeConsentSignals: false,
      });
      return;
    }

    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
      await this.waitForPageSignals(page, {
        timeout: 5000,
        includeConsentSignals: false,
      });
    } catch {
      await this.waitForPageSignals(page, {
        timeout: 2500,
        includeConsentSignals: false,
      });
    }
  }

  private async setupPage(page: Page): Promise<void> {
    // Basic anti-bot heuristics to avoid CMP suppression in headless mode
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Runtime Instrumentation für Consent Mode / DataLayer / gtag Calls
      // Ziel: Consent Mode zuverlässig erkennen, auch wenn der Code in externen Scripts steckt.
      try {
        const w = window as unknown as WindowLikeRecord;
        const log: {
          consentModeCalls: Array<{ source: ConsentCallSource; args: unknown[] }>;
          gtagCalls: unknown[][];
          dataLayerPushCalls: unknown[][];
        } = {
          consentModeCalls: [],
          gtagCalls: [],
          dataLayerPushCalls: [],
        };

        // Expose log object
        Object.defineProperty(w, '__trackingChecker', {
          value: log,
          configurable: false,
          enumerable: false,
          writable: false,
        });

        const safePushConsent = (source: 'gtag' | 'dataLayer' | 'gtag_stub' | 'unknown', args: unknown[]) => {
          try {
            if (Array.isArray(args) && args[0] === 'consent') {
              log.consentModeCalls.push({ source, args });
            }
          } catch {
            // ignore
          }
        };

        // Wrap dataLayer assignment + push
        const wrapDataLayer = (arr: unknown): unknown => {
          if (!arr || typeof arr !== 'object') return arr;
          if (!Array.isArray(arr)) return arr;
          const dataLayerArray = arr as WrappedDataLayerArray;
          if (dataLayerArray.__tcWrapped) return dataLayerArray;
          try {
            const originalPush = dataLayerArray.push.bind(dataLayerArray);
            dataLayerArray.push = (...pushArgs: unknown[]) => {
              try {
                log.dataLayerPushCalls.push(pushArgs);
                // gtag pushes an "Arguments" object into dataLayer: arguments[0]==='consent'
                // Or direct arrays: ['consent','default', {...}]
                const first = pushArgs[0];
                if (Array.isArray(first)) {
                  safePushConsent('dataLayer', first);
                } else if (first && typeof first === 'object') {
                  const maybeCmd = (first as ArrayLike<unknown>)[0];
                  if (maybeCmd === 'consent') {
                    try {
                      const normalized = Array.prototype.slice.call(first) as unknown[];
                      safePushConsent('dataLayer', normalized);
                    } catch {
                      // ignore
                    }
                  }
                }
              } catch {
                // ignore
              }
              return originalPush(...pushArgs);
            };
            Object.defineProperty(dataLayerArray, '__tcWrapped', { value: true, configurable: true });
          } catch {
            // ignore
          }
          return dataLayerArray;
        };

        let dataLayerValue = wrapDataLayer(w.dataLayer || []);
        Object.defineProperty(w, 'dataLayer', {
          configurable: true,
          get() {
            return dataLayerValue;
          },
          set(v) {
            dataLayerValue = wrapDataLayer(v);
          },
        });

        // gtag wird nur dann gewrappt, wenn die Seite es selbst setzt.
        // Dadurch werden keine künstlichen Globals erzeugt, aber echte Calls
        // lassen sich für GA-/Consent-Erkennung mitschneiden.
        let gtagValue = w.gtag;
        Object.defineProperty(w, 'gtag', {
          configurable: true,
          get() {
            return gtagValue;
          },
          set(v: unknown) {
            if (typeof v !== 'function') {
              gtagValue = v;
              return;
            }

            const original = v as WrappedTrackingFunction;
            if (original.__tcWrapped) {
              gtagValue = original;
              return;
            }

            const wrapped = function(this: unknown, ...args: unknown[]) {
              try {
                log.gtagCalls.push(args);
                safePushConsent('gtag', args);
              } catch {
                // ignore
              }
              return original.apply(this, args);
            };

            Object.defineProperty(wrapped, '__tcWrapped', {
              value: true,
              configurable: true,
            });

            gtagValue = wrapped;
          },
        });
      } catch {
        // Instrumentation Fehler ignorieren
      }
    });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });
  }

  private mapCookie(cookie: { name: string; value: string; domain: string; path: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: string }): CookieData {
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires ?? 0,
      httpOnly: cookie.httpOnly ?? false,
      secure: cookie.secure ?? false,
      sameSite: cookie.sameSite as string | undefined,
    };
  }

  async close(): Promise<void> {
    await this.safeCloseBrowser();
  }
}

// Singleton Export für einfache Nutzung
let crawlerInstance: WebCrawler | null = null;

export async function getCrawler(): Promise<WebCrawler> {
  if (!crawlerInstance) {
    crawlerInstance = new WebCrawler();
    await crawlerInstance.init();
  }
  return crawlerInstance;
}
