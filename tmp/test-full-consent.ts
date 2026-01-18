/**
 * Vollständiger Test des Cookie Consent Flows
 */

import { WebCrawler } from '../src/lib/analyzer/crawler';

async function testFullConsent() {
  console.log('\n🔍 Vollständiger Cookie Consent Test\n');
  
  const crawler = new WebCrawler();
  await crawler.init();
  
  const url = 'https://www.rhoen-park-hotel.de/';
  
  try {
    console.log('📊 Führe performCookieConsentTest aus...\n');
    const result = await crawler.performCookieConsentTest(url);
    
    console.log('=== ERGEBNIS ===\n');
    console.log('Vor Consent:');
    console.log(`  Cookies: ${result.beforeConsent.cookies.length}`);
    
    console.log('\nNach Accept:');
    console.log(`  Button gefunden: ${result.afterAccept.buttonFound}`);
    console.log(`  Click erfolgreich: ${result.afterAccept.clickSuccessful}`);
    console.log(`  Button Text: ${result.afterAccept.buttonText || 'N/A'}`);
    console.log(`  Cookies: ${result.afterAccept.cookies.length}`);
    if (result.afterAccept.cookies.length > 0) {
      console.log('  Cookie-Namen:', result.afterAccept.cookies.slice(0, 5).map(c => c.name).join(', '));
    }
    
    console.log('\nNach Reject:');
    console.log(`  Button gefunden: ${result.afterReject.buttonFound}`);
    console.log(`  Click erfolgreich: ${result.afterReject.clickSuccessful}`);
    console.log(`  Button Text: ${result.afterReject.buttonText || 'N/A'}`);
    console.log(`  Cookies: ${result.afterReject.cookies.length}`);
    
    // Bewertung
    console.log('\n=== BEWERTUNG ===\n');
    
    if (result.afterAccept.buttonFound && result.afterAccept.clicked) {
      if (result.afterAccept.buttonText?.includes('consentApi')) {
        console.log('✅ Accept via API funktioniert!');
      } else {
        console.log('✅ Accept via DOM-Klick funktioniert!');
      }
    } else {
      console.log('❌ Accept fehlgeschlagen');
    }
    
    if (result.afterReject.buttonFound && result.afterReject.clicked) {
      if (result.afterReject.buttonText?.includes('consentApi')) {
        console.log('✅ Reject via API funktioniert!');
      } else {
        console.log('✅ Reject via DOM-Klick funktioniert!');
      }
    } else {
      console.log('❌ Reject fehlgeschlagen');
    }
    
    // Cookie-Unterschied prüfen
    const acceptCookies = result.afterAccept.cookies.length;
    const rejectCookies = result.afterReject.cookies.length;
    
    if (acceptCookies > rejectCookies) {
      console.log(`✅ Cookie-Unterschied erkannt: Accept=${acceptCookies}, Reject=${rejectCookies}`);
    } else if (acceptCookies === rejectCookies) {
      console.log(`⚠️ Kein Cookie-Unterschied: Accept=${acceptCookies}, Reject=${rejectCookies}`);
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await crawler.close();
  }
}

testFullConsent().catch(console.error);
