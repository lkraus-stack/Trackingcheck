import puppeteer from 'puppeteer';

async function run(url: string, action: 'accept' | 'reject') {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const result = await page.evaluate((action) => {
    const win = window as unknown as Record<string, any>;
    const callFirst = (obj: any, methods: string[]) => {
      for (const method of methods) {
        const fn = obj?.[method];
        if (typeof fn === 'function') {
          try {
            fn.call(obj);
            return method;
          } catch {
            // ignore
          }
        }
      }
      return undefined;
    };
    const callWithSource = (obj: any, methods: string[], source: string) => {
      const method = callFirst(obj, methods);
      return method ? `${source}.${method}` : undefined;
    };

    let method: string | undefined;

    if (win.UC_UI) {
      if (action === 'accept') {
        method = callWithSource(win.UC_UI, ['acceptAllConsents', 'acceptAll'], 'UC_UI');
      } else {
        method = callWithSource(win.UC_UI, ['denyAllConsents', 'denyAll', 'rejectAllConsents', 'rejectAll'], 'UC_UI');
      }
    }

    if (!method && win.consentApi) {
      if (action === 'accept') {
        method = callWithSource(win.consentApi, ['consentAll'], 'consentApi');
      } else {
        method = callWithSource(win.consentApi, ['consent'], 'consentApi');
      }
    }

    return { applied: Boolean(method), method };
  }, action);

  const cookies = await page.cookies();
  await page.close();
  await browser.close();
  return { result, cookieCount: cookies.length };
}

async function main() {
  console.log(await run('https://www.franco-consulting.com/', 'accept'));
  console.log(await run('https://www.rhoen-park-hotel.de/', 'accept'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
