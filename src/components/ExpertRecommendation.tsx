'use client';

import { useState } from 'react';
import { 
  Wrench, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Phone,
  ExternalLink,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AnalysisResult, Issue } from '@/types';

interface ExpertRecommendationProps {
  result: AnalysisResult;
}

export function ExpertRecommendation({ result }: ExpertRecommendationProps) {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const score = result.score;
  const criticalIssues = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  
  // Determine recommendation level
  const isCritical = score < 50 || criticalIssues.length >= 3;
  const needsOptimization = score < 80 || criticalIssues.length > 0 || warnings.length >= 3;
  const isGood = score >= 80 && criticalIssues.length === 0;

  // Generate specific fix recommendations based on issues
  const getFixRecommendations = () => {
    const fixes: { title: string; description: string }[] = [];

    // Consent Mode Issues
    if (!result.googleConsentMode.detected || result.googleConsentMode.version !== 'v2') {
      fixes.push({
        title: "Google Consent Mode v2 einrichten",
        description: "Pflicht seit März 2024 für Google Ads & Analytics"
      });
    }

    // Cookie Banner Issues
    if (!result.cookieBanner.detected || !result.cookieBanner.hasRejectButton) {
      fixes.push({
        title: "Cookie-Banner optimieren",
        description: "DSGVO-konformer Banner mit klarer Ablehnen-Option"
      });
    }

    // Server-Side Tracking
    if (!result.trackingTags.serverSideTracking?.detected) {
      fixes.push({
        title: "Server-Side Tracking implementieren",
        description: "Für bessere Datenqualität und ITP-Umgehung"
      });
    }

    // Tracking before consent
    if (result.cookieConsentTest?.analysis?.trackingBeforeConsent) {
      fixes.push({
        title: "Tracking vor Consent beheben",
        description: "Kritischer DSGVO-Verstoß der behoben werden muss"
      });
    }

    // Meta CAPI
    if (result.trackingTags.metaPixel.detected && !result.trackingTags.serverSideTracking?.summary?.hasMetaCAPI) {
      fixes.push({
        title: "Meta Conversions API aufsetzen",
        description: "Für bessere Match-Rate und Event-Qualität"
      });
    }

    // E-Commerce value tracking
    if (result.dataLayerAnalysis?.ecommerce?.detected && 
        !result.dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue) {
      fixes.push({
        title: "E-Commerce Wertübergabe korrigieren",
        description: "Für ROAS-Optimierung in Ads-Plattformen"
      });
    }

    return fixes.slice(0, 4); // Max 4 fixes shown
  };

  const fixes = getFixRecommendations();

  // Determine styling based on urgency
  const getStyle = () => {
    if (isCritical) {
      return {
        border: 'border-red-500/40',
        bg: 'bg-gradient-to-r from-red-500/10 to-orange-500/10',
        badge: 'bg-red-500/20 text-red-400 border-red-500/30',
        badgeText: 'Dringend empfohlen',
        icon: <XCircle className="w-5 h-5 text-red-400" />,
        title: 'Kritische Probleme erkannt',
        titleColor: 'text-red-400',
      };
    }
    if (needsOptimization) {
      return {
        border: 'border-yellow-500/40',
        bg: 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10',
        badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        badgeText: 'Optimierung empfohlen',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
        title: 'Verbesserungspotenzial gefunden',
        titleColor: 'text-yellow-400',
      };
    }
    return {
      border: 'border-green-500/40',
      bg: 'bg-gradient-to-r from-green-500/10 to-cyan-500/10',
      badge: 'bg-green-500/20 text-green-400 border-green-500/30',
      badgeText: 'Gutes Setup',
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      title: 'Profi-Optimierung verfügbar',
      titleColor: 'text-green-400',
    };
  };

  const style = getStyle();

  return (
    <div className={`mt-4 ${style.bg} ${style.border} border rounded-xl overflow-hidden transition-all duration-300`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Wrench className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold ${style.titleColor}`}>{style.title}</span>
              <span className={`px-2 py-0.5 ${style.badge} border text-xs rounded-full`}>
                {style.badgeText}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Franco Consulting kann diese Probleme für dich lösen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
              <span className={`text-lg font-bold ${
                score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>{score}</span>
              <span className="text-xs text-slate-500">Score</span>
            </div>
            {criticalIssues.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-lg">
                <span className="text-lg font-bold text-red-400">{criticalIssues.length}</span>
                <span className="text-xs text-red-400/70">Kritisch</span>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg">
                <span className="text-lg font-bold text-yellow-400">{warnings.length}</span>
                <span className="text-xs text-yellow-400/70">Warnungen</span>
              </div>
            )}
          </div>

          {/* What we can fix */}
          {fixes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Das können wir für dich lösen:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fixes.map((fix, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-slate-800/30 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-200">{fix.title}</p>
                      <p className="text-xs text-slate-500">{fix.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href="https://www.franco-consulting.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all group"
            >
              <Sparkles className="w-4 h-4" />
              Kostenlose Beratung
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="tel:082224183998"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-medium hover:bg-slate-700 hover:border-slate-600 transition-all"
            >
              <Phone className="w-4 h-4" />
              08222 4183998
            </a>
          </div>

          {/* Trust Note */}
          <p className="text-xs text-slate-500 text-center">
            ✓ Unverbindlich • ✓ Kostenlose Erstberatung • ✓ DACH-Region
          </p>
        </div>
      )}
    </div>
  );
}
