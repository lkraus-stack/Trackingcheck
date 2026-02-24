'use client';

import { useMemo, useState } from 'react';
import { Globe, Loader2, Send } from 'lucide-react';
import type { PublicAnalysisResult } from '@/types/public-analysis';
import { LiteResultSummary } from './LiteResultSummary';
import { LeadCaptureForm } from './LeadCaptureForm';
import { useToast } from '@/contexts/ToastContext';

interface LandingAnalyzerProps {
  autoFocus?: boolean;
}

export function LandingAnalyzer({ autoFocus = false }: LandingAnalyzerProps) {
  const { showError } = useToast();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PublicAnalysisResult | null>(null);

  const normalizedUrl = useMemo(() => normalizeUrl(input), [input]);

  const canSubmit = normalizedUrl.ok && !isLoading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/public/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl.url }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        showError(data?.error || 'Analyse fehlgeschlagen. Bitte versuche es erneut.');
        return;
      }

      setResult(data as PublicAnalysisResult);
    } catch {
      showError('Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Globe className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Website-URL eingeben (z.B. www.example.com)"
            className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm sm:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            disabled={isLoading}
            autoFocus={autoFocus}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="hidden sm:inline">{isLoading ? 'Prüfe…' : 'Prüfen'}</span>
        </button>
      </form>

      {!normalizedUrl.ok && input.trim().length > 0 && (
        <div className="text-xs text-red-400">
          Bitte gib eine gültige Website-Adresse ein (z.B. `example.com`).
        </div>
      )}

      {isLoading && (
        <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <div>
              <div className="text-sm text-slate-200 font-medium">Analyse läuft…</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Das dauert meistens ~60 Sekunden (je nach Website).
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <LiteResultSummary result={result} />
          <LeadCaptureForm result={result} />
        </div>
      )}
    </div>
  );
}

function normalizeUrl(input: string): { ok: boolean; url: string } {
  const raw = input.trim();
  if (!raw) return { ok: false, url: '' };

  let candidate = raw;
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (!url.hostname || url.hostname.includes(' ')) return { ok: false, url: '' };
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false, url: '' };
  }
}

