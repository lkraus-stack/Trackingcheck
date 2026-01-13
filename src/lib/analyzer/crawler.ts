import type { Browser, Page } from 'puppeteer-core';

export interface CrawlResult {
  html: string;
  scripts: string[];
  networkRequests: NetworkRequest[];
  cookies: CookieData[];
  windowObjects: WindowObjectData;
  consoleMessages: string[];
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
  dataLayerContent?: unknown[];
  tcfApiResponse?: unknown;
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
    
    // Sammle Daten
    const networkRequests: NetworkRequest[] = [];
    const consoleMessages: string[] = [];

    // Network Request Listener
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
      });
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

      // Zusätzliche Wartezeit für dynamisch geladene Inhalte
      await new Promise(resolve => setTimeout(resolve, 2000));

      // HTML Content
      const html = await page.content();

      // Alle Script-Tags sammeln
      const scripts = await page.evaluate(() => {
        const scriptElements = document.querySelectorAll('script');
        return Array.from(scriptElements).map((script) => script.src || script.innerHTML);
      });

      // Window Objects prüfen
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
        cookies: cookieData,
        windowObjects,
        consoleMessages,
      };
    } finally {
      await page.close();
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
      };

      // DataLayer Inhalt
      if (result.hasDataLayer && Array.isArray(win.dataLayer)) {
        result.dataLayerContent = (win.dataLayer as unknown[]).slice(0, 10); // Erste 10 Einträge
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
