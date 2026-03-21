/**
 * Test-Fixtures für Live-Validierung gegen öffentliche Referenzseiten.
 *
 * Die Erwartungen sind bewusst nicht überpräzise, weil Live-Websites
 * sich verändern können. Ziel ist ein belastbares Referenzset mit dokumentierter
 * Stabilität und bekannten Unsicherheiten.
 */

export type SignalExpectation = 'yes' | 'no' | 'optional';
export type ReferenceTier = 'stable' | 'exploratory';
export type ReferenceStability = 'stable' | 'moderate' | 'volatile';

export interface TestExpectation {
  url: string;
  name: string;
  description: string;
  tier: ReferenceTier;
  stability: ReferenceStability;
  coverage: string[];
  knownVariability: string[];

  cookieBanner: {
    expected: SignalExpectation;
    expectedProvider?: string;
    shouldHaveRejectButton?: SignalExpectation;
  };

  tracking: {
    expectClientSideTracking: SignalExpectation;
    expectServerSideIndicators: SignalExpectation;
    expectGTM: SignalExpectation;
    expectGA4: SignalExpectation;
    expectMetaPixel: SignalExpectation;
    expectedOtherTracking?: string[];
  };

  scoring: {
    minScore: number;
    maxScore: number;
    shouldNotBePenalizedFor: string[];
  };

  issuesThatShouldNotOccur: string[];
  issuesThatShouldOccur?: string[];
}

export const TEST_WEBSITES: TestExpectation[] = [
  {
    url: 'https://example.com/',
    name: 'Example.com',
    description: 'Statische Referenzseite ohne typisches Marketing-Tracking.',
    tier: 'stable',
    stability: 'stable',
    coverage: ['no-tracking', 'no-banner'],
    knownVariability: [
      'Externe CDN- oder Browser-spezifische Requests können vereinzelt auftauchen.',
    ],
    cookieBanner: {
      expected: 'no',
    },
    tracking: {
      expectClientSideTracking: 'no',
      expectServerSideIndicators: 'no',
      expectGTM: 'no',
      expectGA4: 'no',
      expectMetaPixel: 'no',
    },
    scoring: {
      minScore: 80,
      maxScore: 100,
      shouldNotBePenalizedFor: [
        'Kein Cookie-Banner erkannt',
        'Google Consent Mode nicht erkannt',
      ],
    },
    issuesThatShouldNotOccur: [
      'Kein Cookie-Banner erkannt',
      'Google Consent Mode nicht erkannt',
      'TCF nicht implementiert',
    ],
  },
  {
    url: 'https://www.franco-consulting.com/',
    name: 'Franco Consulting',
    description: 'Marketing-/Lead-Gen-Seite als Referenz für GTM/CMP-Setups mit Marketing-Signalen.',
    tier: 'stable',
    stability: 'moderate',
    coverage: ['cookie-banner', 'gtm', 'consent'],
    knownVariability: [
      'CMP- und Tracking-Container können sich ohne Vorankündigung ändern.',
      'Manche Tags feuern erst nach Interaktion oder im zweiten Seitenaufruf.',
    ],
    cookieBanner: {
      expected: 'yes',
      shouldHaveRejectButton: 'optional',
    },
    tracking: {
      expectClientSideTracking: 'yes',
      expectServerSideIndicators: 'optional',
      expectGTM: 'yes',
      expectGA4: 'optional',
      expectMetaPixel: 'optional',
    },
    scoring: {
      minScore: 40,
      maxScore: 100,
      shouldNotBePenalizedFor: [],
    },
    issuesThatShouldNotOccur: [],
  },
  {
    url: 'https://vantero.chat/',
    name: 'Vantero Chat',
    description: 'SaaS-Website für Banner-/Analytics-Regressionen.',
    tier: 'exploratory',
    stability: 'volatile',
    coverage: ['cookie-banner', 'gtm-ga4'],
    knownVariability: [
      'Tracking-Container und Banner-Varianten können sich ändern.',
      'Einzelne Plattform-Tags können A/B-testbedingt schwanken.',
      'Der aktuelle Live-Zustand kann trackerfrei oder bot-sensitiv ausfallen.',
    ],
    cookieBanner: {
      expected: 'yes',
      shouldHaveRejectButton: 'optional',
    },
    tracking: {
      expectClientSideTracking: 'yes',
      expectServerSideIndicators: 'optional',
      expectGTM: 'yes',
      expectGA4: 'yes',
      expectMetaPixel: 'optional',
    },
    scoring: {
      minScore: 40,
      maxScore: 100,
      shouldNotBePenalizedFor: [],
    },
    issuesThatShouldNotOccur: [],
  },
  {
    url: 'https://www.apple.com/de/',
    name: 'Apple Deutschland',
    description: 'Enterprise-Seite als Referenz für banner-/bot-sensitive und serverseitige Muster.',
    tier: 'exploratory',
    stability: 'volatile',
    coverage: ['cookie-banner', 'server-side', 'bot-sensitive'],
    knownVariability: [
      'Apple ändert Tracking- und Consent-Verhalten regelmäßig.',
      'Bot-Schutz oder Region-Logik kann Ergebnisse beeinflussen.',
    ],
    cookieBanner: {
      expected: 'yes',
      shouldHaveRejectButton: 'optional',
    },
    tracking: {
      expectClientSideTracking: 'optional',
      expectServerSideIndicators: 'yes',
      expectGTM: 'no',
      expectGA4: 'optional',
      expectMetaPixel: 'no',
    },
    scoring: {
      minScore: 60,
      maxScore: 100,
      shouldNotBePenalizedFor: [
        'Kein GTM erkannt',
        'Kein Conversion Tracking erkannt',
      ],
    },
    issuesThatShouldNotOccur: [
      'Kein GTM erkannt',
      'Kein Conversion Tracking erkannt',
    ],
  },
  {
    url: 'https://www.rhoen-park-hotel.de/',
    name: 'Rhön Park Hotel',
    description: 'Öffentliche Hotel-Seite als explorative Referenz für klassisches CMP/Ads-Tracking.',
    tier: 'exploratory',
    stability: 'volatile',
    coverage: ['cookie-banner', 'gtm-ga4'],
    knownVariability: [
      'Buchungs- oder Marketing-Integrationen können saisonal wechseln.',
      'Hotel-/Booking-Widgets laden teils verzögert oder nur in bestimmten Regionen.',
    ],
    cookieBanner: {
      expected: 'yes',
      shouldHaveRejectButton: 'optional',
    },
    tracking: {
      expectClientSideTracking: 'yes',
      expectServerSideIndicators: 'optional',
      expectGTM: 'yes',
      expectGA4: 'yes',
      expectMetaPixel: 'optional',
    },
    scoring: {
      minScore: 40,
      maxScore: 100,
      shouldNotBePenalizedFor: [],
    },
    issuesThatShouldNotOccur: [],
  },
];

