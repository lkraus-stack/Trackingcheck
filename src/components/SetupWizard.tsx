'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Code,
  Settings,
  ShoppingCart,
  Shield,
  Zap,
  ExternalLink,
  FileJson,
  Search,
} from 'lucide-react';
import { AnalysisResult } from '@/types';
import {
  SetupGuide,
  allGuides,
  getGuideById,
} from '@/lib/templates/setupGuides';
import {
  generateGTMContainer,
  exportGTMContainerAsJSON,
} from '@/lib/templates/gtmTemplates';
import {
  standardEvents,
  generateExampleCode,
  generateConsentUpdateCode,
} from '@/lib/templates/dataLayerGenerator';

interface SetupWizardProps {
  onClose: () => void;
  analysis?: AnalysisResult | null;
}

type WizardView = 'home' | 'guide' | 'gtm-generator' | 'datalayer-generator';

export function SetupWizard({ onClose, analysis }: SetupWizardProps) {
  const [view, setView] = useState<WizardView>('home');
  const [selectedGuide, setSelectedGuide] = useState<SetupGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // GTM Generator States
  const [includeGA4, setIncludeGA4] = useState(true);
  const [includeMeta, setIncludeMeta] = useState(false);
  const [includeAds, setIncludeAds] = useState(false);
  
  // DataLayer Generator States
  const [selectedEvent, setSelectedEvent] = useState('purchase');
  const [generatedCode, setGeneratedCode] = useState('');

  // Initialize states based on analysis
  useEffect(() => {
    if (analysis) {
      setIncludeMeta(analysis.trackingTags.metaPixel.detected || false);
      setIncludeAds(analysis.trackingTags.googleAdsConversion?.detected || false);
    }
  }, [analysis]);

  // Update generated code when event changes
  useEffect(() => {
    setGeneratedCode(generateExampleCode(selectedEvent));
  }, [selectedEvent]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredGuides = useMemo(() => {
    return allGuides.filter(guide => {
      const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const eventCategories = useMemo(() => ({
    ecommerce: standardEvents.filter(e => e.category === 'ecommerce'),
    engagement: standardEvents.filter(e => e.category === 'engagement'),
    conversion: standardEvents.filter(e => e.category === 'conversion'),
  }), []);

  const downloadContainer = () => {
    if (!analysis) return;
    
    const container = generateGTMContainer(analysis, {
      includeGA4,
      includeMeta,
      includeConversionTags: includeAds,
    });
    
    const json = exportGTMContainerAsJSON(container);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gtm-container-consent-mode-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderHome = () => (
    <div className="space-y-6">
      {/* Quick Actions basierend auf Analyse */}
      {analysis && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/30">
          <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Empfohlen basierend auf deiner Analyse
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {!analysis.googleConsentMode.detected && (
              <button
                onClick={() => setView('gtm-generator')}
                className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-left transition-colors"
              >
                <Shield className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Consent Mode einrichten</p>
                  <p className="text-xs text-slate-500">Fehlt in deiner Analyse</p>
                </div>
              </button>
            )}
            {analysis.cookieBanner.provider && (
              <button
                onClick={() => {
                  const guideId = analysis.cookieBanner.provider?.toLowerCase().includes('cookiebot') 
                    ? 'cookiebot-setup' 
                    : analysis.cookieBanner.provider?.toLowerCase().includes('usercentrics')
                    ? 'usercentrics-setup'
                    : null;
                  if (guideId) {
                    const guide = getGuideById(guideId);
                    if (guide) {
                      setSelectedGuide(guide);
                      setView('guide');
                    }
                  }
                }}
                className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-left transition-colors"
              >
                <BookOpen className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{analysis.cookieBanner.provider} Guide</p>
                  <p className="text-xs text-slate-500">Setup-Anleitung</p>
                </div>
              </button>
            )}
            {analysis.dataLayerAnalysis?.ecommerce?.detected && (
              <button
                onClick={() => setView('datalayer-generator')}
                className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-left transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">E-Commerce optimieren</p>
                  <p className="text-xs text-slate-500">DataLayer Events</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Suche und Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Guides durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
        >
          <option value="all">Alle Kategorien</option>
          <option value="cmp">Cookie-Banner / CMP</option>
          <option value="ecommerce">E-Commerce</option>
          <option value="platform">Plattformen</option>
        </select>
      </div>

      {/* Tools */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setView('gtm-generator')}
          className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-700 transition-colors text-left"
        >
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FileJson className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-slate-200">GTM Container Generator</p>
            <p className="text-xs text-slate-500">Exportierbaren Container erstellen</p>
          </div>
        </button>
        <button
          onClick={() => setView('datalayer-generator')}
          className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-700 transition-colors text-left"
        >
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Code className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="font-medium text-slate-200">DataLayer Generator</p>
            <p className="text-xs text-slate-500">E-Commerce & Custom Events</p>
          </div>
        </button>
      </div>

      {/* Guides Liste */}
      <div>
        <h3 className="font-medium text-slate-200 mb-3">Setup-Anleitungen</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredGuides.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Keine Guides gefunden</p>
          ) : (
            filteredGuides.map((guide) => (
              <button
                key={guide.id}
                onClick={() => {
                  setSelectedGuide(guide);
                  setCurrentStep(0);
                  setView('guide');
                }}
                className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors text-left"
              >
                <div className={`p-2 rounded-lg ${
                  guide.category === 'cmp' ? 'bg-purple-500/20' :
                  guide.category === 'ecommerce' ? 'bg-green-500/20' :
                  'bg-blue-500/20'
                }`}>
                  {guide.category === 'cmp' ? <Shield className="w-5 h-5 text-purple-400" /> :
                   guide.category === 'ecommerce' ? <ShoppingCart className="w-5 h-5 text-green-400" /> :
                   <Settings className="w-5 h-5 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{guide.title}</p>
                  <p className="text-xs text-slate-500 truncate">{guide.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    guide.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                    guide.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {guide.difficulty === 'easy' ? 'Einfach' :
                     guide.difficulty === 'medium' ? 'Mittel' : 'Fortgeschritten'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderGuide = () => {
    if (!selectedGuide) return null;
    
    const currentStepData = selectedGuide.steps[currentStep];
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('home')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h3 className="font-medium text-slate-200">{selectedGuide.title}</h3>
            <p className="text-xs text-slate-500">
              Schritt {currentStep + 1} von {selectedGuide.steps.length} • {selectedGuide.estimatedTime}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1">
          {selectedGuide.steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-indigo-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Current Step */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              {currentStepData.number}
            </div>
            <div>
              <h4 className="font-medium text-slate-200">{currentStepData.title}</h4>
              <p className="text-sm text-slate-400 mt-1">{currentStepData.description}</p>
            </div>
          </div>

          {currentStepData.substeps && (
            <ul className="space-y-2 ml-11">
              {currentStepData.substeps.map((substep, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  {substep}
                </li>
              ))}
            </ul>
          )}

          {currentStepData.tip && (
            <div className="mt-4 ml-11 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">{currentStepData.tip}</p>
            </div>
          )}

          {currentStepData.warning && (
            <div className="mt-4 ml-11 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-400">{currentStepData.warning}</p>
            </div>
          )}
        </div>

        {/* Code Snippets for this step */}
        {selectedGuide.codeSnippets.length > 0 && currentStep === selectedGuide.steps.length - 2 && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-200">Code-Snippets</h4>
            {selectedGuide.codeSnippets.map((snippet) => (
              <div key={snippet.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 border-b border-slate-600">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{snippet.title}</p>
                    {snippet.placement && (
                      <p className="text-xs text-slate-500">{snippet.placement}</p>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(snippet.code, snippet.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs text-slate-200 transition-colors"
                  >
                    {copiedId === snippet.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        Kopiert
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Kopieren
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs text-slate-300 overflow-x-auto max-h-64">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Zurück
          </button>
          <button
            onClick={() => {
              if (currentStep < selectedGuide.steps.length - 1) {
                setCurrentStep(currentStep + 1);
              } else {
                setView('home');
              }
            }}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            {currentStep < selectedGuide.steps.length - 1 ? 'Weiter' : 'Fertig'}
          </button>
        </div>
      </div>
    );
  };

  const renderGTMGenerator = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('home')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h3 className="font-medium text-slate-200">GTM Container Generator</h3>
            <p className="text-xs text-slate-500">Erstelle einen importierbaren GTM Container</p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
          <div>
            <h4 className="font-medium text-slate-200 mb-3">Enthaltene Komponenten:</h4>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg cursor-not-allowed opacity-75">
                <input type="checkbox" checked disabled className="w-4 h-4" />
                <span className="text-sm text-slate-200">Consent Mode v2 (Default + Update)</span>
                <span className="text-xs text-slate-500 ml-auto">Immer enthalten</span>
              </label>
              
              <label className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                <input
                  type="checkbox"
                  checked={includeGA4}
                  onChange={(e) => setIncludeGA4(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-200">GA4 Configuration Tag</span>
                {analysis?.trackingTags.googleAnalytics.measurementId && (
                  <span className="text-xs text-slate-500 ml-auto">
                    {analysis.trackingTags.googleAnalytics.measurementId}
                  </span>
                )}
              </label>
              
              <label className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                <input
                  type="checkbox"
                  checked={includeMeta}
                  onChange={(e) => setIncludeMeta(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-200">Meta Pixel Tag</span>
                {analysis?.trackingTags.metaPixel.pixelId && (
                  <span className="text-xs text-slate-500 ml-auto">
                    {analysis.trackingTags.metaPixel.pixelId}
                  </span>
                )}
              </label>
              
              <label className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                <input
                  type="checkbox"
                  checked={includeAds}
                  onChange={(e) => setIncludeAds(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-200">Google Ads Conversion Linker</span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              <strong>Hinweis:</strong> Nach dem Import musst du die IDs (GA4 Measurement ID, Pixel IDs) 
              durch deine eigenen ersetzen und die Consent-Trigger an dein CMP anpassen.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={downloadContainer}
            disabled={!analysis}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Container herunterladen
          </button>
        </div>

        <div className="text-center">
          <a
            href="https://tagmanager.google.com/#/admin/accounts/YOUR_ACCOUNT/containers/YOUR_CONTAINER/workspaces/YOUR_WORKSPACE/versions/import"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
          >
            Wie importiere ich in GTM?
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  };

  const renderDataLayerGenerator = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('home')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h3 className="font-medium text-slate-200">DataLayer Generator</h3>
            <p className="text-xs text-slate-500">Generiere DataLayer Code für GA4 Events</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Event Auswahl */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h4 className="font-medium text-slate-200 mb-3">Event auswählen</h4>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">E-Commerce</p>
                {eventCategories.ecommerce.map((event) => (
                  <button
                    key={event.event}
                    onClick={() => setSelectedEvent(event.event)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedEvent === event.event
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    {event.event}
                  </button>
                ))}
              </div>
              
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Engagement</p>
                {eventCategories.engagement.map((event) => (
                  <button
                    key={event.event}
                    onClick={() => setSelectedEvent(event.event)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedEvent === event.event
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    {event.event}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Conversion</p>
                {eventCategories.conversion.map((event) => (
                  <button
                    key={event.event}
                    onClick={() => setSelectedEvent(event.event)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedEvent === event.event
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    {event.event}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Code Output */}
          <div className="col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 border-b border-slate-600">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {standardEvents.find(e => e.event === selectedEvent)?.event || selectedEvent}
                </p>
                <p className="text-xs text-slate-500">
                  {standardEvents.find(e => e.event === selectedEvent)?.description}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCode, 'datalayer')}
                className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white transition-colors"
              >
                {copiedId === 'datalayer' ? (
                  <>
                    <Check className="w-3 h-3" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Kopieren
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 p-4 text-xs text-slate-300 overflow-auto">
              <code>{generatedCode}</code>
            </pre>
          </div>
        </div>

        {/* Consent Update Code */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 border-b border-slate-600">
            <div>
              <p className="text-sm font-medium text-slate-200">Consent Update Code</p>
              <p className="text-xs text-slate-500">Zum Aufrufen nach CMP-Interaktion</p>
            </div>
            <button
              onClick={() => copyToClipboard(generateConsentUpdateCode(true, true), 'consent')}
              className="flex items-center gap-1 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs text-slate-200 transition-colors"
            >
              {copiedId === 'consent' ? (
                <>
                  <Check className="w-3 h-3" />
                  Kopiert
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Kopieren
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs text-slate-300 overflow-auto max-h-40">
            <code>{generateConsentUpdateCode(true, true)}</code>
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <div>
              <h2 className="text-xl font-bold text-slate-200">Setup-Wizard</h2>
              <p className="text-xs text-slate-500">Anleitungen & Code-Generatoren</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {view === 'home' && renderHome()}
          {view === 'guide' && renderGuide()}
          {view === 'gtm-generator' && renderGTMGenerator()}
          {view === 'datalayer-generator' && renderDataLayerGenerator()}
        </div>
      </div>
    </div>
  );
}
