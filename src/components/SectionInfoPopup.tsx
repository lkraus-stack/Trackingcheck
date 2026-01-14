'use client';

import { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, Loader2, AlertCircle } from 'lucide-react';
import { AnalysisResult } from '@/types';
import ReactMarkdown from 'react-markdown';

interface SectionInfoPopupProps {
  sectionName: string;
  sectionData: unknown;
  fullAnalysis: AnalysisResult;
  trigger: React.ReactNode;
}

export function SectionInfoPopup({ sectionName, sectionData, fullAnalysis, trigger }: SectionInfoPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Erklärung direkt beim Mount laden
  useEffect(() => {
    const fetchExplanation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/explain-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionName,
            sectionData,
            fullAnalysis,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.configured === false) {
            throw new Error('KI-API ist nicht konfiguriert.');
          }
          throw new Error(data.details || data.error || 'Erklärung fehlgeschlagen');
        }

        setExplanation(data.explanation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [sectionName, sectionData, fullAnalysis]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="text-slate-400 hover:text-slate-300 transition-colors relative"
        title="Informationen zu dieser Sektion"
      >
        {trigger}
        {isLoading && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Popup */}
          <div
            ref={popupRef}
            className="fixed z-50 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-lg w-[90vw] max-h-[80vh] overflow-hidden"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium text-slate-200">{sectionName}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {isLoading && (
                <div className="flex items-center justify-center gap-3 py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <span className="text-slate-300">KI generiert Erklärung...</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">Fehler</p>
                    <p className="text-red-400/80 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {explanation && !isLoading && !error && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-lg font-bold text-slate-200 mt-4 mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold text-slate-200 mt-3 mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-300 mt-2 mb-1">{children}</h3>,
                      p: ({ children }) => <p className="text-slate-300 text-sm mb-2 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside text-slate-300 text-sm mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside text-slate-300 text-sm mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-slate-300">{children}</li>,
                      strong: ({ children }) => <strong className="text-slate-200 font-semibold">{children}</strong>,
                      code: ({ children }) => <code className="bg-slate-700 px-1 py-0.5 rounded text-xs text-blue-300">{children}</code>,
                    }}
                  >
                    {explanation}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
