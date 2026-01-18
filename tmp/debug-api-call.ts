/**
 * Direkter Test des applyCmpConsentViaApi Codes
 */

import puppeteer from 'puppeteer';

async function debugApiCall() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  const url = 'https://www.rhoen-park-hotel.de/';
  console.log(`\n🔍 API-Aufruf Test für: ${url}\n`);
  
  try {
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Führe exakt den gleichen Code aus wie applyCmpConsentViaApi
    const result = await page.evaluate((action: 'accept' | 'reject') => {
      const win = window as unknown as Record<string, any>;
      let method: string | undefined;
      
      console.log('=== START API AUFRUF ===');
      console.log('consentApi vorhanden:', !!win.consentApi);
      console.log('rcbConsentManager vorhanden:', !!win.rcbConsentManager);
      
      if (win.consentApi) {
        const rcbManager = win.rcbConsentManager;
        const options = rcbManager?.getOptions?.();
        const groups = options?.groups || [];
        
        console.log('Gruppen:', groups.length);
        console.log('Typ von groups:', typeof groups, Array.isArray(groups));
        
        // Sammle alle Item-IDs
        const allItemIds: number[] = [];
        
        for (const g of groups) {
          console.log('Gruppe:', g?.id, g?.name, 'Items:', g?.items?.length);
          if (g && g.items) {
            for (const item of g.items) {
              if (item && item.id !== undefined) {
                allItemIds.push(item.id);
              }
            }
          }
        }
        
        console.log('Alle Item-IDs:', allItemIds);
        
        if (action === 'accept') {
          if (typeof win.consentApi.consent === 'function' && allItemIds.length > 0) {
            try {
              let successCount = 0;
              for (const itemId of allItemIds) {
                try {
                  win.consentApi.consent(itemId);
                  successCount++;
                } catch (e) {
                  console.log('consent() Fehler für Item', itemId, ':', e);
                }
              }
              console.log('successCount:', successCount);
              if (successCount > 0) {
                method = `consentApi.consent (${successCount} items)`;
              }
            } catch (e) {
              console.log('Outer try-catch error:', e);
            }
          } else {
            console.log('consent nicht verfügbar oder keine Items');
          }
        }
      }
      
      console.log('Finale Methode:', method);
      return { applied: Boolean(method), method };
    }, 'accept');
    
    console.log('\n📊 Ergebnis:');
    console.log(`   applied: ${result.applied}`);
    console.log(`   method: ${result.method || 'nicht gesetzt'}`);
    
    // Prüfe Cookies
    await new Promise(resolve => setTimeout(resolve, 2000));
    const cookies = await page.cookies();
    console.log(`\n📊 Cookies: ${cookies.length}`);
    
    const trackingCookies = cookies.filter(c => 
      c.name.includes('_ga') || c.name.includes('_fbp') || c.name.includes('_gid')
    );
    console.log(`   Tracking-Cookies: ${trackingCookies.length}`);
    for (const c of trackingCookies) {
      console.log(`      - ${c.name}`);
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await browser.close();
  }
}

debugApiCall().catch(console.error);
