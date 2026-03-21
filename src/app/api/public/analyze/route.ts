import { NextRequest, NextResponse } from 'next/server';
import { analyzeWebsite } from '@/lib/analyzer';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/cache/analysisCache';
import type { AnalysisRequest, AnalysisResult, Issue } from '@/types';
import type { PublicAnalysisFinding, PublicAnalysisResult } from '@/types/public-analysis';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();

    if (!body.url) {
      return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 });
    }

    // URL normalisieren/validieren
    let url = body.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Ungültige URL' }, { status: 400 });
    }

    const skipCache = body.options?.skipCache === true;
    if (!skipCache) {
      const cached = getCachedAnalysis(url);
      if (cached) {
        const publicResult = redactAnalysis(cached);
        return NextResponse.json({ ...publicResult, fromCache: true } satisfies PublicAnalysisResult);
      }
    }

    // Full-Scan durchführen, Ergebnis serverseitig redacted zurückgeben
    const timeoutWrapper = 120000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_PROTECTION')), timeoutWrapper)
    );

    const fullResult = (await Promise.race([
      analyzeWebsite(url),
      timeoutPromise,
    ])) as AnalysisResult;

    setCachedAnalysis(url, fullResult);

    const publicResult = redactAnalysis(fullResult);
    return NextResponse.json(publicResult satisfies PublicAnalysisResult);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

    let userFriendlyMessage = 'Analyse fehlgeschlagen';
    let details = errorMessage;

    if (errorMessage === 'TIMEOUT_PROTECTION') {
      userFriendlyMessage = 'Zeitüberschreitung';
      details = 'Die Website hat länger als erwartet für Navigation, Consent oder dynamische Tracker gebraucht. Bitte versuchen Sie es erneut oder testen Sie die URL später noch einmal.';
    }

    return NextResponse.json(
      {
        error: userFriendlyMessage,
        details,
      },
      { status: 500 }
    );
  }
}

function redactAnalysis(result: AnalysisResult): PublicAnalysisResult {
  const score = result.scoreBreakdown?.overall ?? result.score;
  const findings = buildFindings(result).slice(0, 5);
  const trackingBeforeConsent = result.cookieConsentTest?.analysis?.trackingBeforeConsent;
  const detectedTrackers = getDetectedTrackerNames(result);

  return {
    url: result.url,
    timestamp: result.timestamp,
    score,
    findings,
    summary: {
      cookieBannerDetected: !!result.cookieBanner?.detected,
      cookieBannerHasRejectButton: !!result.cookieBanner?.hasRejectButton,
      consentModeDetected: !!result.googleConsentMode?.detected,
      consentModeVersion: result.googleConsentMode?.version,
      trackingBeforeConsent,
      serverSideTrackingDetected: !!result.trackingTags?.serverSideTracking?.detected,
      ecommerceDetected: !!result.dataLayerAnalysis?.ecommerce?.detected,
      ecommerceHasTransactionValue: !!result.dataLayerAnalysis?.ecommerce?.valueTracking?.hasTransactionValue,
      thirdPartyTotalCount: result.thirdPartyDomains?.totalCount,
      detectedTrackers,
    },
  };
}

