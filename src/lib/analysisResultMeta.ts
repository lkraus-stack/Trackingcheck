import type { AnalysisCacheInfo, AnalysisDebugInfo, AnalysisResult } from '@/types';
import { getCacheVersion } from '@/lib/cache/analysisCache';
import {
  getAnalyzerBrowserRuntime,
  getBuildId,
  getDeploymentEnvironment,
  getExecutionRegion,
} from '@/lib/runtime/serverRuntime';

function hasLikelyTrackingSignals(trackingTags: AnalysisResult['trackingTags']): boolean {
  return (
    !!trackingTags?.googleAnalytics?.detected ||
    !!trackingTags?.googleTagManager?.detected ||
    !!trackingTags?.googleAdsConversion?.detected ||
    !!trackingTags?.metaPixel?.detected ||
    !!trackingTags?.linkedInInsight?.detected ||
    !!trackingTags?.tiktokPixel?.detected ||
    !!trackingTags?.pinterestTag?.detected ||
    !!trackingTags?.snapchatPixel?.detected ||
    !!trackingTags?.twitterPixel?.detected ||
    !!trackingTags?.redditPixel?.detected ||
    !!trackingTags?.bingAds?.detected ||
    !!trackingTags?.criteo?.detected ||
    (trackingTags?.other?.length ?? 0) > 0 ||
    !!trackingTags?.serverSideTracking?.detected
  );
}

export function getSuspiciousAnalysisReason(
  result: Pick<AnalysisResult, 'cookieBanner' | 'trackingTags' | 'cookies' | 'cookieConsentTest'>
): string | null {
  const finalCookieCount = result.cookies?.length ?? 0;
  const afterAcceptCookieCount = result.cookieConsentTest?.afterAccept?.cookieCount ?? 0;

  if (afterAcceptCookieCount > 0 && finalCookieCount === 0) {
    return `Consent-Test fand ${afterAcceptCookieCount} Cookies nach Accept, aber das Endergebnis blieb bei 0`;
  }

  if (result.cookieBanner?.detected && hasLikelyTrackingSignals(result.trackingTags) && finalCookieCount === 0) {
    return 'Cookie-Banner und Tracking wurden erkannt, aber das Ergebnis enthält 0 Cookies';
  }

  return null;
}

export function getAnalysisDebugInfo(): AnalysisDebugInfo {
  return {
    environment: getDeploymentEnvironment(),
    runtime: getAnalyzerBrowserRuntime(),
    buildId: getBuildId(),
    cacheVersion: getCacheVersion(),
    region: getExecutionRegion(),
  };
}

export function createAnalysisCacheInfo(options: {
  cached: boolean;
  requestedFreshScan?: boolean;
  bypassReason?: string;
}): AnalysisCacheInfo {
  let message = options.cached ? 'Ergebnis aus Cache (max. 24h alt)' : 'Frisch berechnet';

  if (!options.cached && options.requestedFreshScan) {
    message = 'Frischscan ohne Cache';
  }

  if (options.bypassReason) {
    message = `${message} · verdächtigen Cache ignoriert`;
  }

  return {
    cached: options.cached,
    message,
    version: getCacheVersion(),
    requestedFreshScan: options.requestedFreshScan,
    bypassReason: options.bypassReason,
  };
}

export function withAnalysisMeta(
  result: AnalysisResult,
  options: {
    cached: boolean;
    requestedFreshScan?: boolean;
    bypassReason?: string;
  }
): AnalysisResult {
  return {
    ...result,
    fromCache: options.cached,
    cacheInfo: createAnalysisCacheInfo(options),
    debugInfo: getAnalysisDebugInfo(),
  };
}
