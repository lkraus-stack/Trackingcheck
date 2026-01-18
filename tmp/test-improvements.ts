/**
 * Test-Script für die Verbesserungen am Cookie-/Conversion-Checker
 * Prüft speziell:
 * 1. Apple (Server-Side Tracking) - sollte NICHT negativ bewertet werden
 * 2. Rhön Park Hotel - typische Website mit Client-Side Tracking
 * 3. Vantero Chat - SaaS Website
 */

import { analyzeWebsite } from '../src/lib/analyzer/index';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

interface ValidationResult {
  url: string;
  name: string;
  score: number;
  passed: boolean;
  failures: string[];
  details: {
    cookieBanner: { detected: boolean; provider?: string };
    tracking: {
      clientSide: boolean;
      serverSide: boolean;
      gtm: boolean;
      ga4: boolean;
      meta: boolean;
    };
    criticalIssues: Array<{ severity: string; title: string; category: string }>;
  };
}

// Test-Erwartungen
const TEST_CASES = [
  {
    url: 'https://www.apple.com/de/',
    name: 'Apple Deutschland',
    expectations: {
      minScore: 70, // Server-Side sollte neutral bewertet werden
      maxScore: 95,
      // Diese Issues sollten NICHT als 'error' auftreten
      issuesShouldNotBeError: [
        'Kein GTM erkannt',
        'Kein Client-Side Conversion Tracking erkannt',
        'Kein Conversion Tracking erkannt',
        'Kein Google Tracking erkannt',
      ],
    },
  },
  {
    url: 'https://www.rhoen-park-hotel.de/',
    name: 'Rhön Park Hotel',
    expectations: {
      minScore: 40,
      maxScore: 100,
      issuesShouldNotBeError: [],
    },
  },
  {
    url: 'https://vantero.chat',
    name: 'Vantero Chat',
    expectations: {
      minScore: 40,
      maxScore: 100,
      issuesShouldNotBeError: [],
    },
  },
];

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        COOKIE-/CONVERSION-CHECKER VERBESSERUNGEN TEST         ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const validationResults: ValidationResult[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📊 Teste: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    console.log('   ' + '─'.repeat(60));

    try {
      const result = await analyzeWebsite(testCase.url);
      const failures: string[] = [];

      // Score-Validierung
      if (result.score < testCase.expectations.minScore) {
        failures.push(
          `Score ${result.score} ist unter Minimum ${testCase.expectations.minScore}`
        );
      }
      if (result.score > testCase.expectations.maxScore) {
        failures.push(
          `Score ${result.score} ist über Maximum ${testCase.expectations.maxScore}`
        );
      }

      // Issue-Validierung: Bestimmte Issues sollten nicht als 'error' auftreten
      for (const issueTitle of testCase.expectations.issuesShouldNotBeError) {
        const foundAsError = result.issues.find(
          (i) => i.title.includes(issueTitle) && i.severity === 'error'
        );
        if (foundAsError) {
          failures.push(
            `Issue "${foundAsError.title}" sollte nicht als ERROR erscheinen (severity: ${foundAsError.severity})`
          );
        }
      }

      // Ergebnis-Details sammeln
      const criticalIssues = result.issues
        .filter((i) => i.severity === 'error' || i.severity === 'warning')
        .map((i) => ({ severity: i.severity, title: i.title, category: i.category }));

      const validationResult: ValidationResult = {
        url: testCase.url,
        name: testCase.name,
        score: result.score,
        passed: failures.length === 0,
        failures,
        details: {
          cookieBanner: {
            detected: result.cookieBanner.detected,
            provider: result.cookieBanner.provider,
          },
          tracking: {
            clientSide:
              result.trackingTags.googleAnalytics.detected ||
              result.trackingTags.metaPixel.detected ||
              result.trackingTags.googleTagManager.detected,
            serverSide: result.trackingTags.serverSideTracking.detected,
            gtm: result.trackingTags.googleTagManager.detected,
            ga4: result.trackingTags.googleAnalytics.detected,
            meta: result.trackingTags.metaPixel.detected,
          },
          criticalIssues,
        },
      };

      validationResults.push(validationResult);

      // Ausgabe
      console.log(`   Score: ${result.score}`);
      console.log(
        `   Cookie-Banner: ${result.cookieBanner.detected ? '✅ Erkannt' : '❌ Nicht erkannt'}${result.cookieBanner.provider ? ` (${result.cookieBanner.provider})` : ''}`
      );
      console.log(
        `   Client-Side Tracking: ${validationResult.details.tracking.clientSide ? '✅' : '❌'}`
      );
      console.log(
        `   Server-Side Indikatoren: ${validationResult.details.tracking.serverSide ? '✅' : '❌'}`
      );
      console.log(`   GTM: ${validationResult.details.tracking.gtm ? '✅' : '❌'}`);
      console.log(`   GA4: ${validationResult.details.tracking.ga4 ? '✅' : '❌'}`);
      console.log(`   Meta Pixel: ${validationResult.details.tracking.meta ? '✅' : '❌'}`);

      if (criticalIssues.length > 0) {
        console.log('\n   📋 Issues (Error/Warning):');
        for (const issue of criticalIssues.slice(0, 8)) {
          const icon = issue.severity === 'error' ? '🔴' : '🟡';
          console.log(`      ${icon} [${issue.severity.toUpperCase()}] ${issue.title}`);
        }
        if (criticalIssues.length > 8) {
          console.log(`      ... und ${criticalIssues.length - 8} weitere`);
        }
      }

      if (failures.length > 0) {
        console.log('\n   ❌ VALIDIERUNG FEHLGESCHLAGEN:');
        for (const failure of failures) {
          console.log(`      ⚠️ ${failure}`);
        }
      } else {
        console.log('\n   ✅ Validierung bestanden');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Fehler bei Analyse: ${message}`);
      validationResults.push({
        url: testCase.url,
        name: testCase.name,
        score: 0,
        passed: false,
        failures: [`Analyse-Fehler: ${message}`],
        details: {
          cookieBanner: { detected: false },
          tracking: {
            clientSide: false,
            serverSide: false,
            gtm: false,
            ga4: false,
            meta: false,
          },
          criticalIssues: [],
        },
      });
    }
  }

  // Zusammenfassung
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                         ZUSAMMENFASSUNG                         ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const result of validationResults) {
    if (result.passed) {
      console.log(`✅ ${result.name}: PASSED (Score: ${result.score})`);
      passed++;
    } else {
      console.log(`❌ ${result.name}: FAILED (Score: ${result.score})`);
      for (const failure of result.failures) {
        console.log(`   ⚠️ ${failure}`);
      }
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`ERGEBNIS: ${passed} bestanden, ${failed} fehlgeschlagen`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Ergebnisse speichern
  const outDir = path.resolve('./tmp');
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `validation-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(validationResults, null, 2));
  console.log(`\nErgebnisse gespeichert in: ${outPath}`);

  // Exit-Code basierend auf Test-Ergebnis
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error('Kritischer Fehler:', error);
  process.exit(1);
});
