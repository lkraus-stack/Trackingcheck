/**
 * Tiefgehender Debug-Test für Cookie-Banner
 */

import puppeteer from 'puppeteer';

async function debugDeep() {
  const browser = await puppeteer.launch({
    headless: true, // auf false setzen für visuelle Prüfung
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // Neuer Kontext (isoliert, ohne gespeicherte Cookies)
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  const url = 'https://www.rhoen-park-hotel.de/';
  console.log(`\n🔍 Deep Debug für: ${url}\n`);
  
  try {
    // Storage löschen
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    
    console.log('1️⃣ Storage gelöscht');
    
    // Seite laden
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('2️⃣ Seite geladen');
    
    // Warte auf potenzielle Banner
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('3️⃣ 3 Sekunden gewartet');
    
    // Prüfe APIs
    const apiCheck = await page.evaluate(() => {
      const win = window as any;
      return {
        hasConsentApi: typeof win.consentApi !== 'undefined',
        hasRcbConsentManager: typeof win.rcbConsentManager !== 'undefined',
        consentApiMethods: win.consentApi ? Object.keys(win.consentApi).filter(k => typeof win.consentApi[k] === 'function') : [],
        rcbOptions: win.rcbConsentManager?.getOptions?.() ? {
          groupCount: win.rcbConsentManager.getOptions()?.groups?.length || 0,
          groups: (win.rcbConsentManager.getOptions()?.groups || []).map((g: any) => ({
            id: g.id,
            name: g.name,
            isEssential: g.isEssential
          }))
        } : null
      };
    });
    
    console.log('\n📊 API-Check:');
    console.log(`   consentApi: ${apiCheck.hasConsentApi ? '✅ vorhanden' : '❌ fehlt'}`);
    console.log(`   rcbConsentManager: ${apiCheck.hasRcbConsentManager ? '✅ vorhanden' : '❌ fehlt'}`);
    console.log(`   consentApi Methoden: ${apiCheck.consentApiMethods.join(', ') || 'keine'}`);
    if (apiCheck.rcbOptions) {
      console.log(`   RCB Gruppen: ${apiCheck.rcbOptions.groupCount}`);
      for (const g of apiCheck.rcbOptions.groups) {
        console.log(`      - ${g.name} (ID: ${g.id}, Essential: ${g.isEssential})`);
      }
    }
    
    // Prüfe ob Banner sichtbar
    const bannerCheck = await page.evaluate(() => {
      // Suche nach typischen Banner-Elementen
      const bannerSelectors = [
        '#rcb-cookie-banner',
        '.rcb-cookie-banner',
        '[data-rcb-root]',
        '#cookie-banner',
        '.cookie-banner',
        '[role="dialog"]',
        '[role="alertdialog"]',
        '.consent-modal',
        '.cookie-consent',
        '.cc-banner',
        '.gdpr-banner'
      ];
      
      let bannerFound = null;
      for (const sel of bannerSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const rect = (el as HTMLElement).getBoundingClientRect();
          const style = window.getComputedStyle(el as HTMLElement);
          bannerFound = {
            selector: sel,
            visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
            dimensions: `${rect.width}x${rect.height}`,
            position: `(${rect.left}, ${rect.top})`
          };
          break;
        }
      }
      
      // Suche nach Buttons mit consent-relevanten Texten
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], [role="button"]'));
      const consentButtons = buttons.filter(b => {
        const text = b.textContent?.toLowerCase() || '';
        return text.includes('akzeptieren') || text.includes('ablehnen') || 
               text.includes('zustimmen') || text.includes('accept') || 
               text.includes('reject') || text.includes('notwendig') ||
               text.includes('essenziell') || text.includes('alle');
      }).map(b => ({
        tag: b.tagName,
        text: b.textContent?.trim()?.substring(0, 50),
        visible: (b as HTMLElement).offsetParent !== null
      }));
      
      return { bannerFound, consentButtons };
    });
    
    console.log('\n📊 Banner-Check:');
    if (bannerCheck.bannerFound) {
      console.log(`   Banner gefunden: ${bannerCheck.bannerFound.selector}`);
      console.log(`   Sichtbar: ${bannerCheck.bannerFound.visible}`);
      console.log(`   Größe: ${bannerCheck.bannerFound.dimensions}`);
    } else {
      console.log('   ❌ Kein Banner-Element gefunden');
    }
    
    console.log('\n📊 Consent-Buttons im DOM:');
    if (bannerCheck.consentButtons.length > 0) {
      for (const btn of bannerCheck.consentButtons) {
        console.log(`   - <${btn.tag}>: "${btn.text}" (sichtbar: ${btn.visible})`);
      }
    } else {
      console.log('   ❌ Keine Consent-Buttons gefunden');
    }
    
    // Versuche API-Aufruf
    console.log('\n📊 API-Test:');
    const apiTest = await page.evaluate(() => {
      const win = window as any;
      
      if (win.consentApi && typeof win.consentApi.consentAll === 'function') {
        try {
          const rcbManager = win.rcbConsentManager;
          const options = rcbManager?.getOptions?.();
          const groups = Array.isArray(options?.groups) ? options.groups : [];
          
          // Erstelle Consent-Args für alle Gruppen
          const consentArgs = groups
            .filter((g: any) => g && g.id !== undefined && Array.isArray(g.items))
            .map((g: any) => [g.id, g.items.map((i: any) => i.id).filter(Boolean)]);
          
          if (consentArgs.length > 0) {
            win.consentApi.consentAll(...consentArgs);
            return { success: true, method: 'consentApi.consentAll', args: consentArgs.length };
          }
        } catch (e) {
          return { success: false, error: String(e) };
        }
      }
      
      return { success: false, error: 'API nicht verfügbar' };
    });
    
    if (apiTest.success) {
      console.log(`   ✅ ${apiTest.method} erfolgreich (${apiTest.args} Gruppen)`);
    } else {
      console.log(`   ❌ ${apiTest.error}`);
    }
    
    // Warte und sammle Cookies
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const cookies = await page.cookies();
    console.log(`\n📊 Cookies nach API-Call: ${cookies.length}`);
    for (const c of cookies.slice(0, 5)) {
      console.log(`   - ${c.name}: ${c.value.substring(0, 30)}...`);
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await browser.close();
  }
}

debugDeep().catch(console.error);
