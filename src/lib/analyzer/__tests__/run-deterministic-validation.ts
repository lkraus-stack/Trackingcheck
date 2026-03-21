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
import {
  consentModeV2Fixture,
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
      const reason = getSuspiciousAnalysisReason({
        cookieBanner: {
          detected: true,
          hasAcceptButton: true,
          hasRejectButton: true,
          hasSettingsOption: true,
          blocksContent: true,
        },
        trackingTags: {
          googleAnalytics: { detected: true },
          googleTagManager: { detected: true },
          googleAdsConversion: { detected: false },
          metaPixel: { detected: false },
          linkedInInsight: { detected: false },
          tiktokPixel: { detected: false },
          pinterestTag: { detected: false },
          snapchatPixel: { detected: false },
          twitterPixel: { detected: false },
          redditPixel: { detected: false },
          bingAds: { detected: false },
          criteo: { detected: false },
          other: [],
          serverSideTracking: { detected: false },
        } as never,
        cookies: [],
        cookieConsentTest: {
          afterAccept: { cookieCount: 12 },
        },
      } as any);

      assert.equal(typeof reason, 'string');
      assert.match(reason as string, /12/);
    },
  },
  {
    name: 'Konsistente Cookie-Ergebnisse werden nicht als verdächtig markiert',
    run: () => {
      const reason = getSuspiciousAnalysisReason({
        cookieBanner: {
          detected: true,
          hasAcceptButton: true,
          hasRejectButton: true,
          hasSettingsOption: true,
          blocksContent: true,
        },
        trackingTags: {
          googleAnalytics: { detected: true },
          googleTagManager: { detected: false },
          googleAdsConversion: { detected: false },
          metaPixel: { detected: false },
          linkedInInsight: { detected: false },
          tiktokPixel: { detected: false },
          pinterestTag: { detected: false },
          snapchatPixel: { detected: false },
          twitterPixel: { detected: false },
          redditPixel: { detected: false },
          bingAds: { detected: false },
          criteo: { detected: false },
          other: [],
          serverSideTracking: { detected: false },
        } as never,
        cookies: [{ name: '_ga' }],
        cookieConsentTest: {
          afterAccept: { cookieCount: 1 },
        },
      } as any);

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
