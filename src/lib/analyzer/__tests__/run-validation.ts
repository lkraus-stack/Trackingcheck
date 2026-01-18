/**
 * Validierungs-Script für Cookie-/Conversion-Checker
 * 
 * Führt Analysen auf Test-Websites durch und validiert die Ergebnisse.
 * 
 * Ausführen mit: npx ts-node src/lib/analyzer/__tests__/run-validation.ts
 */

import { analyzeWebsite } from '../index';
import { TEST_WEBSITES, validateAnalysisResult, generateTestReport } from './test-fixtures';

async function runValidation() {
  console.log('🔍 Starte Validierung des Cookie-/Conversion-Checkers...\n');

  const results = new Map<string, {
    score: number;
    issues: Array<{ title: string; severity: string }>;
    cookieBanner: { detected: boolean; provider?: string };
    trackingTags: {
      googleAnalytics: { detected: boolean };
      googleTagManager: { detected: boolean };
      metaPixel: { detected: boolean };
      serverSideTracking: { detected: boolean };
    };
  }>();

  for (const expectation of TEST_WEBSITES) {
    console.log(`\n📊 Analysiere: ${expectation.name} (${expectation.url})`);
    console.log('   ' + '-'.repeat(60));

    try {
      const result = await analyzeWebsite(expectation.url);

      // Ergebnis speichern
      results.set(expectation.url, {
        score: result.score,
        issues: result.issues.map(i => ({ title: i.title, severity: i.severity })),
        cookieBanner: {
          detected: result.cookieBanner.detected,
          provider: result.cookieBanner.provider,
        },
        trackingTags: {
          googleAnalytics: { detected: result.trackingTags.googleAnalytics.detected },
          googleTagManager: { detected: result.trackingTags.googleTagManager.detected },
          metaPixel: { detected: result.trackingTags.metaPixel.detected },
          serverSideTracking: { detected: result.trackingTags.serverSideTracking.detected },
        },
      });

      // Sofortige Validierung
      const validation = validateAnalysisResult(results.get(expectation.url)!, expectation);

      console.log(`   Score: ${result.score}`);
      console.log(`   Cookie-Banner: ${result.cookieBanner.detected ? '✅ Erkannt' : '❌ Nicht erkannt'}`);
      console.log(`   GTM: ${result.trackingTags.googleTagManager.detected ? '✅' : '❌'}`);
      console.log(`   GA4: ${result.trackingTags.googleAnalytics.detected ? '✅' : '❌'}`);
      console.log(`   Meta Pixel: ${result.trackingTags.metaPixel.detected ? '✅' : '❌'}`);
      console.log(`   Server-Side: ${result.trackingTags.serverSideTracking.detected ? '✅' : '❌'}`);

      if (!validation.passed) {
        console.log('\n   ⚠️ VALIDIERUNG FEHLGESCHLAGEN:');
        for (const failure of validation.failures) {
          console.log(`      - ${failure}`);
        }
      } else {
        console.log('\n   ✅ Validierung bestanden');
      }

      // Issues anzeigen (nur errors und warnings)
      const criticalIssues = result.issues.filter(i => i.severity === 'error' || i.severity === 'warning');
      if (criticalIssues.length > 0) {
        console.log('\n   📋 Issues:');
        for (const issue of criticalIssues.slice(0, 5)) {
          const icon = issue.severity === 'error' ? '🔴' : '🟡';
          console.log(`      ${icon} [${issue.severity.toUpperCase()}] ${issue.title}`);
        }
        if (criticalIssues.length > 5) {
          console.log(`      ... und ${criticalIssues.length - 5} weitere`);
        }
      }

    } catch (error) {
      console.error(`   ❌ Fehler bei Analyse: ${error}`);
    }
  }

  // Gesamtreport
  console.log('\n\n');
  console.log(generateTestReport(results));
}

// Ausführen
runValidation().catch(console.error);
