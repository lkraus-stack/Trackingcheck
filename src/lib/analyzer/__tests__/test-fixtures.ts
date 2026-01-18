/**
 * Test-Fixtures für Cookie-/Conversion-Checker Validierung
 * 
 * Diese Datei enthält erwartete Ergebnisse für verschiedene Test-Websites,
 * um die Korrektheit der Analyse zu validieren.
 */

export interface TestExpectation {
  url: string;
  name: string;
  description: string;
  
  // Erwartete Cookie-Banner Ergebnisse
  cookieBanner: {
    shouldBeDetected: boolean;
    expectedProvider?: string;
    shouldHaveRejectButton?: boolean;
  };
  
  // Erwartete Tracking-Ergebnisse
  tracking: {
    expectClientSideTracking: boolean;
    expectServerSideIndicators: boolean;
    expectGTM: boolean;
    expectGA4: boolean;
    expectMetaPixel: boolean;
  };
  
  // Erwartetes Scoring
  scoring: {
    minScore: number;
    maxScore: number;
    shouldNotBePenalizedFor: string[];
  };
  
  // Bekannte Issues die NICHT auftreten sollten
  issuesThatShouldNotOccur: string[];
  
  // Issues die auftreten SOLLTEN (optional)
  issuesThatShouldOccur?: string[];
}

/**
 * Test-Websites mit erwarteten Ergebnissen
 */
export const TEST_WEBSITES: TestExpectation[] = [
  {
    url: 'https://www.apple.com/de/',
    name: 'Apple Deutschland',
    description: 'Große Enterprise-Website mit wahrscheinlich Server-Side Tracking',
    cookieBanner: {
      shouldBeDetected: true,
      // Apple verwendet ein eigenes System
    },
    tracking: {
      expectClientSideTracking: false, // Apple nutzt Server-Side
      expectServerSideIndicators: true, // Sollte Indikatoren haben
      expectGTM: false, // Apple nutzt kein GTM
      expectGA4: false, // Möglicherweise Server-Side GA
      expectMetaPixel: false,
    },
    scoring: {
      minScore: 70, // Neutral-positiv (nicht bestrafen)
      maxScore: 95,
      shouldNotBePenalizedFor: [
        'Kein GTM erkannt',
        'Kein Conversion Tracking erkannt',
        'Kein Google Tracking erkannt',
      ],
    },
    issuesThatShouldNotOccur: [
      // Diese Issues sollten NICHT als 'error' auftreten
      'Kein GTM erkannt', // Sollte 'low' severity haben
      'Kein Conversion Tracking erkannt', // Sollte 'low' severity haben
    ],
  },
  {
    url: 'https://www.rhoen-park-hotel.de/',
    name: 'Rhön Park Hotel',
    description: 'Typische Hotel-Website, sollte Cookie-Banner haben',
    cookieBanner: {
      shouldBeDetected: true,
    },
    tracking: {
      expectClientSideTracking: true, // Typischerweise GA/GTM
      expectServerSideIndicators: false,
      expectGTM: true,
      expectGA4: true,
      expectMetaPixel: false, // Variiert
    },
    scoring: {
      minScore: 50,
      maxScore: 100,
      shouldNotBePenalizedFor: [],
    },
    issuesThatShouldNotOccur: [],
  },
  {
    url: 'https://www.franco-consulting.com/',
    name: 'Franco Consulting',
    description: 'B2B Beratungswebsite',
    cookieBanner: {
      shouldBeDetected: true,
    },
    tracking: {
      expectClientSideTracking: true, // Wahrscheinlich GA
      expectServerSideIndicators: false,
      expectGTM: true,
      expectGA4: true,
      expectMetaPixel: false,
    },
    scoring: {
      minScore: 50,
      maxScore: 100,
      shouldNotBePenalizedFor: [],
    },
    issuesThatShouldNotOccur: [],
  },
  {
    url: 'https://vantero.chat',
    name: 'Vantero Chat',
    description: 'SaaS Produkt-Website',
    cookieBanner: {
      shouldBeDetected: true,
    },
    tracking: {
      expectClientSideTracking: true,
      expectServerSideIndicators: false,
      expectGTM: true,
      expectGA4: true,
      expectMetaPixel: false,
    },
    scoring: {
      minScore: 50,
      maxScore: 100,
      shouldNotBePenalizedFor: [],
    },
    issuesThatShouldNotOccur: [],
  },
];

/**
 * Validiert ein Analyse-Ergebnis gegen die Erwartungen
 */
export function validateAnalysisResult(
  result: {
    score: number;
    issues: Array<{ title: string; severity: string }>;
    cookieBanner: { detected: boolean; provider?: string };
    trackingTags: {
      googleAnalytics: { detected: boolean };
      googleTagManager: { detected: boolean };
      metaPixel: { detected: boolean };
      serverSideTracking: { detected: boolean };
    };
  },
  expectation: TestExpectation
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  // Score-Validierung
  if (result.score < expectation.scoring.minScore) {
    failures.push(
      `Score ${result.score} ist unter dem Minimum ${expectation.scoring.minScore}`
    );
  }
  if (result.score > expectation.scoring.maxScore) {
    failures.push(
      `Score ${result.score} ist über dem Maximum ${expectation.scoring.maxScore}`
    );
  }

  // Cookie-Banner Validierung
  if (expectation.cookieBanner.shouldBeDetected !== result.cookieBanner.detected) {
    failures.push(
      `Cookie-Banner Erkennung: Erwartet ${expectation.cookieBanner.shouldBeDetected}, aber ${result.cookieBanner.detected}`
    );
  }

  // Issues-Validierung
  for (const issueTitle of expectation.issuesThatShouldNotOccur) {
    const foundIssue = result.issues.find(
      i => i.title.includes(issueTitle) && i.severity === 'error'
    );
    if (foundIssue) {
      failures.push(
        `Issue "${issueTitle}" sollte nicht als error auftreten (gefunden: ${foundIssue.severity})`
      );
    }
  }

  // Tracking-Validierung (nur wenn erwartet)
  if (expectation.tracking.expectGTM && !result.trackingTags.googleTagManager.detected) {
    failures.push('GTM sollte erkannt werden, wurde aber nicht');
  }
  if (expectation.tracking.expectGA4 && !result.trackingTags.googleAnalytics.detected) {
    failures.push('GA4 sollte erkannt werden, wurde aber nicht');
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Führt alle Tests aus und gibt einen Report zurück
 */
export function generateTestReport(
  results: Map<string, {
    score: number;
    issues: Array<{ title: string; severity: string }>;
    cookieBanner: { detected: boolean; provider?: string };
    trackingTags: {
      googleAnalytics: { detected: boolean };
      googleTagManager: { detected: boolean };
      metaPixel: { detected: boolean };
      serverSideTracking: { detected: boolean };
    };
  }>
): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                    TEST REPORT                                 ',
    '═══════════════════════════════════════════════════════════════',
    '',
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const expectation of TEST_WEBSITES) {
    const result = results.get(expectation.url);
    
    if (!result) {
      lines.push(`❓ ${expectation.name}: Kein Ergebnis`);
      continue;
    }

    const validation = validateAnalysisResult(result, expectation);
    
    if (validation.passed) {
      lines.push(`✅ ${expectation.name}: PASSED (Score: ${result.score})`);
      totalPassed++;
    } else {
      lines.push(`❌ ${expectation.name}: FAILED (Score: ${result.score})`);
      for (const failure of validation.failures) {
        lines.push(`   ⚠️ ${failure}`);
      }
      totalFailed++;
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`SUMMARY: ${totalPassed} passed, ${totalFailed} failed`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
