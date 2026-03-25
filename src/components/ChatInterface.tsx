'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Globe, Loader2, History, RefreshCw, Brain, XCircle, Clock, LayoutDashboard, BookOpen, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult, AnalysisStep, AnalysisHistoryItem } from '@/types';
import { StructuredChatResponse } from '@/lib/ai/chatPolicy';
import { ResultCard } from './ResultCard';
import { Dashboard } from './Dashboard';
import { SetupWizard } from './SetupWizard';
import { ExpertRecommendation } from './ExpertRecommendation';
import { UpgradePrompt } from './UpgradePrompt';
import { getAnalysisHistory, addToHistory, clearHistory } from '@/lib/cache/analysisCache';
import { saveAnalysis } from '@/lib/storage/projectStorage';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  kind?: 'analysis' | 'chat';
  analysisResult?: AnalysisResult;
  isLoading?: boolean;
  analysisSteps?: AnalysisStep[];
  error?: {
    type: string;
    message: string;
    details?: string;
  };
  fromCache?: boolean;
  upgradeRequired?: boolean;
  currentUsage?: number;
  limit?: number;
  resetDate?: string;
  requiresLogin?: boolean;
  chatMode?: 'general' | 'analysis';
  contextUrl?: string;
  response?: StructuredChatResponse;
}

interface ChatInterfaceProps {
  embedded?: boolean;
  autoFocus?: boolean;
}

type AnalyzeApiResponse = AnalysisResult & {
  error?: string;
  details?: string;
  technicalError?: string;
  upgradeRequired?: boolean;
  currentUsage?: number;
  limit?: number;
  resetDate?: string;
};

type ChatHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const CHAT_HISTORY_LIMIT = 8;
const MAX_HISTORY_MESSAGE_LENGTH = 1200;

type ChatApiResponse = {
  success?: boolean;
  answer?: string;
  response?: StructuredChatResponse;
  intent?: string;
  error?: string;
  details?: string;
  upgradeRequired?: boolean;
  requiresLogin?: boolean;
};

function getResponseKindLabel(kind?: StructuredChatResponse['kind']): string {
  switch (kind) {
    case 'offer':
      return 'Angebotsantwort';
    case 'company':
      return 'Firmeninfo';
    case 'analysis':
      return 'Analyse-Antwort';
    case 'guardrail':
      return 'Begrenzte Antwort';
    case 'handoff':
      return 'Weiterleitung';
    default:
      return 'Allgemeine KI-Antwort';
  }
}

function normalizeComparableUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    let candidate = value.trim();
    if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
      candidate = `https://${candidate}`;
    }

    const url = new URL(candidate);
    return `${url.hostname.toLowerCase()}${url.pathname}`.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function isLikelyUrlInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;

  try {
    const candidate = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(candidate);
    return Boolean(url.hostname && url.hostname.includes('.'));
  } catch {
    return false;
  }
}

function getChatHistoryFromMessages(messages: Message[]): ChatHistoryMessage[] {
  return messages
    .filter((message) =>
      message.kind === 'chat' &&
      !message.isLoading &&
      !message.error &&
      (message.role === 'user' || message.role === 'assistant')
    )
    .slice(-CHAT_HISTORY_LIMIT)
    .map((message) => ({
      role: message.role as ChatHistoryMessage['role'],
      content: message.content.trim().slice(0, MAX_HISTORY_MESSAGE_LENGTH),
    }));
}

