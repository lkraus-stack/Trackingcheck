/**
 * Test der korrigierten API-Aufrufe - Version 3
 */

import puppeteer from 'puppeteer';

async function debugV3() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  const url = 'https://www.rhoen-park-hotel.de/';
  console.log(`\n🔍 API-Test V3 für: ${url}\n`);
  
  try {
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test verschiedene Aufruf-Methoden
    console.log('📊 Test verschiedener API-Aufruf-Methoden:\n');
    
    // Methode 1: Direkte Zuweisung ohne Spread
    const test1 = await page.evaluate(() => {
      try {
        const win = window as any;
        const groups = win.rcbConsentManager?.getOptions?.()?.groups || [];
        
        // Einfach alle Gruppen-IDs sammeln
        const allGroupIds = groups.map((g: any) => g.id);
        const allItemIds: number[] = [];
        for (const g of groups) {
          if (g.items) {
            for (const item of g.items) {
              allItemIds.push(item.id);
            }
          }
        }
        
        console.log('Gruppen:', allGroupIds);
        console.log('Items:', allItemIds);
        
        // Versuche consent() für einzelne Items
        if (win.consentApi?.consent && allItemIds.length > 0) {
          // consent() erwartet wahrscheinlich einzelne Item-IDs
          let successCount = 0;
          for (const itemId of allItemIds.slice(0, 3)) { // Nur erste 3 testen
            try {
              win.consentApi.consent(itemId);
              successCount++;
            } catch (e) {
              console.error('consent() error:', e);
            }
          }
          return { method: 'consent(itemId)', success: successCount > 0, count: successCount };
        }
        
        return { method: 'none', success: false, error: 'consent nicht verfügbar' };
      } catch (e: any) {
        return { method: 'error', success: false, error: e.message };
      }
    });
    
    console.log(`   Methode 1 (consent pro Item): ${test1.success ? '✅' : '❌'} ${JSON.stringify(test1)}`);
    
    // Methode 2: consentSync
    const test2 = await page.evaluate(() => {
      try {
        const win = window as any;
        const groups = win.rcbConsentManager?.getOptions?.()?.groups || [];
        
        if (win.consentApi?.consentSync) {
          // consentSync könnte ein anderes Format erwarten
          const essentialGroup = groups.find((g: any) => !g.isEssential);
          if (essentialGroup && essentialGroup.items?.length > 0) {
            const itemId = essentialGroup.items[0].id;
            win.consentApi.consentSync(itemId);
            return { method: 'consentSync(itemId)', success: true, itemId };
          }
        }
        
        return { method: 'consentSync', success: false, error: 'nicht verfügbar oder keine Items' };
      } catch (e: any) {
        return { method: 'consentSync', success: false, error: e.message };
      }
    });
    
    console.log(`   Methode 2 (consentSync): ${test2.success ? '✅' : '❌'} ${JSON.stringify(test2)}`);
    
    // Methode 3: Prüfe die genaue Signatur von consentAll
    const test3 = await page.evaluate(() => {
      try {
        const win = window as any;
        if (win.consentApi?.consentAll) {
          // Prüfe die Funktions-Signatur
          const fnStr = win.consentApi.consentAll.toString().substring(0, 200);
          return { method: 'consentAll signature', signature: fnStr };
        }
        return { method: 'none', error: 'consentAll nicht verfügbar' };
      } catch (e: any) {
        return { method: 'error', error: e.message };
      }
    });
    
    console.log(`   Methode 3 (Signatur): ${JSON.stringify(test3, null, 2)}`);
    
    // Methode 4: Versuche mit Boolean-Argument (alle akzeptieren = true)
    const test4 = await page.evaluate(() => {
      try {
        const win = window as any;
        if (win.consentApi?.consentAll) {
          // Vielleicht erwartet es einfach ein true/false?
          win.consentApi.consentAll(true);
          return { method: 'consentAll(true)', success: true };
        }
        return { method: 'none', success: false };
      } catch (e: any) {
        return { method: 'consentAll(true)', success: false, error: e.message };
      }
    });
    
    console.log(`   Methode 4 (consentAll(true)): ${test4.success ? '✅' : '❌'} ${JSON.stringify(test4)}`);
    
    // Prüfe Cookies
    await new Promise(resolve => setTimeout(resolve, 2000));
    const cookies = await page.cookies();
    
    console.log(`\n📊 Cookies: ${cookies.length}`);
    const rcbCookie = cookies.find(c => c.name.includes('rcb') || c.name.includes('real_cookie') || c.name.includes('consent'));
    if (rcbCookie) {
      console.log(`   ✅ Consent-Cookie gefunden: ${rcbCookie.name}`);
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await browser.close();
  }
}

debugV3().catch(console.error);
