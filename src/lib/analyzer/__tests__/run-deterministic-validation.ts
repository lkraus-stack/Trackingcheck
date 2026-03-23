/**
 * Deterministische Regressionen für reine Analyzer-Logik.
 *
 * Ausführen mit:
 *   npm run validate:fixtures
 */

import assert from 'node:assert/strict';

import { analyzeCookieBanner } from '../cookieBannerAnalyzer';
import { analyzeGoogleConsentMode } from '../googleConsentModeAnalyzer';
import { analyzeTrackingTags } from '../trackingTagsAnalyzer';
import { getSuspiciousAnalysisReason } from '@/lib/analysisResultMeta';
import type { AnalysisResult } from '@/types';
import {
  consentModeV2Fixture,
  falsePositiveFirstPartyTrackingAssetFixture,
  firstPartySgtmFixture,
  gaViaDataLayerFixture,
  genericDataLayerOnlyFixture,
  metaServerSideFixture,
  posthogFixture,
  usercentricsBannerFixture,
} from './deterministic-fixtures';

type ValidationCase = {
  name: string;
  run: () => void;
};

function createBaseTrackingTags(): AnalysisResult['trackingTags'] {
  const baseDetection = {
    detected: false,
    loadedViaGTM: false,
    detectionMethod: [],
    confidence: 'low' as const,
    evidence: [],
  };

  return {
    googleAnalytics: {
      ...baseDetection,
      measurementIds: [],
      hasMultipleMeasurementIds: false,
      hasLegacyUA: false,
    },
    googleTagManager: {
      ...baseDetection,
      containerIds: [],
      hasMultipleContainers: false,
    },
    googleAdsConversion: {
      ...baseDetection,
      conversionIds: [],
      hasRemarketing: false,
    },
    metaPixel: {
      ...baseDetection,
      pixelIds: [],
      hasMultiplePixels: false,
    },
    linkedInInsight: { ...baseDetection },
    tiktokPixel: { ...baseDetection },
    pinterestTag: { ...baseDetection },
    snapchatPixel: { ...baseDetection },
    twitterPixel: { ...baseDetection },
    redditPixel: { ...baseDetection },
    bingAds: { ...baseDetection },
    criteo: { ...baseDetection },
    other: [],
    marketingParameters: {
      gclid: false,
      dclid: false,
      wbraid: false,
      pbraid: false,
      fbclid: false,
      msclkid: false,
      ttclid: false,
      li_fat_id: false,
      utm: false,
      any: false,
    },
    serverSideTracking: {
      detected: false,
      indicators: [],
      firstPartyEndpoints: [],
      cookieBridging: {
        detected: false,
        cookies: [],
        indicators: [],
      },
      summary: {
        hasServerSideGTM: false,
        hasMetaCAPI: false,
        hasFirstPartyProxy: false,
        hasTikTokEventsAPI: false,
        hasLinkedInCAPI: false,
        hasCookieBridging: false,
      },
    },
  };
}

function createSuspiciousReasonInput(overrides: {
  trackingTags?: AnalysisResult['trackingTags'];
  cookies?: AnalysisResult['cookies'];
  afterAcceptCookieCount?: number;
}): Pick<AnalysisResult, 'cookieBanner' | 'trackingTags' | 'cookies' | 'cookieConsentTest'> {
  return {
    cookieBanner: {
      detected: true,
      hasAcceptButton: true,
      hasRejectButton: true,
      hasSettingsOption: true,
      blocksContent: true,
    },
    trackingTags: overrides.trackingTags ?? createBaseTrackingTags(),
    cookies: overrides.cookies ?? [],
    cookieConsentTest: {
      beforeConsent: {
        cookies: [],
        cookieCount: 0,
        trackingCookiesFound: false,
      },
      afterAccept: {
        cookies: [],
        cookieCount: overrides.afterAcceptCookieCount ?? 0,
        newCookies: [],
        clickSuccessful: true,
        buttonFound: true,
      },
      afterReject: {
        cookies: [],
        cookieCount: 0,
        newCookies: [],
        clickSuccessful: false,
        buttonFound: false,
      },
      analysis: {
        consentWorksProperly: true,
        rejectWorksProperly: true,
        trackingBeforeConsent: false,
        issues: [],
      },
    },
  };
}

