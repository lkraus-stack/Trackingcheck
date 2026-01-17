import type { Browser, Page, Frame, BrowserContext } from 'puppeteer-core';

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
  beforeConsent: {
    cookies: CookieData[];
  };
  afterAccept: {
    cookies: CookieData[];
    clickSuccessful: boolean;
    buttonFound: boolean;
    buttonText?: string;
  };
  afterReject: {
    cookies: CookieData[];
    clickSuccessful: boolean;
    buttonFound: boolean;
    buttonText?: string;
  };
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
        '--disable-blink-features=AutomationControlled',
      ],
    }) as Promise<Browser>;
  }
}

export class WebCrawler {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    this.browser = await getBrowser();
  }

  // Quick-Crawl für schnellere Analyse (ohne Consent-Test, kürzere Wartezeiten)
  async crawlQuick(url: string): Promise<CrawlResult> {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser!.newPage();
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

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1920, height: 1080 });

    try {
      // Schnelleres Laden mit kürzerer Wartezeit
      await page.goto(url, {
        waitUntil: 'domcontentloaded', // Schneller als networkidle2
        timeout: 15000, // Kürzerer Timeout
      });

      // Kürzere Wartezeit
      await new Promise(resolve => setTimeout(resolve, 1500));

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

    // User-Agent setzen (wie ein normaler Browser)
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Viewport setzen
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      // Seite laden und warten bis alles geladen ist
      // Timeout reduziert auf 25 Sekunden für bessere Performance
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 25000,
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
        setCookieHeaders,
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

  private async createIsolatedContext(): Promise<BrowserContext | null> {
    if (!this.browser) return null;
    const browserAny = this.browser as unknown as {
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

  private getSearchContexts(page: Page): Array<Page | Frame> {
    const mainFrame = page.mainFrame();
    const frames = page.frames().filter(frame => frame !== mainFrame);
    return [page, ...frames];
  }

  private async waitForConsentBanner(page: Page): Promise<void> {
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

    const waits: Promise<any>[] = bannerSelectors.map(selector =>
      page.waitForSelector(selector, { timeout: 3500, visible: true }).catch(() => null)
    );
    
    // Warten auf CMP JavaScript APIs
    waits.push(
      page.waitForFunction(() => {
        const win = window as unknown as Record<string, unknown>;
        const uc = (win as any).UC_UI;
        const ucReady = uc && typeof uc.isInitialized === 'function' ? uc.isInitialized() : Boolean(uc);
        return Boolean(
          ucReady ||
          (win as any).__ucCmp ||
          (win as any).CookieConsent ||
          (win as any).Cookiebot ||
          (win as any).OnetrustActiveGroups ||
          (win as any).consentApi ||
          (win as any).rcbConsentManager ||
          (win as any).realCookieBanner ||
          (win as any).BorlabsCookie ||
          (win as any).cmplz_banner
        );
      }, { timeout: 4000 }).catch(() => null)
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
      }, { timeout: 3000 }).catch(() => null)
    );

    await Promise.allSettled(waits);
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  private async waitForCmpApi(page: Page): Promise<void> {
    await page.waitForFunction(() => {
      const win = window as unknown as Record<string, any>;
      const uc = win.UC_UI;
      if (uc && typeof uc.isInitialized === 'function') {
        if (uc.isInitialized()) return true;
      }
      if (win.__ucCmp) return true;
      if (win.consentApi) return true;
      if (win.rcbConsentManager && typeof win.rcbConsentManager.getOptions === 'function') {
        const groups = win.rcbConsentManager.getOptions?.()?.groups;
        if (Array.isArray(groups) && groups.length > 0) return true;
      }
      return false;
    }, { timeout: 6000 }).catch(() => null);
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

        // Rekursive Shadow DOM Suche mit maximaler Tiefe
        const collectElements = (root: Document | ShadowRoot, depth = 0, maxDepth = 5): Element[] => {
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
      const result = await page.evaluate((action) => {
        const win = window as unknown as Record<string, any>;
        
        const callFirst = (obj: any, methods: string[], args?: any[]) => {
          for (const method of methods) {
            const fn = obj?.[method];
            if (typeof fn === 'function') {
              try {
                if (Array.isArray(args) && args.length > 0) {
                  fn.call(obj, ...args);
                } else {
                  fn.call(obj);
                }
                return method;
              } catch {
                // ignore
              }
            }
          }
          return undefined;
        };
        
        const callWithSource = (obj: any, methods: string[], source: string, args?: any[]) => {
          const method = callFirst(obj, methods, args);
          return method ? `${source}.${method}` : undefined;
        };

        let method: string | undefined;

        // =========================================
        // USERCENTRICS API - verbessert
        // =========================================
        if (win.UC_UI) {
          // Warten bis initialisiert
          const isReady = typeof win.UC_UI.isInitialized === 'function' 
            ? win.UC_UI.isInitialized() 
            : true;
          
          if (!isReady && typeof win.UC_UI.showFirstLayer === 'function') {
            try {
                win.UC_UI.showFirstLayer();
            } catch {
              // ignore
            }
          }
          
          if (action === 'accept') {
            // Versuche verschiedene Methoden
            if (typeof win.UC_UI.acceptAllConsents === 'function') {
              win.UC_UI.acceptAllConsents();
              method = 'UC_UI.acceptAllConsents';
            } else if (typeof win.UC_UI.acceptAll === 'function') {
              win.UC_UI.acceptAll();
              method = 'UC_UI.acceptAll';
            }
          } else {
            // Reject/Essential
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
          
          // Consent speichern wenn verfügbar
          if (method) {
            try {
              if (typeof win.UC_UI.saveConsents === 'function') {
              win.UC_UI.saveConsents();
              }
              if (typeof win.UC_UI.closeCMP === 'function') {
                win.UC_UI.closeCMP();
              }
            } catch {
              // ignore
            }
          }
        }

        // Usercentrics alternative API (__ucCmp)
        if (!method && win.__ucCmp) {
          if (action === 'accept') {
            method = callWithSource(win.__ucCmp, ['acceptAllConsents', 'acceptAll'], '__ucCmp');
          } else {
            method = callWithSource(win.__ucCmp, ['denyAllConsents', 'denyAll', 'rejectAllConsents', 'rejectAll'], '__ucCmp');
          }
        }

        // =========================================
        // REAL COOKIE BANNER API - komplett überarbeitet
        // =========================================
        if (!method && win.consentApi) {
          const rcbManager = win.rcbConsentManager;
          
          if (action === 'accept' && typeof win.consentApi.consentAll === 'function') {
            try {
              // Hole alle Gruppen und Items für consentAll
              const options = rcbManager?.getOptions?.();
              const groups = Array.isArray(options?.groups) ? options.groups : [];
              
              // consentAll erwartet: ...args wobei jedes arg [groupId, [itemIds]] ist
              const consentArgs = groups
                .filter((g: any) => g && g.id !== undefined && Array.isArray(g.items))
                .map((g: any) => [g.id, g.items.map((i: any) => i.id).filter(Boolean)]);
              
              if (consentArgs.length > 0) {
                win.consentApi.consentAll(...consentArgs);
                method = 'consentApi.consentAll';
              } else {
                // Fallback ohne Argumente
                win.consentApi.consentAll();
                method = 'consentApi.consentAll';
              }
            } catch {
              // Versuche ohne Argumente
              try {
                win.consentApi.consentAll();
                method = 'consentApi.consentAll';
              } catch {
                // ignore
              }
            }
          } else if (action !== 'accept' && typeof win.consentApi.consent === 'function') {
            try {
              // Nur essentielle Gruppen akzeptieren
              const options = rcbManager?.getOptions?.();
              const groups = Array.isArray(options?.groups) ? options.groups : [];
              
              const essentialArgs = groups
                .filter((g: any) => g && g.id !== undefined && Array.isArray(g.items) && g.isEssential)
                .map((g: any) => [g.id, g.items.map((i: any) => i.id).filter(Boolean)]);
              
              if (essentialArgs.length > 0) {
                win.consentApi.consent(...essentialArgs);
                method = 'consentApi.consent (essential only)';
              }
            } catch {
              // ignore
            }
          }
        }

        // Real Cookie Banner persistConsent als Fallback
        if (!method && win.rcbConsentManager && typeof win.rcbConsentManager.persistConsent === 'function') {
          try {
            const options = win.rcbConsentManager.getOptions?.();
            const groups = Array.isArray(options?.groups) ? options.groups : [];
            const decision: Record<string, number[]> = {};
            
            for (const group of groups) {
              if (!group || typeof group.id === 'undefined' || !Array.isArray(group.items)) continue;
              const isEssential = Boolean(group.isEssential);
              
              if (action === 'accept') {
                // Alle Gruppen akzeptieren
                decision[group.id] = group.items.map((item: any) => item.id).filter(Boolean);
              } else if (isEssential) {
                // Nur essentielle Gruppen
                decision[group.id] = group.items.map((item: any) => item.id).filter(Boolean);
              }
              // Bei nicht-essentiellen Gruppen und reject: nichts hinzufügen
            }
            
            if (Object.keys(decision).length > 0) {
              win.rcbConsentManager.persistConsent(decision);
              method = 'rcbConsentManager.persistConsent';
              
              // Cookies anwenden
              if (typeof win.rcbConsentManager.applyCookies === 'function') {
                win.rcbConsentManager.applyCookies();
              }
            }
          } catch {
            // ignore
          }
        }

        // =========================================
        // COOKIEBOT API
        // =========================================
        if (!method && win.Cookiebot) {
          if (action === 'accept') {
            if (typeof win.Cookiebot.submitCustomConsent === 'function') {
              win.Cookiebot.submitCustomConsent(true, true, true);
              method = 'Cookiebot.submitCustomConsent';
          } else {
              method = callWithSource(win.Cookiebot, ['acceptAll', 'accept'], 'Cookiebot');
            }
          } else {
            if (typeof win.Cookiebot.submitCustomConsent === 'function') {
              win.Cookiebot.submitCustomConsent(false, false, false);
              method = 'Cookiebot.submitCustomConsent (deny)';
            } else {
              method = callWithSource(win.Cookiebot, ['decline', 'reject', 'denyAll'], 'Cookiebot');
            }
          }
        }

        // =========================================
        // ONETRUST API
        // =========================================
        if (!method && win.OneTrust) {
          if (action === 'accept') {
            method = callWithSource(win.OneTrust, ['AllowAll', 'acceptAll'], 'OneTrust');
          } else {
            method = callWithSource(win.OneTrust, ['RejectAll', 'rejectAll'], 'OneTrust');
          }
        }

        // =========================================
        // BORLABS COOKIE API
        // =========================================
        if (!method && win.BorlabsCookie) {
          if (action === 'accept') {
            method = callWithSource(win.BorlabsCookie, ['acceptAll', 'allowAll'], 'BorlabsCookie');
          } else {
            method = callWithSource(win.BorlabsCookie, ['denyAll', 'declineAll', 'rejectAll'], 'BorlabsCookie');
          }
        }

        // =========================================
        // GENERIC CookieConsent API
        // =========================================
        if (!method && win.CookieConsent) {
          if (action === 'accept') {
            method = callWithSource(win.CookieConsent, ['acceptAll', 'accept', 'allowAll'], 'CookieConsent');
          } else {
            method = callWithSource(win.CookieConsent, ['rejectAll', 'denyAll', 'reject', 'decline'], 'CookieConsent');
          }
        }

        return { applied: Boolean(method), method };
      }, action);

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
    if (!this.browser) {
      await this.init();
    }

    const result: CookieConsentTestData = {
      pageDomain: new URL(url).hostname,
      beforeConsent: { cookies: [] },
      afterAccept: { cookies: [], clickSuccessful: false, buttonFound: false },
      afterReject: { cookies: [], clickSuccessful: false, buttonFound: false },
    };

    // Test 1: Cookies vor Consent + Akzeptieren
    const acceptContext = await this.createIsolatedContext();
    const pageAccept = acceptContext ? await acceptContext.newPage() : await this.browser!.newPage();
    await this.setupPage(pageAccept);
    
    try {
      await this.clearStorage(pageAccept, url);
      await pageAccept.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Cookies VOR jeder Interaktion sammeln
      result.beforeConsent.cookies = await this.collectCookies(pageAccept);

      await this.waitForConsentBanner(pageAccept);

      // Akzeptieren-Button finden und klicken
      let acceptResult = await this.findAndClickConsentButton(pageAccept, 'accept');
      if (!acceptResult.found) {
        await this.waitForCmpApi(pageAccept);
        const apiResult = await this.applyCmpConsentViaApi(pageAccept, 'accept');
        if (apiResult.applied) {
          acceptResult = { found: true, clicked: true, buttonText: apiResult.method };
        } else {
          const settingsResult = await this.findAndClickSettingsButton(pageAccept);
          if (settingsResult.clicked) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            acceptResult = await this.findAndClickConsentButton(pageAccept, 'accept');
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
      result.afterAccept.cookies = await this.collectCookies(pageAccept);

    } finally {
      await pageAccept.close();
      if (acceptContext) {
        await acceptContext.close();
      }
    }

    // Test 2: Ablehnen in neuem, sauberen Tab
    const rejectContext = await this.createIsolatedContext();
    const pageReject = rejectContext ? await rejectContext.newPage() : await this.browser!.newPage();
    await this.setupPage(pageReject);
    
    try {
      await this.clearStorage(pageReject, url);
      await pageReject.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Ablehnen-Button finden und klicken
      await this.waitForConsentBanner(pageReject);

      let rejectResult = await this.findAndClickConsentButton(pageReject, 'reject');
      if (!rejectResult.found) {
        await this.waitForCmpApi(pageReject);
        const apiResult = await this.applyCmpConsentViaApi(pageReject, 'reject');
        if (apiResult.applied) {
          rejectResult = { found: true, clicked: true, buttonText: apiResult.method };
        } else {
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
            result.afterReject.cookies = await this.collectCookies(pageReject);
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
        result.afterReject.cookies = await this.collectCookies(pageReject);
      }

    } finally {
      await pageReject.close();
      if (rejectContext) {
        await rejectContext.close();
      }
    }

    return result;
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
    // Warten auf initiale Cookie-Setzung nach Consent
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Warten auf möglicherweise verzögerte Script-Ausführung
    try {
      await page.waitForNetworkIdle({ timeout: 5000, idleTime: 1000 });
    } catch {
      // Timeout ist OK
    }
    
    // Prüfen ob ein Reload nötig ist (manche CMPs setzen Cookies erst nach Reload)
    
    try {
      await page.reload({ waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Warten auf Tracking Scripts die nach Reload laden
      await this.waitForTrackingObjects(page);
      
      // Zusätzliches Warten auf async Cookie-Setzung
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch {
      // Reload fehlgeschlagen - warte trotzdem
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  private async setupPage(page: Page): Promise<void> {
    // Basic anti-bot heuristics to avoid CMP suppression in headless mode
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
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