export function ChatInterface({ embedded = false, autoFocus = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Willkommen beim Tracking Checker. Gib eine Website-URL ein oder stelle direkt eine Frage zu Tracking, Consent Mode, DSGVO, CMPs oder GTM.',
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
  const [activeContext, setActiveContext] = useState<AnalysisResult | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasConversation = messages.some((message) => message.role !== 'system');
  const hasAnalysisResult = messages.some((message) => Boolean(message.analysisResult));
  const hasOnlyWelcomeMessage =
    embedded &&
    !hasConversation &&
    messages.length === 1 &&
    messages[0]?.role === 'system';
  const inputLooksLikeUrl = isLikelyUrlInput(input);
  const activeContextLabel = activeContext
    ? `Antworten beziehen sich aktuell auf ${activeContext.url}`
    : 'Allgemeiner KI-Assistent ohne Website-Kontext';
  const examplePrompts = activeContext
    ? [
        'Was sind hier die 3 groessten Risiken?',
        'Welche 3 Schritte sollte ich zuerst umsetzen?',
        'Wie wuerdest du Consent Mode V2 hier konkret verbessern?',
        activeContext.url,
      ]
    : [
        'https://example.com',
        'Erklaere mir strukturiert, was Google Consent Mode V2 ist.',
        'Wann brauche ich TCF 2.2 und woran erkenne ich das?',
      ];

  // History laden
  useEffect(() => {
    setHistory(getAnalysisHistory());
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.addEventListener('tracking-chat-focus', handleFocus);
    return () => window.removeEventListener('tracking-chat-focus', handleFocus);
  }, []);

  // KEIN automatisches Scrollen - der User scrollt selbst wenn gewünscht

  const isValidUrl = (string: string) => {
    return isLikelyUrlInput(string);
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

    steps.forEach(({ message, delay }) => {
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

  const handleAnalyze = async (urlToAnalyze: string, skipCache?: boolean) => {
    const requestedUrl = normalizeComparableUrl(urlToAnalyze);
    const currentUrl = normalizeComparableUrl(currentAnalysis?.url);
    const effectiveSkipCache = skipCache === true || (!!requestedUrl && requestedUrl === currentUrl);
    
    if (!urlToAnalyze.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: urlToAnalyze,
      timestamp: new Date(),
      kind: 'analysis',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

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
        content: effectiveSkipCache ? '🔄 Frischer Scan wird vorbereitet...' : '🔧 Analyse wird vorbereitet...',
        timestamp: new Date(),
        isLoading: true,
        kind: 'analysis',
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
          options: { skipCache: effectiveSkipCache },
        }),
      });

      // Sicher JSON parsen - prüfe Content-Type und handle Fehler
      let data: AnalyzeApiResponse;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json() as AnalyzeApiResponse;
        } catch {
          // Wenn JSON-Parsing fehlschlägt, versuche Text zu lesen
          const errorText = await response.text();
          throw {
            type: 'JSON-Parsing-Fehler',
            message: 'Die Server-Antwort konnte nicht als JSON gelesen werden.',
            technical: errorText.substring(0, 200),
          };
        }
      } else {
        // Wenn kein JSON-Content-Type, lese als Text
        const errorText = await response.text();
        throw {
          type: response.ok ? 'Unerwartetes Format' : 'Server-Fehler',
          message: response.ok 
            ? 'Die Server-Antwort hat ein unerwartetes Format.'
            : `Server-Fehler (${response.status}): ${errorText.substring(0, 100)}`,
          technical: errorText.substring(0, 200),
        };
      }

      if (!response.ok) {
        // Check if it's a limit error (429)
        if (response.status === 429 && data.upgradeRequired) {
          throw {
            type: data.error || 'Limit erreicht',
            message: data.details || 'Analyse-Limit erreicht',
            technical: data.technicalError,
            upgradeRequired: true,
            currentUsage: data.currentUsage,
            limit: data.limit,
            resetDate: data.resetDate,
          };
        }
        
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
        setActiveContext(data as AnalysisResult);
        
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
                  : data.cacheInfo?.bypassReason
                  ? `✅ Frische Analyse für ${data.url} abgeschlossen (Cache ignoriert)!`
                  : data.cacheInfo?.requestedFreshScan
                  ? `✅ Frische Analyse für ${data.url} abgeschlossen!`
                  : `✅ Analyse für ${data.url} abgeschlossen!`,
                isLoading: false,
                kind: 'analysis',
                analysisResult: data as AnalysisResult,
                analysisSteps: data.analysisSteps,
                fromCache: data.fromCache,
              }
            : msg
        )
      );
    } catch (error) {
      const errorInfo = error as { 
        type?: string; 
        message?: string; 
        technical?: string;
        upgradeRequired?: boolean;
        currentUsage?: number;
        limit?: number;
        resetDate?: string;
      };
      
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
                upgradeRequired: errorInfo.upgradeRequired,
                currentUsage: errorInfo.currentUsage,
                limit: errorInfo.limit,
                resetDate: errorInfo.resetDate,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const contextSnapshot = activeContext;
    const contextUrl = contextSnapshot?.url;
    const mode = contextSnapshot ? 'analysis' : 'general';
    const conversationHistory = getChatHistoryFromMessages(messages);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
      kind: 'chat',
      chatMode: mode,
      contextUrl,
    };

    const loadingId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: loadingId,
        role: 'assistant',
        content: mode === 'analysis'
          ? `Ich bereite eine Antwort zur Analyse von ${contextUrl} vor...`
          : 'Ich bereite eine Antwort vor...',
        timestamp: new Date(),
        isLoading: true,
        kind: 'chat',
        chatMode: mode,
        contextUrl,
      },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          mode,
          context: contextSnapshot ?? undefined,
          history: conversationHistory,
        }),
      });

      const data = await response.json() as ChatApiResponse;

      if (!response.ok) {
        throw {
          type: data.error || 'Antwort fehlgeschlagen',
          message: data.details || data.error || 'Die Frage konnte nicht beantwortet werden.',
          upgradeRequired: data.upgradeRequired,
          requiresLogin: data.requiresLogin,
        };
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === loadingId
            ? {
                ...message,
                content: data.response?.markdown || data.answer || 'Keine Antwort erhalten.',
                isLoading: false,
                chatMode: mode,
                contextUrl,
                response: data.response,
              }
            : message
        )
      );
    } catch (error) {
      const errorInfo = error as {
        type?: string;
        message?: string;
        upgradeRequired?: boolean;
        requiresLogin?: boolean;
      };

      setMessages((prev) =>
        prev.map((message) =>
          message.id === loadingId
            ? {
                ...message,
                content: `❌ ${errorInfo.type || 'Fehler beim KI-Chat'}`,
                isLoading: false,
                error: {
                  type: errorInfo.type || 'error',
                  message: errorInfo.requiresLogin
                    ? 'Für den KI-Chat musst du eingeloggt sein.'
                    : errorInfo.message || 'Unbekannter Fehler',
                },
                upgradeRequired: errorInfo.upgradeRequired,
                requiresLogin: errorInfo.requiresLogin,
                chatMode: mode,
                contextUrl,
              }
            : message
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextInput = input.trim();

    if (!nextInput || isLoading) return;

    if (isLikelyUrlInput(nextInput)) {
      await handleAnalyze(nextInput);
      return;
    }

    await handleQuestion(nextInput);
  };

  const handleHistoryClick = (item: AnalysisHistoryItem) => {
    setShowHistory(false);
    void handleAnalyze(item.url);
  };

  const handleRefresh = (url: string) => {
    void handleAnalyze(url, true);
  };

  return (
    <div className={`flex flex-col w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 overflow-x-hidden ${
      hasOnlyWelcomeMessage
        ? ''
        : embedded 
        ? hasAnalysisResult
          ? 'min-h-[420px] sm:min-h-[460px]'
          : 'min-h-[420px] sm:min-h-[460px] h-[56vh] sm:h-[58vh] max-h-[760px]'
        : 'h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)]'
    }`}>
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef} 
        className={`${
          hasOnlyWelcomeMessage
            ? 'py-2 sm:py-3 space-y-2'
            : hasAnalysisResult
              ? 'py-3 sm:py-4 space-y-3 sm:space-y-4 min-h-0 overflow-x-hidden'
              : 'flex-1 overflow-y-auto py-3 sm:py-4 space-y-3 sm:space-y-4 min-h-0 overflow-x-hidden' // Scrollbarer Container
        }`}
      >
        {messages.map((message) => {
          return (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`${
                message.analysisResult
                  ? 'w-full' // Volle Breite für Bericht
                  : 'w-full sm:max-w-[90%] lg:max-w-[85%]'
              } rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 overflow-x-hidden ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white ml-auto max-w-[85%] sm:max-w-[70%]'
                  : message.role === 'system'
                  ? 'bg-slate-800/50 text-slate-200 border border-slate-700'
                  : message.analysisResult
                  ? 'bg-transparent' // Transparent für Bericht
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
                <div className="space-y-3">
                  {message.upgradeRequired ? (
                    <UpgradePrompt
                      type={message.kind === 'chat' ? 'feature-unavailable' : 'limit-reached'}
                      message={message.error.message}
                      currentUsage={message.currentUsage}
                      limit={message.limit}
                      plan="free"
                      showDismiss={true}
                    />
                  ) : (
                    <>
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
                      {message.kind !== 'chat' && (
                        <button
                          onClick={() => {
                            const previousAnalysisInput = [...messages]
                              .reverse()
                              .find((item) => item.role === 'user' && item.kind === 'analysis')?.content;

                            if (previousAnalysisInput) {
                              void handleAnalyze(previousAnalysisInput);
                            }
                          }}
                          className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Erneut versuchen
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {message.kind === 'chat' && message.role === 'assistant' && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="px-2 py-0.5 rounded-full bg-slate-700/70 text-slate-300">
                          {getResponseKindLabel(message.response?.kind ?? (message.chatMode === 'analysis' ? 'analysis' : 'general'))}
                        </span>
                        {message.contextUrl && (
                          <span className="truncate max-w-full text-slate-500">
                            Bezug: {message.contextUrl}
                          </span>
                        )}
                        {message.response?.chips?.map((chip) => (
                          <span
                            key={`${message.id}-${chip}`}
                            className="px-2 py-0.5 rounded-full bg-slate-900/70 text-slate-400"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      {message.kind === 'chat' && message.role === 'assistant' ? (
                        <div className="w-full space-y-3">
                          {message.response?.title && (
                            <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2">
                              <p className="text-sm font-semibold text-white">
                                {message.response.title}
                              </p>
                            </div>
                          )}
                          {message.response?.cards && message.response.cards.length > 0 && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {message.response.cards.map((card) => (
                                <div
                                  key={`${message.id}-${card.title}`}
                                  className="rounded-xl border border-slate-700 bg-slate-900/50 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-white">{card.title}</p>
                                      {card.badge && (
                                        <p className="mt-1 text-xs text-indigo-300">{card.badge}</p>
                                      )}
                                    </div>
                                    {card.priceLabel && (
                                      <span className="shrink-0 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300">
                                        {card.priceLabel}
                                      </span>
                                    )}
                                  </div>
                                  {card.description && (
                                    <p className="mt-2 text-sm text-slate-300">{card.description}</p>
                                  )}
                                  {card.setupTimeLabel && (
                                    <p className="mt-2 text-xs text-slate-400">
                                      Aufwand: {card.setupTimeLabel}
                                    </p>
                                  )}
                                  {card.bullets && card.bullets.length > 0 && (
                                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
                                      {card.bullets.map((bullet) => (
                                        <li key={`${card.title}-${bullet}`}>{bullet}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="prose prose-invert prose-sm max-w-none text-sm text-slate-200">
                          <ReactMarkdown
                            components={{
                              h3: ({ children }) => (
                                <h3 className="mb-2 mt-4 text-sm font-semibold text-white first:mt-0">
                                  {children}
                                </h3>
                              ),
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0 text-sm leading-relaxed text-slate-200">
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-sm leading-relaxed text-slate-200">{children}</li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-white">{children}</strong>
                              ),
                              code: ({ children }) => (
                                <code className="rounded bg-slate-900/70 px-1.5 py-0.5 text-xs text-purple-300">
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                          </div>
                          {(message.response?.ctaHref || message.response?.suggestedPrompts?.length) && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {message.response?.ctaHref && message.response?.ctaLabel && (
                                <a
                                  href={message.response.ctaHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                                >
                                  {message.response.ctaLabel}
                                </a>
                              )}
                              {message.response?.suggestedPrompts?.map((prompt) => (
                                <button
                                  key={`${message.id}-${prompt}`}
                                  type="button"
                                  onClick={() => setInput(prompt)}
                                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 hover:border-indigo-500/60 hover:text-white transition-colors"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                      {message.fromCache && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Cache
                        </span>
                      )}
                    </div>
                  </div>
                  {message.analysisResult && (
                    <div className="mt-3 w-full overflow-x-hidden">
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
          );
        })}
        {!hasConversation && (
          <div className="grid gap-2 pt-2 sm:grid-cols-3">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-left text-sm text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-colors"
              >
                {isLikelyUrlInput(prompt) ? (
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                ) : (
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                )}
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        )}
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
      <div className={`border-t border-slate-800 bg-slate-900/50 backdrop-blur ${
        hasOnlyWelcomeMessage ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'
      } ${
        currentAnalysis ? 'sticky bottom-0 z-10' : 'shrink-0'
      }`}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className={activeContext ? 'text-slate-300' : 'text-slate-400'}>
              {activeContextLabel}
            </span>
          </div>
          {activeContext && (
            <button
              type="button"
              onClick={() => setActiveContext(null)}
              className="self-start text-xs text-slate-400 hover:text-slate-200"
            >
              Kontext zurücksetzen
            </button>
          )}
        </div>
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
            {inputLooksLikeUrl ? (
              <Globe className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            ) : (
              <Brain className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeContext
                  ? `URL eingeben oder Rückfrage zu ${activeContext.url} stellen`
                  : 'Website-URL eingeben oder Frage stellen'
              }
              className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-lg sm:rounded-xl text-sm sm:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={isLoading}
              autoFocus={autoFocus}
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
            <span className="hidden sm:inline">{inputLooksLikeUrl ? 'Prüfen' : 'Senden'}</span>
          </button>
        </form>
      </div>

      {currentAnalysis && (
        <section
          aria-labelledby="chat-offers-heading"
          className="mt-6 sm:mt-8 shrink-0 overflow-x-hidden border-t border-slate-700/90 pt-6 sm:pt-8"
        >
          <div className="rounded-3xl border-2 border-indigo-500/35 bg-gradient-to-br from-slate-900/98 via-slate-950 to-slate-950 p-4 sm:p-6 shadow-[0_28px_64px_-24px_rgba(0,0,0,0.65)] ring-1 ring-indigo-500/25">
            <div className="mb-4 flex items-start gap-3 sm:mb-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
                <Sparkles className="h-5 w-5 text-indigo-300" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <h2
                  id="chat-offers-heading"
                  className="text-base font-semibold tracking-tight text-white"
                >
                  Angebote &amp; Erstberatung
                </h2>
                <p className="text-xs leading-relaxed text-slate-400">
                  Unverbindliche Pakete auf Basis dieser Analyse – getrennt vom Chat-Verlauf darüber.
                </p>
              </div>
            </div>
            <ExpertRecommendation result={currentAnalysis} embeddedInChat />
          </div>
        </section>
      )}
    </div>
  );
}