const cases: ValidationCase[] = [
  {
    name: 'Generischer dataLayer erzeugt kein GA False Positive',
    run: () => {
      const result = analyzeTrackingTags(genericDataLayerOnlyFixture);
      assert.equal(result.googleAnalytics.detected, false);
      assert.equal(result.googleAnalytics.confidence, 'low');
    },
  },
  {
    name: 'GA4 über dataLayer/gtag wird erkannt',
    run: () => {
      const result = analyzeTrackingTags(gaViaDataLayerFixture);
      assert.equal(result.googleAnalytics.detected, true);
      assert.equal(result.googleAnalytics.measurementId, 'G-TEST123456');
      assert.ok(result.googleAnalytics.detectionMethod.includes('dataLayer'));
      assert.equal(result.googleAnalytics.confidence, 'high');
    },
  },
  {
    name: 'Meta Browser + Server-Side Signale liefern starke Evidenz',
    run: () => {
      const result = analyzeTrackingTags(metaServerSideFixture);
      assert.equal(result.metaPixel.detected, true);
      assert.ok(result.metaPixel.detectionMethod.includes('network'));
      assert.equal(result.metaPixel.confidence, 'high');
      assert.equal(result.serverSideTracking.detected, true);
      assert.equal(result.serverSideTracking.summary.hasMetaCAPI, true);
    },
  },
  {
    name: 'Explizite First-Party sGTM Endpunkte bleiben erkannt',
    run: () => {
      const result = analyzeTrackingTags(firstPartySgtmFixture);
      assert.equal(result.serverSideTracking.detected, true);
      assert.equal(result.serverSideTracking.summary.hasServerSideGTM, true);
      assert.equal(result.googleTagManager.serverSideGTM.detected, true);
    },
  },
  {
    name: 'Lokale GTM-Datei und tribe-events CSS erzeugen kein Server-Side False Positive',
    run: () => {
      const result = analyzeTrackingTags(falsePositiveFirstPartyTrackingAssetFixture);
      assert.equal(result.serverSideTracking.detected, false);
      assert.equal(result.serverSideTracking.summary.hasServerSideGTM, false);
      assert.equal(result.serverSideTracking.summary.hasMetaCAPI, false);
      assert.equal(result.metaPixel.serverSide?.detected, false);
    },
  },
  {
    name: 'PostHog landet als other mit Evidenz',
    run: () => {
      const result = analyzeTrackingTags(posthogFixture);
      const posthog = result.other.find((entry) => entry.name === 'PostHog');
      assert.ok(posthog);
      assert.equal(posthog?.confidence, 'high');
      assert.ok(posthog?.detectionMethod.includes('script'));
      assert.ok(posthog?.detectionMethod.includes('network'));
    },
  },
  {
    name: 'Consent Mode v2 wird aus Runtime-Signalen erkannt',
    run: () => {
      const result = analyzeGoogleConsentMode(consentModeV2Fixture);
      assert.equal(result.detected, true);
      assert.equal(result.version, 'v2');
      assert.equal(result.updateConsent?.detected, true);
      assert.equal(result.parameters.ad_user_data, true);
      assert.equal(result.parameters.ad_personalization, true);
    },
  },
  {
    name: 'Usercentrics Banner wird erkannt',
    run: () => {
      const result = analyzeCookieBanner(usercentricsBannerFixture);
      assert.equal(result.detected, true);
      assert.equal(result.provider, 'Usercentrics');
      assert.equal(result.hasAcceptButton, true);
      assert.equal(result.hasRejectButton, true);
    },
  },
  {
    name: 'Verdächtiges 0-Cookie-Cache-Ergebnis wird erkannt',
    run: () => {
      const trackingTags = createBaseTrackingTags();
      trackingTags.googleAnalytics.detected = true;
      trackingTags.googleTagManager.detected = true;

      const reason = getSuspiciousAnalysisReason(
        createSuspiciousReasonInput({
          trackingTags,
          cookies: [],
          afterAcceptCookieCount: 12,
        })
      );

      assert.equal(typeof reason, 'string');
      assert.match(reason as string, /12/);
    },
  },
  {
    name: 'Konsistente Cookie-Ergebnisse werden nicht als verdächtig markiert',
    run: () => {
      const trackingTags = createBaseTrackingTags();
      trackingTags.googleAnalytics.detected = true;

      const reason = getSuspiciousAnalysisReason(
        createSuspiciousReasonInput({
          trackingTags,
          cookies: [
            {
              name: '_ga',
              value: 'test',
              domain: 'example.com',
              path: '/',
              httpOnly: false,
              secure: false,
            },
          ],
          afterAcceptCookieCount: 1,
        })
      );

      assert.equal(reason, null);
    },
  },
];

async function runDeterministicValidation() {
  console.log('🧪 Starte deterministische Analyzer-Validierung...\n');

  let passed = 0;
  let failed = 0;

  for (const validationCase of cases) {
    try {
      validationCase.run();
      passed++;
      console.log(`✅ ${validationCase.name}`);
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${validationCase.name}`);
      console.error(`   ${message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`DETERMINISTIC SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runDeterministicValidation().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
