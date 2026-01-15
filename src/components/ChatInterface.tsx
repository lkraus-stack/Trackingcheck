'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Globe, Loader2, History, RefreshCw, Brain, CheckCircle2, XCircle, Clock, Sparkles, LayoutDashboard, Save, BookOpen } from 'lucide-react';
import { AnalysisResult, AnalysisStep, AnalysisHistoryItem } from '@/types';
import { ResultCard } from './ResultCard';
import { Dashboard } from './Dashboard';
import { SetupWizard } from './SetupWizard';
import { getAnalysisHistory, addToHistory, removeFromHistory, clearHistory } from '@/lib/cache/analysisCache';
import { saveAnalysis } from '@/lib/storage/projectStorage';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  analysisResult?: AnalysisResult;
  isLoading?: boolean;
  analysisSteps?: AnalysisStep[];
  error?: {
    type: string;
    message: string;
    details?: string;
  };
  fromCache?: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Willkommen beim Tracking Checker! 👋 Geben Sie eine Website-URL ein, und ich analysiere das Tracking-Setup, den Cookie-Banner, die Einwilligungssignale und die DSGVO/DMA-Compliance für Sie.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // History laden
  useEffect(() => {
    setHistory(getAnalysisHistory());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isValidUrl = (string: string) => {
    try {
      let url = string.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const simulateAnalysisSteps = (loadingId: string) => {
    const steps: { step: string; message: string; delay: number }[] = [
      { step: 'init', message: '🔧 Browser wird initialisiert...', delay: 500 },
      { step: 'connect', message: '🌐 Verbindung zur Website wird hergestellt...', delay: 1500 },
      { step: 'load', message: '📄 Seite wird geladen und gerendert...', delay: 3000 },
      { step: 'cookies', message: '🍪 Cookies werden erfasst...', delay: 5000 },
      { step: 'scripts', message: '📜 Scripts und Tracking-Tags werden analysiert...', delay: 7000 },
      { step: 'consent', message: '🛡️ Consent-Implementierung wird geprüft...', delay: 9000 },
      { step: 'banner', message: '🖼️ Cookie-Banner wird getestet...', delay: 12000 },
      { step: 'compliance', message: '⚖️ DSGVO & DMA Compliance wird bewertet...', delay: 15000 },
    ];

    steps.forEach(({ step, message, delay }) => {
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === loadingId && msg.isLoading
              ? { ...msg, content: message }
              : msg
          )
        );
      }, delay);
    });
  };

  const handleSubmit = async (e: React.FormEvent, urlOverride?: string, skipCache?: boolean) => {
    e?.preventDefault?.();
    const urlToAnalyze = urlOverride || input;
    
    if (!urlToAnalyze.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: urlToAnalyze,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!urlOverride) setInput('');

    if (!isValidUrl(urlToAnalyze)) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Das sieht nicht wie eine gültige URL aus. Bitte geben Sie eine Website-Adresse ein (z.B. www.example.com)',
        timestamp: new Date(),
        error: {
          type: 'validation',
          message: 'Ungültige URL',
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    // Loading Message mit animierten Schritten
    const loadingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: '🔧 Analyse wird vorbereitet...',
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    setIsLoading(true);
    simulateAnalysisSteps(loadingId);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: urlToAnalyze.trim(),
          options: { skipCache },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          type: data.error || 'Analyse fehlgeschlagen',
          message: data.details || 'Ein unbekannter Fehler ist aufgetreten.',
          technical: data.technicalError,
        };
      }

      // History aktualisieren
      if (data.status === 'success') {
        addToHistory(data);
        setHistory(getAnalysisHistory());
        setCurrentAnalysis(data as AnalysisResult);
        
        // Automatisch in IndexedDB speichern für Vergleichsfunktion
        try {
          await saveAnalysis(data as AnalysisResult);
        } catch (e) {
          console.log('Konnte Analyse nicht in IndexedDB speichern:', e);
        }
      }

      // Loading Message ersetzen mit Ergebnis
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                ...msg,
                content: data.fromCache 
                  ? `✅ Analyse für ${data.url} (aus Cache)`
                  : `✅ Analyse für ${data.url} abgeschlossen!`,
                isLoading: false,
                analysisResult: data as AnalysisResult,
                analysisSteps: data.analysisSteps,
                fromCache: data.fromCache,
              }
            : msg
        )
      );
    } catch (error) {
      const errorInfo = error as { type?: string; message?: string; technical?: string };
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                ...msg,
                content: `❌ ${errorInfo.type || 'Fehler bei der Analyse'}`,
                isLoading: false,
                error: {
                  type: errorInfo.type || 'error',
                  message: errorInfo.message || 'Unbekannter Fehler',
                  details: errorInfo.technical,
                },
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryClick = (item: AnalysisHistoryItem) => {
    setShowHistory(false);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, item.url);
  };

  const handleRefresh = (url: string) => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, url, true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-3 sm:space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`w-full sm:max-w-[90%] lg:max-w-[85%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white ml-auto max-w-[85%] sm:max-w-[70%]'
                  : message.role === 'system'
                  ? 'bg-slate-800/50 text-slate-200 border border-slate-700'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm">{message.content}</span>
                    <span className="text-xs text-slate-400 mt-1">Dies kann bis zu 60 Sekunden dauern...</span>
                  </div>
                </div>
              ) : message.error ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="font-medium text-red-400">{message.error.type}</span>
                  </div>
                  <p className="text-sm text-slate-300">{message.error.message}</p>
                  {message.error.details && (
                    <p className="text-xs text-slate-500 mt-2 font-mono bg-slate-900/50 p-2 rounded">
                      {message.error.details}
                    </p>
                  )}
                  <button
                    onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent, messages[messages.length - 2]?.content)}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Erneut versuchen
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">{message.content}</p>
                    {message.fromCache && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Cache
                      </span>
                    )}
                  </div>
                  {message.analysisResult && (
                    <div className="mt-3">
                      {message.fromCache && (
                        <button
                          onClick={() => handleRefresh(message.analysisResult!.url)}
                          className="mb-3 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Neue Analyse durchführen
                        </button>
                      )}
                      <ResultCard result={message.analysisResult} />
                    </div>
                  )}
                </>
              )}
              <span className="text-xs opacity-50 mt-2 block">
                {message.timestamp.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="absolute bottom-20 sm:bottom-24 left-2 right-2 sm:left-4 sm:right-4 max-w-[1400px] mx-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-60 sm:max-h-80 overflow-y-auto z-50">
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
            <span className="font-medium text-slate-200">Letzte Analysen</span>
            <button
              onClick={() => {
                clearHistory();
                setHistory([]);
              }}
              className="text-xs text-slate-400 hover:text-red-400"
            >
              Alle löschen
            </button>
          </div>
          <div className="p-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleHistoryClick(item)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm text-slate-200 truncate">{item.url}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.timestamp).toLocaleDateString('de-DE')} • Score: {item.score}
                  </p>
                </div>
                <div className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                  item.score >= 80 ? 'bg-green-500/20 text-green-400' :
                  item.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {item.score}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Modal */}
      {showDashboard && (
        <Dashboard
          onSelectUrl={(url) => {
            setInput(url);
            setShowDashboard(false);
          }}
          onClose={() => setShowDashboard(false)}
          currentAnalysis={currentAnalysis}
        />
      )}

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <SetupWizard
          onClose={() => setShowSetupWizard(false)}
          analysis={currentAnalysis}
        />
      )}

      {/* Input Area */}
      <div className="border-t border-slate-800 py-3 sm:py-4 bg-slate-900/50 backdrop-blur shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
          {/* Action Buttons */}
          <div className="hidden min-[480px]:flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowDashboard(true)}
              className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl border bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-indigo-500 transition-colors"
              title="Dashboard öffnen"
            >
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowSetupWizard(true)}
              className="hidden sm:block p-2.5 sm:p-3 rounded-lg sm:rounded-xl border bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-green-500 transition-colors"
              title="Setup-Wizard & Anleitungen"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl border transition-colors ${
                showHistory 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Historie anzeigen"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          
          {/* Input Field */}
          <div className="relative flex-1 min-w-0">
            <Globe className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Website-URL eingeben (z.B. www.example.com)"
              className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-lg sm:rounded-xl text-sm sm:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={isLoading}
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="hidden sm:inline">Analysieren</span>
          </button>
        </form>
      </div>
    </div>
  );
}
