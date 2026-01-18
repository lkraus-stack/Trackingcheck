/**
 * Debug: Teste applyCmpConsentViaApi direkt
 */

import puppeteer from 'puppeteer';

async function testApplyApiDebug() {
  console.log('\n🔍 Direct applyCmpConsentViaApi Test\n');
  
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
    
    // Exakt der Code aus applyCmpConsentViaApi (mit function statt arrow)
    const result = await page.evaluate((action: string) => {
      const win = window as unknown as Record<string, any>;
      
      function tryCallMethod(obj: any, methodNames: string[]): string | undefined {
        for (let i = 0; i < methodNames.length; i++) {
          const methodName = methodNames[i];
          const fn = obj && obj[methodName];
          if (typeof fn === 'function') {
            try {
              fn.call(obj);
              return methodName;
            } catch (e) {
              // ignore
            }
          }
        }
        return undefined;
      }

      let method: string | undefined;
      
      // Real Cookie Banner API
      if (!method && win.consentApi) {
        const rcbManager = win.rcbConsentManager;
        const options = rcbManager?.getOptions?.();
        const groups = options?.groups || [];
        
        const allItemIds: number[] = [];
        const essentialItemIds: number[] = [];
        
        for (const g of groups) {
          if (g && g.items) {
            for (const item of g.items) {
              if (item && item.id !== undefined) {
                allItemIds.push(item.id);
                if (g.isEssential) {
                  essentialItemIds.push(item.id);
                }
              }
            }
          }
        }
        
        console.log('[DEBUG] allItemIds:', allItemIds.length);
        console.log('[DEBUG] action:', action);
        
        if (action === 'accept') {
          if (typeof win.consentApi.consent === 'function' && allItemIds.length > 0) {
            try {
              let successCount = 0;
              for (const itemId of allItemIds) {
                try {
                  win.consentApi.consent(itemId);
                  successCount++;
                } catch {
                  // ignore
                }
              }
              console.log('[DEBUG] successCount:', successCount);
              if (successCount > 0) {
                method = 'consentApi.consent (' + successCount + ' items)';
              }
            } catch (e) {
              console.log('[DEBUG] error:', e);
            }
          }
        }
      }
      
      console.log('[DEBUG] final method:', method);
      return { applied: Boolean(method), method };
    }, 'accept');
    
    console.log('📊 Ergebnis:', result);
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await browser.close();
  }
}

testApplyApiDebug().catch(console.error);
