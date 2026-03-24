'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Bot, AlertCircle, AlertTriangle } from 'lucide-react';
import { AnalysisResult } from '@/types';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisProps {
  result: AnalysisResult;
  onAnalysisGenerated?: (analysis: string | null) => void;
}

interface AnalyzeAiResponse {
  analysis?: string;
  validation?: string | null;
  configured?: boolean;
  details?: string;
  error?: string;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const responseText = await response.text();

  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(
      response.ok
        ? 'Unerwartetes Antwortformat vom Server'
        : `Server-Fehler (${response.status}): ${responseText.substring(0, 100)}`
    );
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(
      `Server-Antwort konnte nicht als JSON gelesen werden: ${responseText.substring(0, 100)}`
    );
  }
}

export function AIAnalysis({ result, onAnalysisGenerated }: AIAnalysisProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisResult: result }),
      });

      const data = await readJsonResponse<AnalyzeAiResponse>(response);

      if (!response.ok) {
        if (data.configured === false) {
          throw new Error('KI-API ist nicht konfiguriert. Bitte API-Key in .env.local hinterlegen.');
        }
        throw new Error(data.details || data.error || 'Analyse fehlgeschlagen');
      }

      if (!data.analysis) {
        throw new Error('KI-Analyse-Antwort enthält keinen Bericht.');
      }

      setAiAnalysis(data.analysis);
      setValidation(data.validation || null);
      onAnalysisGenerated?.(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  const focusMainChat = () => {
    window.dispatchEvent(new CustomEvent('tracking-chat-focus'));
  };

  return (
    <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
      {/* KI-Analyse Button */}
      {!aiAnalysis && !isLoading && (
        <button
          onClick={generateAnalysis}
          className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all"
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          KI-Analyse starten
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-6 bg-slate-800/50 rounded-xl border border-slate-700">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className="text-slate-300">KI analysiert die Ergebnisse...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Fehler bei der KI-Analyse</p>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
            <button
              onClick={generateAnalysis}
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {/* KI-Analyse Ergebnis */}
      {aiAnalysis && (
        <>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border-b border-purple-500/30">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <span className="font-medium text-purple-300">Ausführlicher KI-Analyse-Bericht</span>
              </div>
              <span className="text-xs text-purple-400/70 bg-purple-500/20 px-2 py-1 rounded">
                Detaillierte Auswertung
              </span>
            </div>
            <div className="p-6 prose prose-invert prose-sm max-w-none overflow-y-auto max-h-[800px] scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-purple-500/30 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-purple-200 mt-6 mb-3 flex items-center gap-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-slate-200 mt-4 mb-2 ml-1">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-sm font-semibold text-slate-300 mt-3 mb-1 ml-2">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside ml-5 text-slate-300 text-sm mb-3 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside ml-5 text-slate-300 text-sm mb-3 space-y-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-slate-300 leading-relaxed pl-1">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-slate-100 font-semibold">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-purple-300 italic">
                      {children}
                    </em>
                  ),
                  code: ({ children }) => (
                    <code className="bg-slate-700/80 px-1.5 py-0.5 rounded text-xs text-purple-300 font-mono">
                      {children}
                    </code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-purple-500/50 pl-4 py-1 my-3 bg-purple-500/5 rounded-r text-slate-400 italic">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="my-6 border-purple-500/30" />
                  ),
                }}
              >
                {aiAnalysis}
              </ReactMarkdown>
            </div>
          </div>

          {/* Validierungs-Ergebnisse */}
          {validation && (
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-amber-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="font-medium text-amber-300">Qualitätssicherung & Checkliste</span>
                </div>
                <span className="text-xs text-amber-400/70 bg-amber-500/20 px-2 py-1 rounded">
                  Zusätzliche Hinweise
                </span>
              </div>
              <div className="p-6 prose prose-invert prose-sm max-w-none overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-transparent">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-amber-500/30 first:mt-0">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-amber-200 mt-6 mb-3 flex items-center gap-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-slate-200 mt-4 mb-2 ml-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-outside ml-5 text-slate-300 text-sm mb-3 space-y-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-outside ml-5 text-slate-300 text-sm mb-3 space-y-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-slate-300 leading-relaxed pl-1">
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-slate-100 font-semibold">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="text-amber-300 italic">
                        {children}
                      </em>
                    ),
                    code: ({ children }) => (
                      <code className="bg-slate-700/80 px-1.5 py-0.5 rounded text-xs text-amber-300 font-mono">
                        {children}
                      </code>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-amber-500/50 pl-4 py-1 my-3 bg-amber-500/5 rounded-r text-slate-400 italic">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {validation}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-sm text-slate-200">Rückfragen zur Analyse stellst du direkt im Hauptchat.</p>
            <p className="mt-1 text-sm text-slate-400">
              Dort kannst du weitere URLs prüfen oder konkrete Fragen zu dieser Website stellen.
            </p>
            <button
              onClick={focusMainChat}
              className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Zum Hauptchat springen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
