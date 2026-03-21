/**
 * Smoke-Validierung gegen öffentliche Referenzseiten.
 *
 * Standard: nur stabile Referenzen
 * Mit --all: stabile + explorative Referenzen
 *
 * Ausführen mit:
 *   npm run validate:smoke
 *   npm run validate:smoke -- --all
 */

import { analyzeWebsite } from '../index';
import {
  selectTestWebsites,
  validateAnalysisResult,
  generateTestReport,
  type ValidationSnapshot,
} from './test-fixtures';

async function runValidation() {
  const includeExploratory = process.argv.includes('--all');
  const expectations = selectTestWebsites(includeExploratory);

  console.log(`🔍 Starte Live-Validierung (${includeExploratory ? 'stabil + explorativ' : 'nur stabile Referenzen'})...\n`);

  const results = new Map<string, ValidationSnapshot>();

  for (const expectation of expectations) {
    console.log(`\n📊 Analysiere: ${expectation.name} (${expectation.url})`);
    console.log('   ' + '-'.repeat(60));
    console.log(`   Referenz: ${expectation.tier}/${expectation.stability} | Coverage: ${expectation.coverage.join(', ')}`);

    try {
      const result = await analyzeWebsite(expectation.url);

      // Ergebnis speichern
      results.set(expectation.url, {
        score: result.score,
        issues: result.issues.map(i => ({ title: i.title, severity: i.severity })),
        cookieBanner: {
          detected: result.cookieBanner.detected,
          provider: result.cookieBanner.provider,
          hasRejectButton: result.cookieBanner.hasRejectButton,
        },
        trackingTags: {
          googleAnalytics: { detected: result.trackingTags.googleAnalytics.detected },
          googleTagManager: { detected: result.trackingTags.googleTagManager.detected },
          metaPixel: { detected: result.trackingTags.metaPixel.detected },
          serverSideTracking: { detected: result.trackingTags.serverSideTracking.detected },
          other: result.trackingTags.other.map((entry) => ({ name: entry.name })),
        },
        cookies: {
          totalCount: result.cookies.length,
        },
        cookieConsentTest: result.cookieConsentTest
          ? {
              beforeConsent: { cookieCount: result.cookieConsentTest.beforeConsent.cookieCount },
              afterAccept: { cookieCount: result.cookieConsentTest.afterAccept.cookieCount },
              afterReject: { cookieCount: result.cookieConsentTest.afterReject.cookieCount },
            }
          : undefined,
      });

      // Sofortige Validierung
      const validation = validateAnalysisResult(results.get(expectation.url)!, expectation);

      console.log(`   Score: ${result.score}`);
      console.log(`   Cookie-Banner: ${result.cookieBanner.detected ? '✅ Erkannt' : '❌ Nicht erkannt'}`);
      console.log(`   GTM: ${result.trackingTags.googleTagManager.detected ? '✅' : '❌'}`);
      console.log(`   GA4: ${result.trackingTags.googleAnalytics.detected ? '✅' : '❌'}`);
      console.log(`   Meta Pixel: ${result.trackingTags.metaPixel.detected ? '✅' : '❌'}`);
      console.log(`   Server-Side: ${result.trackingTags.serverSideTracking.detected ? '✅' : '❌'}`);
      console.log(`   Cookies gesamt: ${result.cookies.length}`);
      if (result.cookieConsentTest) {
        console.log(
          `   Consent-Cookies: vor=${result.cookieConsentTest.beforeConsent.cookieCount} | accept=${result.cookieConsentTest.afterAccept.cookieCount} | reject=${result.cookieConsentTest.afterReject.cookieCount}`
        );
      }
      if (result.trackingTags.other.length > 0) {
        console.log(`   Weitere Tracker: ${result.trackingTags.other.map((entry) => entry.name).join(', ')}`);
      }

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

      if (expectation.knownVariability.length > 0) {
        console.log(`   Hinweise: ${expectation.knownVariability.join(' | ')}`);
      }

    } catch (error) {
      console.error(`   ❌ Fehler bei Analyse: ${error}`);
    }
  }

  // Gesamtreport
  console.log('\n\n');
  console.log(generateTestReport(results, expectations));
}

// Ausführen
runValidation().catch(console.error);
