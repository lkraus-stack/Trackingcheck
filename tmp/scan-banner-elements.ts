import puppeteer from 'puppeteer';

type Match = {
  text: string;
  tag: string;
  id?: string;
  className?: string;
  attrs: Record<string, string>;
  selector: string;
};

const urls = [
  'https://www.rhoen-park-hotel.de/',
  'https://www.franco-consulting.com/',
];

const patterns = [
  'akzeptieren',
  'alle akzeptieren',
  'zustimmen',
  'einverstanden',
  'accept',
  'accept all',
  'ablehnen',
  'alle ablehnen',
  'reject',
  'reject all',
  'decline',
  'nur notwendige',
  'nur essenzielle',
  'nur erforderliche',
  'only necessary',
  'only essential',
  'essential only',
  'necessary only',
  'einstellungen',
  'cookie-einstellungen',
  'datenschutzeinstellungen',
  'preferences',
  'settings',
  'manage',
  'save',
  'speichern',
];

async function scan(url: string): Promise<Match[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3500));

  const matches = await page.evaluate((patterns) => {
    const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
    const texts = patterns.map(normalize);

    const pickAttrs = (el: Element) => {
      const attrs: Record<string, string> = {};
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('data-') || attr.name.startsWith('aria-') || attr.name === 'title' || attr.name === 'value') {
          attrs[attr.name] = attr.value;
        }
      }
      return attrs;
    };

    const buildSelector = (el: Element) => {
      const id = el.getAttribute('id');
      if (id) return `#${CSS.escape(id)}`;
      const dataTestId = el.getAttribute('data-testid');
      if (dataTestId) return `[data-testid="${dataTestId}"]`;
      const dataAction = el.getAttribute('data-action');
      if (dataAction) return `[data-action="${dataAction}"]`;
      const dataConsent = el.getAttribute('data-consent');
      if (dataConsent) return `[data-consent="${dataConsent}"]`;
      const dataRcb = el.getAttribute('data-rcb-action');
      if (dataRcb) return `[data-rcb-action="${dataRcb}"]`;
      const className = el.getAttribute('class');
      if (className) {
        const classes = className.split(/\s+/).filter(Boolean).slice(0, 3);
        if (classes.length) return `${el.tagName.toLowerCase()}.${classes.map(c => CSS.escape(c)).join('.')}`;
      }
      return el.tagName.toLowerCase();
    };

    const elements = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'));
    const results: any[] = [];

    for (const el of elements) {
      const text = normalize(el.textContent || '');
      const aria = normalize(el.getAttribute('aria-label') || '');
      const title = normalize(el.getAttribute('title') || '');
      const value = normalize((el as HTMLInputElement).value || '');
      const combined = `${text} ${aria} ${title} ${value}`.trim();
      if (!combined) continue;

      if (texts.some(p => combined.includes(p))) {
        results.push({
          text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || (el as HTMLInputElement).value || '').trim(),
          tag: el.tagName.toLowerCase(),
          id: el.getAttribute('id') || undefined,
          className: el.getAttribute('class') || undefined,
          attrs: pickAttrs(el),
          selector: buildSelector(el),
        });
      }
    }

    return results;
  }, patterns);

  await page.close();
  await browser.close();
  return matches as Match[];
}

async function main() {
  for (const url of urls) {
    console.log(`\nMatches for ${url}`);
    try {
      const res = await scan(url);
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
