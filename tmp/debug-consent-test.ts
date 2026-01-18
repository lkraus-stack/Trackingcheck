/**
 * Debug-Script für Cookie-Banner Button-Erkennung
 */

import { WebCrawler } from '../src/lib/analyzer/crawler';

async function debugTest() {
  const crawler = new WebCrawler();
  await crawler.init();
  
  const url = 'https://www.rhoen-park-hotel.de/';
  console.log(`\n🔍 Debug-Test für: ${url}\n`);
  
  try {
    const result = await crawler.performCookieConsentTest(url);
    
    console.log('=== CONSENT TEST ERGEBNIS ===\n');
    console.log('📋 Vor Consent:');
    console.log(`   Cookies: ${result.beforeConsent.cookies.length}`);
    
    console.log('\n📋 Nach Accept:');
    console.log(`   Button gefunden: ${result.afterAccept.buttonFound}`);
    console.log(`   Click erfolgreich: ${result.afterAccept.clickSuccessful}`);
    console.log(`   Button Text: ${result.afterAccept.buttonText || 'nicht ermittelt'}`);
    console.log(`   Cookies: ${result.afterAccept.cookies.length}`);
    
    console.log('\n📋 Nach Reject:');
    console.log(`   Button gefunden: ${result.afterReject.buttonFound}`);
    console.log(`   Click erfolgreich: ${result.afterReject.clickSuccessful}`);
    console.log(`   Button Text: ${result.afterReject.buttonText || 'nicht ermittelt'}`);
    console.log(`   Cookies: ${result.afterReject.cookies.length}`);
    
    // Details
    if (result.afterAccept.buttonText?.includes('consentApi') || result.afterAccept.buttonText?.includes('UC_UI')) {
      console.log('\n✅ API-basierte Consent-Steuerung wurde verwendet');
    } else if (result.afterAccept.buttonFound) {
      console.log('\n✅ Button wurde per DOM-Klick gefunden');
    } else {
      console.log('\n⚠️ Weder Button noch API konnten verwendet werden');
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await crawler.close();
  }
}

debugTest().catch(console.error);
