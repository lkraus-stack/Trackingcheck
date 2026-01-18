/**
 * Test der korrigierten API-Aufrufe
 */

import puppeteer from 'puppeteer';

async function debugFix() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  const url = 'https://www.rhoen-park-hotel.de/';
  console.log(`\n🔍 Korrigierter API-Test für: ${url}\n`);
  
  try {
    // Storage löschen
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 1: Prüfe RCB Items genauer
    const itemCheck = await page.evaluate(() => {
      const win = window as any;
      const rcbManager = win.rcbConsentManager;
      const options = rcbManager?.getOptions?.();
      const groups = options?.groups || [];
      
      return groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        items: g.items ? (Array.isArray(g.items) ? g.items.map((i: any) => ({ id: i.id, name: i.name })) : 'nicht iterable') : 'keine items'
      }));
    });
    
    console.log('📊 RCB Gruppen/Items Struktur:');
    for (const g of itemCheck) {
      console.log(`   ${g.name} (ID: ${g.id}):`);
      if (Array.isArray(g.items)) {
        for (const i of g.items.slice(0, 3)) {
          console.log(`      - ${i.name} (ID: ${i.id})`);
        }
        if (g.items.length > 3) {
          console.log(`      ... und ${g.items.length - 3} weitere`);
        }
      } else {
        console.log(`      ${g.items}`);
      }
    }
    
    // Test 2: Korrigierter API-Aufruf
    console.log('\n📊 API-Aufruf Test:');
    
    // Methode A: consentAll mit einzelnen Gruppen-Arrays
    const testA = await page.evaluate(() => {
      const win = window as any;
      const rcbManager = win.rcbConsentManager;
      const options = rcbManager?.getOptions?.();
      const groups = options?.groups || [];
      
      try {
        // Baue Args als Array von Arrays
        const args: [number, number[]][] = [];
        for (const g of groups) {
          if (g && g.id !== undefined && g.items) {
            const itemIds: number[] = [];
            for (const item of g.items) {
              if (item && item.id !== undefined) {
                itemIds.push(item.id);
              }
            }
            if (itemIds.length > 0) {
              args.push([g.id, itemIds]);
            }
          }
        }
        
        console.log('Args:', JSON.stringify(args));
        
        if (args.length > 0 && win.consentApi?.consentAll) {
          // Rufe consentAll mit spread auf
          (win.consentApi.consentAll as Function).apply(null, args);
          return { success: true, method: 'consentAll.apply', argsCount: args.length };
        }
        
        return { success: false, error: 'Keine gültigen Gruppen' };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    });
    
    console.log(`   Methode A (consentAll.apply): ${testA.success ? '✅ ' + testA.method : '❌ ' + testA.error}`);
    
    // Cookies nach Consent prüfen
    await new Promise(resolve => setTimeout(resolve, 2000));
    const cookies = await page.cookies();
    console.log(`\n📊 Cookies nach Consent: ${cookies.length}`);
    
    // Prüfe ob RCB Cookie gesetzt wurde
    const rcbCookie = cookies.find(c => c.name.includes('rcb') || c.name.includes('real_cookie'));
    if (rcbCookie) {
      console.log(`   ✅ RCB Cookie: ${rcbCookie.name}`);
    } else {
      console.log('   ❌ Kein RCB Consent-Cookie gefunden');
    }
    
    // Prüfe Tracking-Cookies
    const trackingCookies = cookies.filter(c => 
      c.name.includes('_ga') || c.name.includes('_fbp') || c.name.includes('_gid') ||
      c.name.includes('_gcl') || c.name.includes('_fbc')
    );
    console.log(`\n📊 Tracking-Cookies: ${trackingCookies.length}`);
    for (const c of trackingCookies) {
      console.log(`   - ${c.name}`);
    }
    
    // Test 3: Alternativ - consentSync oder consent einzeln
    console.log('\n📊 Alternative Methoden:');
    
    const altMethods = await page.evaluate(() => {
      const win = window as any;
      const methods = [];
      
      if (win.consentApi) {
        if (typeof win.consentApi.consent === 'function') methods.push('consent');
        if (typeof win.consentApi.consentAll === 'function') methods.push('consentAll');
        if (typeof win.consentApi.consentSync === 'function') methods.push('consentSync');
      }
      
      return methods;
    });
    
    console.log(`   Verfügbare Methoden: ${altMethods.join(', ')}`);
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await browser.close();
  }
}

debugFix().catch(console.error);
