'use client';

import { useState, useEffect } from 'react';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { AnalysisResult } from '@/types';
import {
  StoredAnalysis,
  ComparisonChange,
  getAnalysesByUrl,
  compareAnalyses,
} from '@/lib/storage/projectStorage';

interface AnalysisComparisonProps {
  currentResult: AnalysisResult;
}

export function AnalysisComparison({ currentResult }: AnalysisComparisonProps) {
  const [expanded, setExpanded] = useState(false);
  const [previousAnalyses, setPreviousAnalyses] = useState<StoredAnalysis[]>([]);
  const [selectedPreviousId, setSelectedPreviousId] = useState<string | null>(null);
  const [changes, setChanges] = useState<ComparisonChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPreviousAnalyses() {
      try {
        const analyses = await getAnalysesByUrl(currentResult.url);
        // Filtere die aktuelle Analyse heraus (basierend auf Timestamp)
        const previous = analyses.filter(
          a => new Date(a.result.timestamp).getTime() !== new Date(currentResult.timestamp).getTime()
        );
        setPreviousAnalyses(previous);
        
        // Automatisch die letzte Analyse auswählen
        if (previous.length > 0) {
          setSelectedPreviousId(previous[0].id);
          const comparisonChanges = compareAnalyses(previous[0].result, currentResult);
          setChanges(comparisonChanges);
        }
      } catch (error) {
        console.error('Error loading previous analyses:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadPreviousAnalyses();
  }, [currentResult]);

  const handleSelectPrevious = (analysisId: string) => {
    setSelectedPreviousId(analysisId);
    const selected = previousAnalyses.find(a => a.id === analysisId);
    if (selected) {
      const comparisonChanges = compareAnalyses(selected.result, currentResult);
      setChanges(comparisonChanges);
    }
  };

  const selectedPrevious = previousAnalyses.find(a => a.id === selectedPreviousId);

  // Keine vorherigen Analysen - nichts anzeigen
  if (!loading && previousAnalyses.length === 0) {
    return null;
  }

  // Statistiken berechnen
  const improvements = changes.filter(c => c.changeType === 'improved').length;
  const degradations = changes.filter(c => c.changeType === 'degraded').length;
  const unchanged = changes.filter(c => c.changeType === 'unchanged').length;
  const currentOverallScore = currentResult.scoreBreakdown?.overall ?? currentResult.score;

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-slate-200">Vergleich mit vorheriger Analyse</span>
          {!loading && previousAnalyses.length > 0 && (
            <span className="text-xs text-slate-500">
              ({previousAnalyses.length} verfügbar)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!loading && changes.length > 0 && (
            <div className="flex items-center gap-2">
              {improvements > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingUp className="w-3 h-3" />
                  {improvements}
                </span>
              )}
              {degradations > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <TrendingDown className="w-3 h-3" />
                  {degradations}
                </span>
              )}
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-slate-400">Lade vorherige Analysen...</p>
            </div>
          ) : previousAnalyses.length === 0 ? (
            <div className="p-8 text-center">
              <GitCompare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Keine vorherigen Analysen für diese URL gefunden.</p>
              <p className="text-xs text-slate-500 mt-1">
                Die nächste Analyse wird automatisch für den Vergleich gespeichert.
              </p>
            </div>
          ) : (
            <>
              {/* Analyse-Auswahl */}
              <div className="p-3 border-b border-slate-700 bg-slate-800/50">
                <label className="block text-xs text-slate-400 mb-2">Vergleichen mit:</label>
                <select
                  value={selectedPreviousId || ''}
                  onChange={(e) => handleSelectPrevious(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200"
                >
                  {previousAnalyses.map((analysis) => (
                    <option key={analysis.id} value={analysis.id}>
                      {new Date(analysis.createdAt).toLocaleString('de-DE')} - Score: {analysis.result.scoreBreakdown?.overall ?? analysis.result.score}
                    </option>
                  ))}
                </select>
              </div>

              {/* Score Vergleich */}
              {selectedPrevious && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Vorher</p>
                      <p className={`text-2xl font-bold ${
                        (selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score) >= 80 ? 'text-green-400' :
                        (selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score) >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(selectedPrevious.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>

                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-slate-500" />
                    </div>

                    <div className="text-center p-3 bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Jetzt</p>
                      <p className={`text-2xl font-bold ${
                        currentOverallScore >= 80 ? 'text-green-400' :
                        currentOverallScore >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {currentOverallScore}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Gerade
                      </p>
                    </div>
                  </div>

                  {/* Score-Differenz */}
                  <div className={`text-center p-3 rounded-lg mb-4 ${
                    currentOverallScore > (selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score)
                      ? 'bg-green-500/10 border border-green-500/30'
                      : currentOverallScore < (selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score)
                      ? 'bg-red-500/10 border border-red-500/30'
                      : 'bg-slate-700/50 border border-slate-600'
                  }`}>
                    <div className="flex items-center justify-center gap-2">
                      {currentOverallScore > (selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score) ? (
                        <>
                          <TrendingUp className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-bold">
                            +{currentOverallScore - (selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score)} Punkte
                          </span>
                        </>
                      ) : currentOverallScore < (selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score) ? (
                        <>
                          <TrendingDown className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-bold">
                            {currentOverallScore - (selectedPrevious.result.scoreBreakdown?.overall ?? selectedPrevious.result.score)} Punkte
                          </span>
                        </>
                      ) : (
                        <>
                          <Minus className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-400 font-bold">Unverändert</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Änderungen Liste */}
                  {changes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Änderungen im Detail:</h4>
                      {changes.map((change, index) => (
                        <ChangeItem key={index} change={change} />
                      ))}
                    </div>
                  )}

                  {/* Zusammenfassung */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <p className="text-lg font-bold text-green-400">{improvements}</p>
                      <p className="text-xs text-slate-400">Verbessert</p>
                    </div>
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <p className="text-lg font-bold text-red-400">{degradations}</p>
                      <p className="text-xs text-slate-400">Verschlechtert</p>
                    </div>
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                      <p className="text-lg font-bold text-slate-400">{unchanged}</p>
                      <p className="text-xs text-slate-400">Unverändert</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChangeItem({ change }: { change: ComparisonChange }) {
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      overall: 'Gesamt',
      cookieBanner: 'Cookie-Banner',
      googleConsentMode: 'Consent Mode',
      tcf: 'TCF',
      trackingTags: 'Tracking Tags',
      cookies: 'Cookies',
      issues: 'Probleme',
      gdpr: 'DSGVO',
      cookieConsentTest: 'Consent-Test',
    };
    return labels[category] || category;
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      score: 'Score',
      detected: 'Erkannt',
      version: 'Version',
      hasRejectButton: 'Ablehnen-Button',
      count: 'Anzahl',
      errorCount: 'Fehler',
      trackingBeforeConsent: 'Tracking vor Consent',
    };
    return labels[field] || field;
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (value === null || value === undefined) return '-';
    return String(value);
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${
      change.impact === 'positive'
        ? 'bg-green-500/10'
        : change.impact === 'negative'
        ? 'bg-red-500/10'
        : 'bg-slate-700/30'
    }`}>
      {change.changeType === 'improved' ? (
        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
      ) : change.changeType === 'degraded' ? (
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      ) : (
        <Minus className="w-4 h-4 text-slate-400 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200">
          <span className="text-slate-400">{getCategoryLabel(change.category)}</span>
          {' → '}
          {getFieldLabel(change.field)}
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 line-through">
          {formatValue(change.previousValue)}
        </span>
        <ArrowRight className="w-3 h-3 text-slate-500" />
        <span className={
          change.impact === 'positive' ? 'text-green-400 font-medium' :
          change.impact === 'negative' ? 'text-red-400 font-medium' :
          'text-slate-300'
        }>
          {formatValue(change.currentValue)}
        </span>
      </div>
    </div>
  );
}
