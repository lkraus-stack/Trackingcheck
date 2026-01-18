import puppeteer from 'puppeteer';

async function run() {
  const url = 'https://www.rhoen-park-hotel.de/';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3000));

  const before = await page.evaluate(() => {
    const mgr = (window as any).rcbConsentManager;
    const api = (window as any).consentApi;
    return {
      hasConsentApi: Boolean((window as any).consentApi),
      userDecision: mgr?.getUserDecision?.(),
      defaultDecision: mgr?.getDefaultDecision?.(),
      consentQueueName: mgr?.getConsentQueueName?.(),
      consentQueue: mgr?.getConsentQueue?.(),
      options: mgr?.getOptions?.(),
      consentAllFn: api?.consentAll ? api.consentAll.toString().slice(0, 300) : undefined,
      consentFn: api?.consent ? api.consent.toString().slice(0, 300) : undefined,
      persistConsentArity: typeof mgr?.persistConsent === 'function' ? mgr.persistConsent.length : undefined,
    };
  });

  const actionResult = await page.evaluate(() => {
    const mgr = (window as any).rcbConsentManager;
    const api = (window as any).consentApi;
    if (!mgr || !api) {
      return { applied: false, error: 'rcbConsentManager/consentApi missing' };
    }
    try {
      const options = mgr.getOptions?.();
      const groups = Array.isArray(options?.groups) ? options.groups : [];
      const args = groups
        .filter((group: any) => group && Array.isArray(group.items))
        .map((group: any) => [group.id, group.items.map((item: any) => item.id).filter(Boolean)]);

      if (typeof api.consentAll === 'function') {
        api.consentAll(...args);
        return { applied: true, mode: 'consentAll', argsCount: args.length };
      }
      return { applied: false, error: 'consentAll not available' };
    } catch (error) {
      return { applied: false, error: String(error) };
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  const after = await page.evaluate(() => {
    const mgr = (window as any).rcbConsentManager;
    return {
      userDecision: mgr?.getUserDecision?.(),
      defaultDecision: mgr?.getDefaultDecision?.(),
    };
  });

  console.log(JSON.stringify({ before, actionResult, after }, null, 2));
  await page.close();
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
