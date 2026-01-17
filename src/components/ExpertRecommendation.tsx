'use client';

import { useState } from 'react';
import { 
  Wrench, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Phone,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AnalysisResult } from '@/types';

interface ExpertRecommendationProps {
  result: AnalysisResult;
}

export function ExpertRecommendation({ result }: ExpertRecommendationProps) {
  const [expanded, setExpanded] = useState(false);
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
    <div className={`mt-3 ${style.bg} ${style.border} border rounded-lg overflow-hidden transition-all duration-300`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg">
            <Wrench className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm ${style.titleColor}`}>{style.title}</span>
              <span className={`px-1.5 py-0.5 ${style.badge} border text-[10px] rounded-full`}>
                {style.badgeText}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Franco Consulting kann helfen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* What we can fix - Compact */}
          {fixes.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {fixes.slice(0, 4).map((fix, index) => (
                <div key={index} className="flex items-center gap-1.5 p-1.5 bg-slate-800/30 rounded text-xs">
                  <CheckCircle2 className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <span className="text-slate-300 truncate">{fix.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA Buttons - Compact */}
          <div className="flex gap-2">
            <a
              href="https://www.franco-consulting.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium text-xs hover:shadow-lg hover:shadow-indigo-500/25 transition-all group"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Beratung anfragen
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="tel:082224183998"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs hover:bg-slate-700 transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              Anrufen
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
