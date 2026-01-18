import puppeteer from 'puppeteer';

async function run() {
  const url = 'https://www.franco-consulting.com/';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3000));

  const before = await page.evaluate(() => ({
    hasUC: Boolean((window as any).UC_UI),
    initialized: typeof (window as any).UC_UI?.isInitialized === 'function' ? (window as any).UC_UI.isInitialized() : undefined,
  }));

  const actionResult = await page.evaluate(() => {
    const uc = (window as any).UC_UI;
    if (!uc || typeof uc.acceptAllConsents !== 'function') return { applied: false };
    try {
      uc.acceptAllConsents();
      return { applied: true };
    } catch (error) {
      return { applied: false, error: String(error) };
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  const after = await page.evaluate(() => ({
    initialized: typeof (window as any).UC_UI?.isInitialized === 'function' ? (window as any).UC_UI.isInitialized() : undefined,
  }));

  const cookies = await page.cookies();

  console.log(JSON.stringify({ before, actionResult, after, cookieCount: cookies.length }, null, 2));
  await page.close();
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
