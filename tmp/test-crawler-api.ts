/**
 * Test des Crawler API-Aufrufs direkt
 */

import { WebCrawler } from '../src/lib/analyzer/crawler';
import puppeteer from 'puppeteer';

async function testCrawlerApi() {
  console.log('\n🔍 Direkter Test der Crawler-Methoden\n');
  
  // Erstelle einen eigenen Browser-Kontext wie der Crawler
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  const url = 'https://www.rhoen-park-hotel.de/';
  
  try {
    // Schritt 1: Storage löschen (wie clearStorage)
    const client = await page.createCDPSession();
    const origin = new URL(url).origin;
    await client.send('Storage.clearDataForOrigin', {
      origin,
      storageTypes: 'all',
    });
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    console.log('1️⃣ Storage gelöscht');
    
    // Schritt 2: Seite laden
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('2️⃣ Seite geladen');
    
    // Schritt 3: Warten (wie im Crawler)
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('3️⃣ 1.5s gewartet');
    
    // Schritt 4: Prüfe ob API vorhanden
    const hasApi = await page.evaluate(() => {
      const win = window as any;
      return {
        consentApi: !!win.consentApi,
        rcbConsentManager: !!win.rcbConsentManager,
        consentMethods: win.consentApi ? Object.keys(win.consentApi).filter(k => typeof win.consentApi[k] === 'function') : []
      };
    });
    console.log('4️⃣ API Check:', hasApi);
    
    // Schritt 5: Führe den exakten Code aus applyCmpConsentViaApi aus
    console.log('\n5️⃣ Führe applyCmpConsentViaApi-Code aus...');
    
    const result = await page.evaluate((action: 'accept' | 'reject') => {
      const win = window as unknown as Record<string, any>;
      let method: string | undefined;
      
      const callFirst = (obj: any, methods: string[], args?: any[]) => {
        for (const m of methods) {
          const fn = obj?.[m];
          if (typeof fn === 'function') {
            try {
              if (Array.isArray(args) && args.length > 0) {
                fn.call(obj, ...args);
              } else {
                fn.call(obj);
              }
              return m;
            } catch {
              // ignore
            }
          }
        }
        return undefined;
      };
      
      const callWithSource = (obj: any, methods: string[], source: string, args?: any[]) => {
        const m = callFirst(obj, methods, args);
        return m ? `${source}.${m}` : undefined;
      };
      
      // Real Cookie Banner API
      if (!method && win.consentApi) {
        const rcbManager = win.rcbConsentManager;
        const options = rcbManager?.getOptions?.();
        const groups = options?.groups || [];
        
        // Sammle alle Item-IDs
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
        
        console.log('Item IDs gesammelt:', allItemIds.length);
        
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
              if (successCount > 0) {
                method = `consentApi.consent (${successCount} items)`;
              }
            } catch {
              // ignore
            }
          }
        } else {
          if (typeof win.consentApi.consent === 'function' && essentialItemIds.length > 0) {
            try {
              for (const itemId of essentialItemIds) {
                try {
                  win.consentApi.consent(itemId);
                } catch {
                  // ignore
                }
              }
              method = `consentApi.consent (essential only, ${essentialItemIds.length} items)`;
            } catch {
              // ignore
            }
          }
        }
      }
      
      return { applied: Boolean(method), method };
    }, 'accept');
    
    console.log('   Ergebnis:', result);
    
    // Schritt 6: Cookies prüfen
    await new Promise(resolve => setTimeout(resolve, 2000));
    const cookies = await page.cookies();
    console.log(`\n6️⃣ Cookies nach Consent: ${cookies.length}`);
    
    const trackingCookies = cookies.filter(c => 
      c.name.includes('_ga') || c.name.includes('_fbp') || c.name.includes('_gid')
    );
    console.log(`   Tracking-Cookies: ${trackingCookies.length}`);
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await browser.close();
  }
}

testCrawlerApi().catch(console.error);
