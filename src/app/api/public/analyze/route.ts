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
    const timeoutWrapper = 90000;
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
      details = 'Die Website hat zu lange zum Laden gebraucht. Bitte versuchen Sie es erneut.';
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
    },
  };
}

function buildFindings(result: AnalysisResult): PublicAnalysisFinding[] {
  const findings: PublicAnalysisFinding[] = [];

  // 1) Opinionated, lead-magnet-relevante Findings
  if (!result.googleConsentMode.detected || result.googleConsentMode.version !== 'v2') {
    findings.push({
      id: 'consent_mode_v2',
      severity: 'error',
      title: 'Google Consent Mode v2 fehlt oder ist nicht korrekt',
      description: 'Ohne Consent Mode v2 kann Datenqualität und Ads-Performance leiden.',
      recommendation: 'Consent Mode v2 sauber über GTM/CMP implementieren und testen.',
    });
  }

  if (result.cookieBanner.detected && !result.cookieBanner.hasRejectButton) {
    findings.push({
      id: 'cookie_banner_reject',
      severity: 'warning',
      title: 'Cookie-Banner ohne klare Ablehnen-Option',
      description: 'Das ist oft ein Compliance- und Trust-Problem und kann Consent-Raten verzerren.',
      recommendation: 'Ablehnen-Option gleichwertig zum Akzeptieren anbieten.',
    });
  }

  if (result.cookieConsentTest?.analysis?.trackingBeforeConsent) {
    findings.push({
      id: 'tracking_before_consent',
      severity: 'error',
      title: 'Tracking vor Consent erkannt',
      description: 'Kritischer DSGVO-/Compliance-Risikofaktor und häufige Ursache für falsche Daten.',
      recommendation: 'Tags erst nach gültigem Consent feuern lassen (Consent-Gating prüfen).',
    });
  }

  if (!result.trackingTags?.serverSideTracking?.detected) {
    findings.push({
      id: 'server_side_missing',
      severity: 'info',
      title: 'Server-Side Tracking nicht erkannt',
      description: 'Server-Side kann Match-Rate, Attribution und Datenstabilität verbessern.',
      recommendation: 'sGTM/Conversions API prüfen (je nach Stack).',
    });
  }

  if (
    result.dataLayerAnalysis?.ecommerce?.detected &&
    !result.dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue
  ) {
    findings.push({
      id: 'ecommerce_value_missing',
      severity: 'warning',
      title: 'E-Commerce Wertübergabe fehlt/ist unvollständig',
      description: 'Ohne Werte kann ROAS-Optimierung in Ads-Plattformen deutlich schlechter werden.',
      recommendation: 'Value/Currency/Items korrekt im DataLayer und in Events übergeben.',
    });
  }

  // 2) Fallback: Top-Issues aus Analyse (nur Text, keine IDs/Evidenzen)
  const existing = new Set(findings.map((f) => f.id));
  const fromIssues = topIssues(result.issues).map((issue, idx) => ({
    id: `issue_${idx}_${issue.category}`,
    severity: issue.severity,
    title: issue.title,
    description: issue.description,
    recommendation: issue.recommendation,
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