function buildFindings(result: AnalysisResult): PublicAnalysisFinding[] {
  const findings: PublicAnalysisFinding[] = [];
  const detectedTrackers = getDetectedTrackerNames(result);
  const hasGoogleStack =
    result.trackingTags.googleAnalytics.detected ||
    result.trackingTags.googleTagManager.detected ||
    result.trackingTags.googleAdsConversion.detected;
  const addFinding = (finding: PublicAnalysisFinding) => {
    if (!findings.some((entry) => entry.id === finding.id)) {
      findings.push(finding);
    }
  };

  if (result.cookieConsentTest?.analysis?.trackingBeforeConsent) {
    addFinding({
      id: 'tracking_before_consent',
      severity: 'error',
      kind: 'compliance',
      confidence: 'high',
      title: 'Tracking vor Einwilligung erkannt',
      description: 'Im Consent-Test wurden Tracking-Signale vor einer bestätigten Nutzerentscheidung beobachtet.',
      recommendation: 'Consent-Gating und Tag-Auslösung prüfen, damit Marketing-/Analytics-Signale erst nach gültiger Einwilligung feuern.',
      evidence: [
        `Cookies vor Interaktion: ${result.cookieConsentTest.beforeConsent.cookieCount}`,
        result.cookieConsentTest.beforeConsent.trackingCookiesFound
          ? 'Marketing-/Analytics-Cookies vor Entscheidung erkannt'
          : 'Consent-Test meldet Vorab-Tracking',
      ],
    });
  }

  if (result.cookieBanner.detected && !result.cookieBanner.hasRejectButton) {
    addFinding({
      id: 'cookie_banner_reject',
      severity: 'warning',
      kind: 'compliance',
      confidence: result.cookieBanner.provider ? 'high' : 'medium',
      title: 'Cookie-Banner ohne klar bestätigte Ablehnen-Option',
      description: 'Der Scanner hat ein Banner erkannt, aber keine gleichwertige Ablehnen-Aktion sicher bestätigt.',
      recommendation: 'Banner-Konfiguration und Ablehnen-Flow prüfen, insbesondere bei mehrstufigen CMPs.',
      evidence: [
        result.cookieBanner.provider ? `Erkannter CMP: ${result.cookieBanner.provider}` : 'Banner im DOM/Netzwerk erkannt',
        result.cookieBanner.hasSettingsOption ? 'Einstellungsoption vorhanden' : 'Keine Einstellungsoption erkannt',
      ],
    });
  }

  if (hasGoogleStack && (!result.googleConsentMode.detected || result.googleConsentMode.version !== 'v2')) {
    addFinding({
      id: 'consent_mode_v2',
      severity: 'warning',
      kind: 'data_quality',
      confidence: detectedTrackers.some((entry) => entry === 'GA4' || entry === 'GTM' || entry === 'Google Ads') ? 'high' : 'medium',
      title: 'Google Consent Mode v2 nicht eindeutig bestätigt',
      description: 'Google-bezogene Tags wurden erkannt, aber Consent Mode v2 wurde nicht sicher als vollständig aktiv bestätigt.',
      recommendation: 'Consent Mode v2 mit echten Nutzerpfaden testen und die v2-Parameter sauber ausspielen.',
      evidence: [
        `Google-Signale: ${detectedTrackers.filter((entry) => ['GA4', 'GTM', 'Google Ads'].includes(entry)).join(', ')}`,
        result.googleConsentMode.detected
          ? `Erkannte Version: ${result.googleConsentMode.version ?? 'unbekannt'}`
          : 'Kein Consent-Mode-Signal erkannt',
      ],
    });
  }

  if (
    result.dataLayerAnalysis?.ecommerce?.detected &&
    !result.dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue
  ) {
    addFinding({
      id: 'ecommerce_value_missing',
      severity: 'warning',
      kind: 'data_quality',
      confidence: 'high',
      title: 'E-Commerce-Wertübergabe fehlt oder ist unvollständig',
      description: 'E-Commerce-Signale wurden erkannt, aber Umsatz-/Value-Daten konnten nicht vollständig bestätigt werden.',
      recommendation: 'Value, Currency und Item-Daten im DataLayer und in den Zielplattformen gegentesten.',
      evidence: [
        `Erkannte E-Commerce-Events: ${result.dataLayerAnalysis.ecommerce.events.length}`,
        `Fehlende Felder: ${result.dataLayerAnalysis.ecommerce.valueTracking.missingRecommended.slice(0, 3).join(', ') || 'Value/Currency'}`,
      ],
    });
  }

  if (
    result.thirdPartyDomains?.riskAssessment?.unknownDomains?.length
  ) {
    addFinding({
      id: 'unknown_third_parties',
      severity: result.thirdPartyDomains.riskAssessment.unknownDomains.length > 2 ? 'warning' : 'info',
      kind: 'technical',
      confidence: 'medium',
      title: 'Unklassifizierte Drittanbieter erkannt',
      description: 'Ein Teil der externen Domains konnte nicht eindeutig einer bekannten Tracking- oder Infrastruktur-Kategorie zugeordnet werden.',
      recommendation: 'Diese Domains manuell prüfen und bei Bedarf die Erkennungsliste erweitern.',
      evidence: result.thirdPartyDomains.riskAssessment.unknownDomains.slice(0, 3),
    });
  }

  if (!result.trackingTags?.serverSideTracking?.detected && detectedTrackers.length > 0) {
    addFinding({
      id: 'server_side_missing',
      severity: 'info',
      kind: 'optimization',
      confidence: 'medium',
      title: 'Kein serverseitiges Tracking bestätigt',
      description: 'Im aktuellen Scan wurden keine starken Hinweise auf serverseitige Endpunkte oder APIs gefunden.',
      recommendation: 'Falls Match-Rate, Attribution oder Adblocker-Stabilität wichtig sind, serverseitige Optionen separat prüfen.',
      evidence: [
        `Erkannte Tracker: ${detectedTrackers.slice(0, 4).join(', ')}`,
      ],
    });
  }

  // Fallback: Top-Issues aus der Vollanalyse ergänzen
  const existing = new Set(findings.map((f) => f.id));
  const fromIssues = topIssues(result.issues).map((issue, idx) => ({
    id: `issue_${idx}_${issue.category}_${slugify(issue.title)}`,
    severity: issue.severity,
    kind: mapIssueKind(issue),
    confidence: issue.severity === 'error' ? 'high' : 'medium',
    title: issue.title,
    description: issue.description,
    recommendation: issue.recommendation,
    evidence: [] as string[],
  }));

  for (const f of fromIssues) {
    if (existing.size >= 5) break;
    if (existing.has(f.id)) continue;
    findings.push(f);
    existing.add(f.id);
  }

  return findings;
}

