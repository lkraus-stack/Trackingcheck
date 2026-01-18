/**
 * Debug: Teste applyCmpConsentViaApi mit String-basiertem evaluate
 */

import puppeteer from 'puppeteer';

async function testApplyApiString() {
  console.log('\n🔍 String-based applyCmpConsentViaApi Test\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  const url = 'https://www.rhoen-park-hotel.de/';
  
  try {
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verwende addScriptTag statt evaluate
    const result = await page.evaluate(`
      (function() {
        var win = window;
        var method;
        
        if (win.consentApi) {
          var rcbManager = win.rcbConsentManager;
          var options = rcbManager && rcbManager.getOptions ? rcbManager.getOptions() : null;
          var groups = (options && options.groups) || [];
          
          var allItemIds = [];
          
          for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            if (g && g.items) {
              for (var j = 0; j < g.items.length; j++) {
                var item = g.items[j];
                if (item && item.id !== undefined) {
                  allItemIds.push(item.id);
                }
              }
            }
          }
          
          console.log('[DEBUG] allItemIds:', allItemIds.length);
          
          if (typeof win.consentApi.consent === 'function' && allItemIds.length > 0) {
            var successCount = 0;
            for (var k = 0; k < allItemIds.length; k++) {
              try {
                win.consentApi.consent(allItemIds[k]);
                successCount++;
              } catch (e) {
                // ignore
              }
            }
            console.log('[DEBUG] successCount:', successCount);
            if (successCount > 0) {
              method = 'consentApi.consent (' + successCount + ' items)';
            }
          }
        }
        
        console.log('[DEBUG] final method:', method);
        return { applied: !!method, method: method };
      })()
    `);
    
    console.log('📊 Ergebnis:', result);
    
    // Cookies prüfen
    await new Promise(resolve => setTimeout(resolve, 2000));
    const cookies = await page.cookies();
    console.log(`📊 Cookies: ${cookies.length}`);
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await browser.close();
  }
}

testApplyApiString().catch(console.error);
