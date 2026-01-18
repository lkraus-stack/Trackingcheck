import puppeteer from 'puppeteer';

type InspectDeepResult = {
  url: string;
  ucUiType?: string;
  ucUiProps?: string[];
  ucUiProtoProps?: string[];
  rcbType?: string;
  rcbProps?: string[];
  rcbProtoProps?: string[];
  rcbConsentType?: string;
  rcbConsentProps?: string[];
  rcbConsentProtoProps?: string[];
};

const urls = [
  'https://www.rhoen-park-hotel.de/',
  'https://www.franco-consulting.com/',
];

async function inspect(url: string): Promise<InspectDeepResult> {
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
    const ucUi = (window as any).UC_UI;
    const rcb = (window as any).realCookieBanner;
    const rcbConsent = (window as any).rcbConsentManager;

    const getProps = (obj: any) => obj ? Object.getOwnPropertyNames(obj) : undefined;
    const getProtoProps = (obj: any) => {
      if (!obj) return undefined;
      const proto = Object.getPrototypeOf(obj);
      return proto ? Object.getOwnPropertyNames(proto) : undefined;
    };

    return {
      ucUiType: typeof ucUi,
      ucUiProps: getProps(ucUi),
      ucUiProtoProps: getProtoProps(ucUi),
      rcbType: typeof rcb,
      rcbProps: getProps(rcb),
      rcbProtoProps: getProtoProps(rcb),
      rcbConsentType: typeof rcbConsent,
      rcbConsentProps: getProps(rcbConsent),
      rcbConsentProtoProps: getProtoProps(rcbConsent),
    } as InspectDeepResult;
  });

  await page.close();
  await browser.close();
  return { url, ...result };
}

async function main() {
  for (const url of urls) {
    console.log(`\nInspecting ${url} ...`);
    try {
      const res = await inspect(url);
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