function topIssues(issues: Issue[]): Issue[] {
  const severityOrder: Record<Issue['severity'], number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  return [...issues]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 5);
}

function mapIssueKind(issue: Issue): PublicAnalysisFinding['kind'] {
  switch (issue.category) {
    case 'cookie-banner':
    case 'cookies':
    case 'consent-mode':
    case 'gdpr':
    case 'dma':
    case 'tcf':
      return 'compliance';
    case 'tracking':
    case 'conversion':
    case 'attribution':
    case 'ecommerce':
    case 'gtm':
      return 'data_quality';
    case 'privacy':
      return 'technical';
    default:
      return 'optimization';
  }
}

function getDetectedTrackerNames(result: AnalysisResult): string[] {
  const trackers: string[] = [];

  if (result.trackingTags.googleAnalytics.detected) trackers.push('GA4');
  if (result.trackingTags.googleTagManager.detected) trackers.push('GTM');
  if (result.trackingTags.googleAdsConversion.detected) trackers.push('Google Ads');
  if (result.trackingTags.metaPixel.detected) trackers.push('Meta Pixel');
  if (result.trackingTags.linkedInInsight.detected) trackers.push('LinkedIn');
  if (result.trackingTags.tiktokPixel.detected) trackers.push('TikTok');
  if (result.trackingTags.pinterestTag.detected) trackers.push('Pinterest');
  if (result.trackingTags.snapchatPixel.detected) trackers.push('Snapchat');
  if (result.trackingTags.twitterPixel.detected) trackers.push('X/Twitter');
  if (result.trackingTags.redditPixel.detected) trackers.push('Reddit');
  if (result.trackingTags.bingAds.detected) trackers.push('Bing Ads');
  if (result.trackingTags.criteo.detected) trackers.push('Criteo');

  for (const other of result.trackingTags.other) {
    trackers.push(other.name);
  }

  if (result.trackingTags.serverSideTracking.summary.hasServerSideGTM) trackers.push('Server-Side GTM');
  if (result.trackingTags.serverSideTracking.summary.hasMetaCAPI) trackers.push('Meta CAPI');

  return [...new Set(trackers)].slice(0, 10);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

