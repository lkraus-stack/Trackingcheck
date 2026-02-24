'use client';

import { AlertTriangle, CheckCircle2, Shield, TrendingUp, Wrench, XCircle } from 'lucide-react';
import type { PublicAnalysisResult } from '@/types/public-analysis';

export function LiteResultSummary({ result }: { result: PublicAnalysisResult }) {
  const score = result.score;
  const level =
    score < 50 ? 'critical' : score < 80 ? 'optimize' : 'good';

  const ringColor =
    level === 'critical'
      ? 'text-red-400'
      : level === 'optimize'
        ? 'text-yellow-400'
        : 'text-green-400';

  const title =
    level === 'critical'
      ? 'Dein Tracking hat kritische Lücken'
      : level === 'optimize'
        ? 'Dein Tracking hat ungenutzte Potenziale'
        : 'Gutes Setup – mit Optimierungspotenzial';

  const subtitle =
    level === 'critical'
      ? 'Einige Punkte sollten zeitnah behoben werden, sonst gehen Daten und Performance verloren.'
      : level === 'optimize'
        ? 'Du kannst mit kleinen Anpassungen deutlich bessere Datenqualität und ROAS-Optimierung erreichen.'
        : 'Sieht solide aus – wir zeigen dir die größten Hebel für noch bessere Daten.';

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-4">
          <ScoreRing score={score} colorClass={ringColor} />
          <div>
            <div className="text-sm text-slate-400">Kurz-Auswertung</div>
            <div className="text-lg sm:text-xl font-semibold text-slate-100">{title}</div>
            <div className="text-sm text-slate-400 mt-1">{subtitle}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MiniTile
          icon={<Shield className="w-4 h-4" />}
          title="Consent / Banner"
          lines={[
            result.summary.consentModeDetected
              ? `Consent Mode: ${result.summary.consentModeVersion ?? 'erkannt'}`
              : 'Consent Mode: nicht erkannt',
            result.summary.cookieBannerDetected
              ? result.summary.cookieBannerHasRejectButton
                ? 'Cookie-Banner: Ablehnen vorhanden'
                : 'Cookie-Banner: Ablehnen fehlt'
              : 'Cookie-Banner: nicht erkannt',
            typeof result.summary.trackingBeforeConsent === 'boolean'
              ? result.summary.trackingBeforeConsent
                ? 'Tracking vor Consent: erkannt'
                : 'Tracking vor Consent: ok'
              : undefined,
          ]}
          tone={
            !result.summary.consentModeDetected ||
            (result.summary.cookieBannerDetected && !result.summary.cookieBannerHasRejectButton) ||
            result.summary.trackingBeforeConsent
              ? 'warn'
              : 'good'
          }
        />

        <MiniTile
          icon={<TrendingUp className="w-4 h-4" />}
          title="Tracking & Potenzial"
          lines={[
            result.summary.serverSideTrackingDetected
              ? 'Server-Side Tracking: erkannt'
              : 'Server-Side Tracking: fehlt (häufiger ROAS-Hebel)',
            result.summary.ecommerceDetected
              ? result.summary.ecommerceHasTransactionValue
                ? 'E-Commerce Werte: vorhanden'
                : 'E-Commerce Werte: fehlen (ROAS leidet)'
              : 'E-Commerce: nicht erkannt',
            typeof result.summary.thirdPartyTotalCount === 'number'
              ? `Third-Party Requests: ${result.summary.thirdPartyTotalCount}`
              : undefined,
          ]}
          tone={
            (!result.summary.serverSideTrackingDetected && score < 80) ||
            (result.summary.ecommerceDetected && !result.summary.ecommerceHasTransactionValue)
              ? 'warn'
              : 'good'
          }
        />
      </div>

      {result.findings.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-400" />
            Top-Potenziale (Auszug)
          </div>
          <div className="space-y-2">
            {result.findings.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl"
              >
                <div className="flex items-start gap-2">
                  <FindingIcon severity={f.severity} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100">{f.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{f.description}</div>
                    {f.recommendation && (
                      <div className="text-xs text-indigo-300 mt-1">{f.recommendation}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Hinweis: Die Landing zeigt bewusst nur einen Auszug.
          </div>
        </div>
      )}
    </div>
  );
}

function FindingIcon({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  if (severity === 'error') return <XCircle className="w-4 h-4 text-red-400 mt-0.5" />;
  if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />;
  return <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5" />;
}

function MiniTile({
  icon,
  title,
  lines,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  lines: Array<string | undefined>;
  tone: 'good' | 'warn';
}) {
  const toneClass =
    tone === 'warn'
      ? 'border-yellow-500/30 bg-yellow-500/5'
      : 'border-green-500/20 bg-green-500/5';

  return (
    <div className={`p-3 rounded-xl border ${toneClass}`}>
      <div className="flex items-center gap-2 text-slate-200 font-medium text-sm">
        <span className="text-indigo-400">{icon}</span>
        {title}
      </div>
      <ul className="mt-2 space-y-1 text-xs text-slate-400">
        {lines.filter(Boolean).map((l, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500 flex-shrink-0" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreRing({ score, colorClass }: { score: number; colorClass: string }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="text-slate-700"
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className={colorClass}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`text-lg font-bold ${colorClass}`}>{Math.round(score)}</div>
      </div>
    </div>
  );
}

