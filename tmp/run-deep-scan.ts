import { analyzeWebsite } from '../src/lib/analyzer/index';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

type Summary = {
  url: string;
  status: string;
  scanMode?: string;
  score: number;
  cookieBanner: {
    detected: boolean;
    provider?: string;
    hasAcceptButton: boolean;
    hasRejectButton: boolean;
    hasEssentialSaveButton: boolean;
    hasSettingsOption: boolean;
    blocksContent: boolean;
  };
  consentTest?: {
    trackingBeforeConsent: boolean;
    consentWorksProperly: boolean;
    rejectWorksProperly: boolean;
    beforeCookieCount: number;
    afterAcceptCookieCount: number;
    afterRejectCookieCount: number;
    afterAcceptButtonText?: string;
    afterRejectButtonText?: string;
    issues: Array<{ severity: string; title: string }>;
  };
  trackingTags: {
    googleAnalytics: boolean;
    googleTagManager: boolean;
    googleAds: boolean;
    metaPixel: boolean;
    linkedIn: boolean;
    tiktok: boolean;
    pinterest: boolean;
    snapchat: boolean;
    twitter: boolean;
    bingAds: boolean;
    criteo: boolean;
  };
  issues: Array<{ severity: string; category: string; title: string }>;
};

const urls = [
  'https://www.rhoen-park-hotel.de/',
  'https://www.franco-consulting.com/',
];

async function main() {
  const results: any[] = [];
  const summaries: Summary[] = [];

  for (const url of urls) {
    console.log(`\n=== Deep Scan: ${url} ===`);
    try {
      const result = await analyzeWebsite(url);
      results.push(result);

      const summary: Summary = {
        url,
        status: result.status,
        scanMode: (result as any).scanMode,
        score: result.score,
        cookieBanner: {
          detected: result.cookieBanner.detected,
          provider: result.cookieBanner.provider,
          hasAcceptButton: result.cookieBanner.hasAcceptButton,
          hasRejectButton: result.cookieBanner.hasRejectButton,
          hasEssentialSaveButton: result.cookieBanner.hasEssentialSaveButton,
          hasSettingsOption: result.cookieBanner.hasSettingsOption,
          blocksContent: result.cookieBanner.blocksContent,
        },
        consentTest: result.cookieConsentTest ? {
          trackingBeforeConsent: result.cookieConsentTest.analysis.trackingBeforeConsent,
          consentWorksProperly: result.cookieConsentTest.analysis.consentWorksProperly,
          rejectWorksProperly: result.cookieConsentTest.analysis.rejectWorksProperly,
          beforeCookieCount: result.cookieConsentTest.beforeConsent.cookieCount,
          afterAcceptCookieCount: result.cookieConsentTest.afterAccept.cookieCount,
          afterRejectCookieCount: result.cookieConsentTest.afterReject.cookieCount,
          afterAcceptButtonText: result.cookieConsentTest.afterAccept.buttonText,
          afterRejectButtonText: result.cookieConsentTest.afterReject.buttonText,
          issues: result.cookieConsentTest.analysis.issues.map((i: any) => ({ severity: i.severity, title: i.title })),
        } : undefined,
        trackingTags: {
          googleAnalytics: result.trackingTags.googleAnalytics.detected,
          googleTagManager: result.trackingTags.googleTagManager.detected,
          googleAds: result.trackingTags.googleAdsConversion.detected,
          metaPixel: result.trackingTags.metaPixel.detected,
          linkedIn: result.trackingTags.linkedInInsight.detected,
          tiktok: result.trackingTags.tiktokPixel.detected,
          pinterest: !!result.trackingTags.pinterestTag?.detected,
          snapchat: !!result.trackingTags.snapchatPixel?.detected,
          twitter: !!result.trackingTags.twitterPixel?.detected,
          bingAds: !!result.trackingTags.bingAds?.detected,
          criteo: !!result.trackingTags.criteo?.detected,
        },
        issues: result.issues.map((i: any) => ({ severity: i.severity, category: i.category, title: i.title })),
      };

      summaries.push(summary);
      console.log(JSON.stringify(summary, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Fehler bei ${url}: ${message}`);
      results.push({ url, error: message });
      summaries.push({
        url,
        status: 'error',
        score: 0,
        cookieBanner: {
          detected: false,
          hasAcceptButton: false,
          hasRejectButton: false,
          hasEssentialSaveButton: false,
          hasSettingsOption: false,
          blocksContent: false,
        },
        trackingTags: {
          googleAnalytics: false,
          googleTagManager: false,
          googleAds: false,
          metaPixel: false,
          linkedIn: false,
          tiktok: false,
          pinterest: false,
          snapchat: false,
          twitter: false,
          bingAds: false,
          criteo: false,
        },
        issues: [{ severity: 'error', category: 'general', title: message }],
      });
    }
  }

  const outDir = path.resolve('./tmp');
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `deep-scan-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify({ summaries, results }, null, 2));
  console.log(`\nSaved full results to: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
