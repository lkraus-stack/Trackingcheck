import puppeteer from 'puppeteer';

type InspectResult = {
  url: string;
  globals: string[];
  ucUiKeys?: string[];
  ucUiOwnKeys?: string[];
  ucUiType?: string;
  ucUiProtoKeys?: string[];
  ucCmpKeys?: string[];
  ucCmpControllerKeys?: string[];
  ucCmpViewKeys?: string[];
  ucCmpConsentServiceKeys?: string[];
  ucCmpConsentServiceProtoKeys?: string[];
  ucCmpControllerConsentType?: string;
  ucCmpControllerConsentKeys?: string[];
  cookieConsentKeys?: string[];
  rcbKeys?: string[];
  rcbConsentManagerKeys?: string[];
  rcbConsentManagerProtoKeys?: string[];
  realCookieBannerKeys?: string[];
  realCookieBannerProtoKeys?: string[];
  consentApiKeys?: string[];
  consentApiProtoKeys?: string[];
  consentApiConsentArity?: number;
  consentApiConsentAllArity?: number;
  rcbDefaultDecision?: unknown;
  rcbUserDecision?: unknown;
};

const urls = [
  'https://www.rhoen-park-hotel.de/',
  'https://www.franco-consulting.com/',
];

async function inspect(url: string): Promise<InspectResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const globalKeys = Object.keys(window);
    const interesting = globalKeys.filter(k => {
      const lower = k.toLowerCase();
      return lower.includes('consent') || lower.includes('cookie') || lower.includes('uc') || lower.includes('usercentrics') || lower.includes('rcb');
    });

    const ucUi = (window as any).UC_UI || (window as any).uc_ui || (window as any).ucUI;
    const ucCmp = (window as any).__ucCmp;
    const ucCmpController = ucCmp?.cmpController;
    const ucCmpControllerConsent = ucCmpController?.consent;
    const ucCmpView = ucCmp?.cmpView;
    const ucCmpConsentService = ucCmpController?.consentService;
    const cookieConsent = (window as any).CookieConsent || (window as any).cookieconsent;
    const rcb = (window as any).RCB || (window as any).rCB;
    const rcbConsentManager = (window as any).rcbConsentManager;
    const realCookieBanner = (window as any).realCookieBanner || (window as any).RealCookieBanner;
    const consentApi = (window as any).consentApi;

    return {
      globals: interesting.sort(),
      ucUiType: typeof ucUi,
      ucUiKeys: ucUi ? Object.keys(ucUi) : undefined,
      ucUiOwnKeys: ucUi ? Object.getOwnPropertyNames(ucUi) : undefined,
      ucUiProtoKeys: ucUi ? Object.getOwnPropertyNames(Object.getPrototypeOf(ucUi)) : undefined,
      ucCmpKeys: ucCmp ? Object.getOwnPropertyNames(ucCmp) : undefined,
      ucCmpControllerKeys: ucCmpController ? Object.getOwnPropertyNames(ucCmpController) : undefined,
      ucCmpControllerConsentType: typeof ucCmpControllerConsent,
      ucCmpControllerConsentKeys: ucCmpControllerConsent ? Object.getOwnPropertyNames(ucCmpControllerConsent) : undefined,
      ucCmpViewKeys: ucCmpView ? Object.getOwnPropertyNames(ucCmpView) : undefined,
      ucCmpConsentServiceKeys: ucCmpConsentService ? Object.getOwnPropertyNames(ucCmpConsentService) : undefined,
      ucCmpConsentServiceProtoKeys: ucCmpConsentService ? Object.getOwnPropertyNames(Object.getPrototypeOf(ucCmpConsentService)) : undefined,
      cookieConsentKeys: cookieConsent ? Object.keys(cookieConsent) : undefined,
      rcbKeys: rcb ? Object.keys(rcb) : undefined,
      rcbConsentManagerKeys: rcbConsentManager ? Object.getOwnPropertyNames(rcbConsentManager) : undefined,
      rcbConsentManagerProtoKeys: rcbConsentManager ? Object.getOwnPropertyNames(Object.getPrototypeOf(rcbConsentManager)) : undefined,
      realCookieBannerKeys: realCookieBanner ? Object.getOwnPropertyNames(realCookieBanner) : undefined,
      realCookieBannerProtoKeys: realCookieBanner ? Object.getOwnPropertyNames(Object.getPrototypeOf(realCookieBanner)) : undefined,
      consentApiKeys: consentApi ? Object.getOwnPropertyNames(consentApi) : undefined,
      consentApiProtoKeys: consentApi ? Object.getOwnPropertyNames(Object.getPrototypeOf(consentApi)) : undefined,
      consentApiConsentArity: typeof consentApi?.consent === 'function' ? consentApi.consent.length : undefined,
      consentApiConsentAllArity: typeof consentApi?.consentAll === 'function' ? consentApi.consentAll.length : undefined,
      rcbDefaultDecision: rcbConsentManager ? rcbConsentManager.getDefaultDecision?.() : undefined,
      rcbUserDecision: rcbConsentManager ? rcbConsentManager.getUserDecision?.() : undefined,
    } as InspectResult;
  });

  await page.close();
  await browser.close();
  return { url, ...result };
}

async function main() {
  const results: InspectResult[] = [];
  for (const url of urls) {
    console.log(`\nInspecting ${url} ...`);
    try {
      const res = await inspect(url);
      results.push(res);
      console.log(JSON.stringify(res, null, 2));
    } catch (error) {
      console.error(`Fehler: ${url}`, error);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
