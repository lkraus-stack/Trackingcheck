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
  // Neue Cookie-Consent-Test-Daten
  cookieConsentTest?: CookieConsentTestData;
}

export interface CookieConsentTestData {
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
      '.didomi-continue-without-agreeing',
      
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
      'button:has-text("Nur erforderliche")',
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
      '#onetrust-pc-btn-handler', // Settings/Preferences button
      
      // Usercentrics
      '.uc-btn-deny-banner',
      '[data-testid="uc-deny-all-button"]',
      '#uc-btn-deny-banner',
      
      // Quantcast
      '#deny-consent',
      '.qc-cmp2-summary-buttons button[mode="secondary"]',
      
      // CookieYes
      '.cky-btn-reject',
      '#cky-btn-reject',
      '.cky-btn-customize', // Often functions as reject
      
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
    ];

    const selectors = type === 'accept' ? acceptSelectors : rejectSelectors;
    const textPatterns = type === 'accept' 
      ? ['akzeptieren', 'accept', 'zustimmen', 'agree', 'allow', 'einverstanden', 'verstanden', 'ok', 'annehmen', 'weiter', 'got it', 'continue']
      : ['ablehnen', 'reject', 'decline', 'deny', 'nur notwendig', 'nur erforderlich', 'only necessary', 'essential', 'refuse', 'nicht akzeptieren', 'essenziell', 'necessary only', 'auswahl speichern'];

    // Versuche verschiedene Selektoren
    for (const selector of selectors) {
      try {
        // Für :has-text verwenden wir evaluate
        if (selector.includes(':has-text')) {
          const textMatch = selector.match(/:has-text\("([^"]+)"\)/);
          if (textMatch) {
            const searchText = textMatch[1].toLowerCase();
            const tagType = selector.split(':')[0];
            
            const result = await page.evaluate((tag, text) => {
              const elements = document.querySelectorAll(tag);
              for (const el of elements) {
                const elText = el.textContent?.toLowerCase() || '';
                if (elText.includes(text.toLowerCase())) {
                  (el as HTMLElement).click();
                  return { found: true, text: el.textContent?.trim() };
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
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              const buttonText = await element.evaluate(el => el.textContent?.trim());
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

    // Fallback: Alle Buttons durchsuchen und nach Text filtern
    try {
      const result = await page.evaluate((patterns: string[]) => {
        const allButtons = document.querySelectorAll('button, a[role="button"], [role="button"], input[type="button"], input[type="submit"]');
        
        for (const button of allButtons) {
          const text = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          const title = button.getAttribute('title')?.toLowerCase() || '';
          
          const combinedText = `${text} ${ariaLabel} ${title}`;
          
          for (const pattern of patterns) {
            if (combinedText.includes(pattern)) {
              // Prüfen ob sichtbar
              const rect = button.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                (button as HTMLElement).click();
                return { found: true, text: button.textContent?.trim() };
              }
            }
          }
        }
        return { found: false };
      }, textPatterns);

      if (result.found) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { found: true, clicked: true, buttonText: result.text };
      }
    } catch {
      // Fallback fehlgeschlagen
    }

    return { found: false, clicked: false };
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
    ];

    const savePatterns = [
      'speichern',
      'save',
      'nur essenzielle',
      'nur essenziell',
      'nur notwendige',
      'nur erforderliche',
      'only essential',
      'only necessary',
      'essential only',
      'necessary only',
    ];

    // Versuche verschiedene Selektoren
    for (const selector of saveSelectors) {
      try {
        if (selector.includes(':has-text')) {
          const textMatch = selector.match(/:has-text\("([^"]+)"\)/);
          if (textMatch) {
            const searchText = textMatch[1].toLowerCase();
            const tagType = selector.split(':')[0];
            
            const result = await page.evaluate((tag, text) => {
              const elements = document.querySelectorAll(tag);
              for (const el of elements) {
                const elText = el.textContent?.toLowerCase() || '';
                if (elText.includes(text.toLowerCase())) {
                  (el as HTMLElement).click();
                  return { found: true, text: el.textContent?.trim() };
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
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              const buttonText = await element.evaluate(el => el.textContent?.trim());
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

    // Fallback: Alle Buttons durchsuchen
    try {
      const result = await page.evaluate((patterns: string[]) => {
        const allButtons = document.querySelectorAll('button, a[role="button"], [role="button"], input[type="button"], input[type="submit"]');
        
        for (const button of allButtons) {
          const text = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          const title = button.getAttribute('title')?.toLowerCase() || '';
          
          const combinedText = `${text} ${ariaLabel} ${title}`;
          
          for (const pattern of patterns) {
            if (combinedText.includes(pattern)) {
              const rect = button.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                (button as HTMLElement).click();
                return { found: true, text: button.textContent?.trim() };
              }
            }
          }
        }
        return { found: false };
      }, savePatterns);

      if (result.found) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { found: true, clicked: true, buttonText: result.text };
      }
    } catch {
      // Fallback fehlgeschlagen
    }

    return { found: false, clicked: false };
  }

  // Cookie-Consent-Test durchführen
  async performCookieConsentTest(url: string): Promise<CookieConsentTestData> {
    if (!this.browser) {
      await this.init();
    }

    const result: CookieConsentTestData = {
      beforeConsent: { cookies: [] },
      afterAccept: { cookies: [], clickSuccessful: false, buttonFound: false },
      afterReject: { cookies: [], clickSuccessful: false, buttonFound: false },
    };

    // Test 1: Cookies vor Consent + Akzeptieren
    const pageAccept = await this.browser!.newPage();
    await this.setupPage(pageAccept);
    
    try {
      await pageAccept.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Cookies VOR jeder Interaktion sammeln
      const cookiesBefore = await pageAccept.cookies();
      result.beforeConsent.cookies = cookiesBefore.map(c => this.mapCookie(c));

      // Akzeptieren-Button finden und klicken
      const acceptResult = await this.findAndClickConsentButton(pageAccept, 'accept');
      result.afterAccept.buttonFound = acceptResult.found;
      result.afterAccept.clickSuccessful = acceptResult.clicked;
      result.afterAccept.buttonText = acceptResult.buttonText;

      // Warten auf Cookie-Änderungen
      if (acceptResult.clicked) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Cookies NACH Akzeptieren sammeln
      const cookiesAfterAccept = await pageAccept.cookies();
      result.afterAccept.cookies = cookiesAfterAccept.map(c => this.mapCookie(c));

    } finally {
      await pageAccept.close();
    }

    // Test 2: Ablehnen in neuem, sauberen Tab
    const pageReject = await this.browser!.newPage();
    await this.setupPage(pageReject);
    
    // Cookies löschen für sauberen Test
    const client = await pageReject.createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    try {
      await pageReject.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Ablehnen-Button finden und klicken
      const rejectResult = await this.findAndClickConsentButton(pageReject, 'reject');
      
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
            await new Promise(resolve => setTimeout(resolve, 2000));
            const cookiesAfterSave = await pageReject.cookies();
            result.afterReject.cookies = cookiesAfterSave.map(c => this.mapCookie(c));
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

        // Warten auf Cookie-Änderungen
        if (rejectResult.clicked) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Cookies NACH Ablehnen sammeln
        const cookiesAfterReject = await pageReject.cookies();
        result.afterReject.cookies = cookiesAfterReject.map(c => this.mapCookie(c));
      }

    } finally {
      await pageReject.close();
    }

    return result;
  }

  private async setupPage(page: Page): Promise<void> {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });
  }

  private mapCookie(cookie: { name: string; value: string; domain: string; path: string; expires: number; httpOnly?: boolean; secure: boolean; sameSite?: string }): CookieData {
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly ?? false,
      secure: cookie.secure,
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