export function selectTestWebsites(includeExploratory = false): TestExpectation[] {
  return TEST_WEBSITES.filter((site) => includeExploratory || site.tier === 'stable');
}

function matchesExpectation(expected: SignalExpectation, actual: boolean): boolean {
  if (expected === 'optional') return true;
  return expected === 'yes' ? actual : !actual;
}

function describeExpectation(expected: SignalExpectation): string {
  if (expected === 'yes') return 'ja';
  if (expected === 'no') return 'nein';
  return 'optional';
}

/**
 * Validiert ein Analyse-Ergebnis gegen die Erwartungen.
 */
export function validateAnalysisResult(
  result: {
    score: number;
    issues: Array<{ title: string; severity: string }>;
    cookieBanner: { detected: boolean; provider?: string; hasRejectButton?: boolean };
    trackingTags: {
      googleAnalytics: { detected: boolean };
      googleTagManager: { detected: boolean };
      metaPixel: { detected: boolean };
      serverSideTracking: { detected: boolean };
      other: Array<{ name: string }>;
    };
  },
  expectation: TestExpectation
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  if (result.score < expectation.scoring.minScore) {
    failures.push(`Score ${result.score} ist unter dem Minimum ${expectation.scoring.minScore}`);
  }
  if (result.score > expectation.scoring.maxScore) {
    failures.push(`Score ${result.score} ist über dem Maximum ${expectation.scoring.maxScore}`);
  }

  if (!matchesExpectation(expectation.cookieBanner.expected, result.cookieBanner.detected)) {
    failures.push(
      `Cookie-Banner Erkennung: Erwartet ${describeExpectation(expectation.cookieBanner.expected)}, aber ${result.cookieBanner.detected}`
    );
  }

  if (
    expectation.cookieBanner.shouldHaveRejectButton &&
    !matchesExpectation(expectation.cookieBanner.shouldHaveRejectButton, !!result.cookieBanner.hasRejectButton)
  ) {
    failures.push(
      `Reject-Option: Erwartet ${describeExpectation(expectation.cookieBanner.shouldHaveRejectButton)}, aber ${!!result.cookieBanner.hasRejectButton}`
    );
  }

  const hasClientSideTracking =
    result.trackingTags.googleAnalytics.detected ||
    result.trackingTags.googleTagManager.detected ||
    result.trackingTags.metaPixel.detected ||
    result.trackingTags.other.length > 0;

  if (!matchesExpectation(expectation.tracking.expectClientSideTracking, hasClientSideTracking)) {
    failures.push(
      `Client-Side Tracking: Erwartet ${describeExpectation(expectation.tracking.expectClientSideTracking)}, aber ${hasClientSideTracking}`
    );
  }
  if (!matchesExpectation(expectation.tracking.expectServerSideIndicators, result.trackingTags.serverSideTracking.detected)) {
    failures.push(
      `Server-Side Indikatoren: Erwartet ${describeExpectation(expectation.tracking.expectServerSideIndicators)}, aber ${result.trackingTags.serverSideTracking.detected}`
    );
  }
  if (!matchesExpectation(expectation.tracking.expectGTM, result.trackingTags.googleTagManager.detected)) {
    failures.push(
      `GTM: Erwartet ${describeExpectation(expectation.tracking.expectGTM)}, aber ${result.trackingTags.googleTagManager.detected}`
    );
  }
  if (!matchesExpectation(expectation.tracking.expectGA4, result.trackingTags.googleAnalytics.detected)) {
    failures.push(
      `GA4: Erwartet ${describeExpectation(expectation.tracking.expectGA4)}, aber ${result.trackingTags.googleAnalytics.detected}`
    );
  }
  if (!matchesExpectation(expectation.tracking.expectMetaPixel, result.trackingTags.metaPixel.detected)) {
    failures.push(
      `Meta Pixel: Erwartet ${describeExpectation(expectation.tracking.expectMetaPixel)}, aber ${result.trackingTags.metaPixel.detected}`
    );
  }

  if (expectation.tracking.expectedOtherTracking?.length) {
    const detectedOther = new Set(result.trackingTags.other.map((entry) => entry.name));
    for (const expected of expectation.tracking.expectedOtherTracking) {
      if (!detectedOther.has(expected)) {
        failures.push(`Weiteres Tracking-Tool "${expected}" wurde nicht erkannt`);
      }
    }
  }

  for (const issueTitle of expectation.issuesThatShouldNotOccur) {
    const foundIssue = result.issues.find(
      (issue) => issue.title.includes(issueTitle) && issue.severity === 'error'
    );
    if (foundIssue) {
      failures.push(`Issue "${issueTitle}" sollte nicht als error auftreten (gefunden: ${foundIssue.severity})`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Führt alle Tests aus und gibt einen Report zurück.
 */
export function generateTestReport(
  results: Map<string, {
    score: number;
    issues: Array<{ title: string; severity: string }>;
    cookieBanner: { detected: boolean; provider?: string; hasRejectButton?: boolean };
    trackingTags: {
      googleAnalytics: { detected: boolean };
      googleTagManager: { detected: boolean };
      metaPixel: { detected: boolean };
      serverSideTracking: { detected: boolean };
      other: Array<{ name: string }>;
    };
  }>,
  expectations: TestExpectation[] = TEST_WEBSITES
): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                  LIVE VALIDATION REPORT                      ',
    '═══════════════════════════════════════════════════════════════',
    '',
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const expectation of expectations) {
    const result = results.get(expectation.url);

    if (!result) {
      lines.push(`❓ ${expectation.name}: Kein Ergebnis`);
      continue;
    }

    const validation = validateAnalysisResult(result, expectation);
    const prefix = `[${expectation.tier}/${expectation.stability}]`;

    if (validation.passed) {
      lines.push(`✅ ${prefix} ${expectation.name}: PASSED (Score: ${result.score})`);
      totalPassed++;
    } else {
      lines.push(`❌ ${prefix} ${expectation.name}: FAILED (Score: ${result.score})`);
      for (const failure of validation.failures) {
        lines.push(`   ⚠️ ${failure}`);
      }
      totalFailed++;
    }

    if (expectation.knownVariability.length > 0) {
      lines.push(`   Hinweise: ${expectation.knownVariability.join(' | ')}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`SUMMARY: ${totalPassed} passed, ${totalFailed} failed`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
