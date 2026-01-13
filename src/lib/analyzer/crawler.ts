import type { Browser, Page } from 'puppeteer-core';

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

// Erkennung ob wir auf Vercel/Serverless laufen
const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

async function getBrowser(): Promise<Browser> {
  if (isVercel) {
    // Vercel/Serverless: Verwende @sparticuz/chromium
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require('@sparticuz/chromium');
    const puppeteerCore = (await import('puppeteer-core')).default;
    
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: { width: 1920, height: 1080 },
    }) as Promise<Browser>;
  } else {
    // Lokal: Verwende normales puppeteer
    const puppeteer = (await import('puppeteer')).default;
    return puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    }) as Promise<Browser>;
  }
}

export class WebCrawler {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    this.browser = await getBrowser();
  }

  async crawl(url: string): Promise<CrawlResult> {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser!.newPage();
    
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

    // Response Listener für Header-Analyse (wichtig für Server-Side Tracking)
    page.on('response', async (response) => {
      try {
        const headers = response.headers();
        const responseUrl = response.url();
        
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

    // User-Agent setzen (wie ein normaler Browser)
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Viewport setzen
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      // Seite laden und warten bis alles geladen ist
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Erweiterte Wartezeit für GTM und dynamisch geladene Pixel
      // Erste Wartezeit: Basis-Ladung
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Zweite Prüfung: Warten auf spezifische Tracking-Objekte
      await this.waitForTrackingObjects(page, 3000);
      
      // Dritte Wartezeit: Für Consent-abhängige Pixel
      await new Promise(resolve => setTimeout(resolve, 1500));

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

      return {
        html,
        scripts,
        networkRequests,
        networkRequestsExtended,
        cookies: cookieData,
        windowObjects,
        consoleMessages,
        responseHeaders,
        pageUrl: url,
        pageDomain,
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
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const hasTrackingObjects = await page.evaluate(() => {
        const win = window as unknown as Record<string, unknown>;
        // Prüfe ob wichtige Tracking-Objekte vorhanden sind
        return (
          typeof win.fbq === 'function' ||
          typeof win.gtag === 'function' ||
          typeof win.ttq === 'object' ||
          Array.isArray(win.dataLayer)
        );
      });
      
      if (hasTrackingObjects) {
        // Kurz warten damit alle Initialisierungen abgeschlossen sind
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
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

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
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
