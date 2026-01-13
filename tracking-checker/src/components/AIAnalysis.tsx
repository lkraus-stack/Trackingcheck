'use client';

import { useState } from 'react';
import { Sparkles, Loader2, MessageSquare, Send, Bot, AlertCircle } from 'lucide-react';
import { AnalysisResult } from '@/types';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisProps {
  result: AnalysisResult;
}

export function AIAnalysis({ result }: AIAnalysisProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const generateAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisResult: result }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.configured === false) {
          throw new Error('KI-API ist nicht konfiguriert. Bitte API-Key in .env.local hinterlegen.');
        }
        throw new Error(data.details || data.error || 'Analyse fehlgeschlagen');
      }

      setAiAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage, context: result }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Antwort fehlgeschlagen');
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}` },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {/* KI-Analyse Button */}
      {!aiAnalysis && !isLoading && (
        <button
          onClick={generateAnalysis}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all"
        >
          <Sparkles className="w-5 h-5" />
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
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-500/10 border-b border-purple-500/30">
            <Bot className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-purple-300">KI-Auswertung</span>
          </div>
          <div className="p-4 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold text-slate-200 mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold text-slate-200 mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-300 mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="text-slate-300 text-sm mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside text-slate-300 text-sm mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside text-slate-300 text-sm mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-slate-300">{children}</li>,
                strong: ({ children }) => <strong className="text-slate-200 font-semibold">{children}</strong>,
                code: ({ children }) => <code className="bg-slate-700 px-1 py-0.5 rounded text-xs text-purple-300">{children}</code>,
              }}
            >
              {aiAnalysis}
            </ReactMarkdown>
          </div>

          {/* Chat Toggle */}
          <div className="px-4 py-3 border-t border-purple-500/30">
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              {showChat ? 'Chat ausblenden' : 'Rückfragen stellen'}
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {showChat && aiAnalysis && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-sm text-slate-400">Stelle Fragen zur Analyse</p>
          </div>

          {/* Chat Messages */}
          {chatMessages.length > 0 && (
            <div className="max-h-60 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Denkt nach...</span>
                </div>
              )}
            </div>
          )}

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-700">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="z.B. Was bedeutet TCF 2.2?"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                disabled={isChatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
