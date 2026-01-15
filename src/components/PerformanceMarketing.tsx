'use client';

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Cookie,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Target,
  Zap,
  Server,
  Globe,
  DollarSign,
  PieChart,
  ArrowRight,
  Info,
  Link2,
  Tag,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  EventQualityScoreResult,
  FunnelValidationResult,
  CookieLifetimeAuditResult,
  UnusedPotentialResult,
  ROASQualityResult,
  ConversionTrackingAuditResult,
  CampaignAttributionResult,
  GTMAuditResult,
  PrivacySandboxResult,
  PrivacySandboxSignal,
  EcommerceDeepDiveResult,
} from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Event Quality Score Card
// ═══════════════════════════════════════════════════════════════════════════

interface EventQualityCardProps {
  data: EventQualityScoreResult;
}

export function EventQualityCard({ data }: EventQualityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  const platformIcons: Record<string, string> = {
    meta: '📘',
    google: '🔴',
    tiktok: '🎵',
    linkedin: '🔗',
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getScoreBg(data.overallScore)}`}>
            <Target className={`w-5 h-5 ${getScoreColor(data.overallScore)}`} />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">Event Quality Score</h3>
            <p className="text-xs text-slate-500">Matching-Qualität für Ads-Plattformen</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${getScoreColor(data.overallScore)}`}>
            {data.overallScore}%
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Platform Scores */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data.platforms).map(([key, platform]) => {
              if (!platform) return null;
              return (
                <div key={key} className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-200">
                      {platformIcons[key]} {platform.platform}
                    </span>
                    <span className={`text-lg font-bold ${getScoreColor(platform.score)}`}>
                      {platform.score}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 bg-slate-600 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full transition-all ${
                        platform.score >= 80 ? 'bg-green-500' :
                        platform.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${platform.score}%` }}
                    />
                  </div>

                  {/* Key Metrics */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className={platform.hasServerSide ? 'text-green-400' : 'text-slate-500'}>
                      {platform.hasServerSide ? '✓' : '○'} Server-Side
                    </span>
                    <span className={platform.hasDedupe ? 'text-green-400' : 'text-slate-500'}>
                      {platform.hasDedupe ? '✓' : '○'} Dedupe
                    </span>
                  </div>

                  {/* Parameters */}
                  <div className="mt-2 space-y-1">
                    {platform.parameters.slice(0, 4).map(param => (
                      <div key={param.name} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{param.displayName}</span>
                        <span className={
                          param.status === 'present' || param.status === 'hashed' 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }>
                          {param.status === 'hashed' ? '🔒' : param.status === 'present' ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Estimated Match Rate */}
                  <div className="mt-2 pt-2 border-t border-slate-600">
                    <span className="text-xs text-slate-400">
                      Geschätzte Match-Rate: 
                      <span className={`ml-1 font-medium ${getScoreColor(platform.estimatedMatchRate)}`}>
                        ~{platform.estimatedMatchRate}%
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Empfehlungen</h4>
              {data.recommendations.map((rec, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-lg border ${
                    rec.priority === 'high' 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      rec.priority === 'high' ? 'text-red-400' : 'text-yellow-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{rec.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{rec.description}</p>
                      <p className="text-xs text-green-400 mt-1">
                        Impact: {rec.estimatedImpact}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Funnel Validation Card
// ═══════════════════════════════════════════════════════════════════════════

interface FunnelValidationCardProps {
  data: FunnelValidationResult;
}

export function FunnelValidationCard({ data }: FunnelValidationCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!data.isEcommerce) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-700/50">
            <ShoppingCart className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h3 className="font-medium text-slate-400">Funnel-Tracking</h3>
            <p className="text-xs text-slate-500">Kein E-Commerce erkannt</p>
          </div>
        </div>
      </div>
    );
  }

  const detectedSteps = data.funnelSteps.filter(s => s.detected).length;
  const totalSteps = data.funnelSteps.length;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            data.criticalGaps.length === 0 ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            <ShoppingCart className={`w-5 h-5 ${
              data.criticalGaps.length === 0 ? 'text-green-400' : 'text-red-400'
            }`} />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">E-Commerce Funnel</h3>
            <p className="text-xs text-slate-500">
              {data.platform && data.platform !== 'unknown' ? `${data.platform} • ` : ''}
              {detectedSteps}/{totalSteps} Steps erkannt
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${
            data.overallScore >= 80 ? 'text-green-400' :
            data.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {data.overallScore}%
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Funnel Visualization */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {data.funnelSteps.map((step, i) => (
                <div key={step.event} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.detected 
                      ? step.hasRequiredParams 
                        ? 'bg-green-500 text-white' 
                        : 'bg-yellow-500 text-black'
                      : 'bg-slate-600 text-slate-400'
                  }`}>
                    {step.detected ? (step.hasRequiredParams ? '✓' : '!') : '○'}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 text-center max-w-[60px] truncate">
                    {step.name}
                  </span>
                  {i < data.funnelSteps.length - 1 && (
                    <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-600 -z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Critical Gaps */}
          {data.criticalGaps.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Kritische Lücken</span>
              </div>
              <p className="text-xs text-slate-300">
                Fehlende Events: {data.criticalGaps.join(', ')}
              </p>
            </div>
          )}

          {/* Step Details */}
          <div className="space-y-2">
            {data.funnelSteps.map(step => (
              <div 
                key={step.event}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  step.detected ? 'bg-slate-700/30' : 'bg-slate-700/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {step.detected ? (
                    step.hasRequiredParams ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    )
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-500" />
                  )}
                  <span className={`text-sm ${step.detected ? 'text-slate-200' : 'text-slate-500'}`}>
                    {step.name}
                  </span>
                  <code className="text-xs text-slate-500 bg-slate-800 px-1 rounded">
                    {step.event}
                  </code>
                </div>
                {step.missingParams.length > 0 && (
                  <span className="text-xs text-yellow-400">
                    Fehlt: {step.missingParams.join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Empfehlungen</h4>
              {data.recommendations.map((rec, i) => (
                <p key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                  {rec}
                </p>
              ))}
            </div>
          )}

          {data.conversionRateKillers && data.conversionRateKillers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Conversion Rate Killer</h4>
              {data.conversionRateKillers.map((issue, i) => (
                <div key={i} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-300 font-medium">{issue.title}</p>
                  <p className="text-xs text-slate-300">{issue.description}</p>
                  <p className="text-xs text-slate-400 mt-1">Impact: {issue.impact}</p>
                  <p className="text-xs text-green-400 mt-1">Fix: {issue.fix}</p>
                </div>
              ))}
            </div>
          )}

          {data.optimizations && data.optimizations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Funnel-Optimierungen</h4>
              {data.optimizations.map((opt, i) => (
                <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                  <p className="text-sm text-slate-200">{opt.title}</p>
                  <p className="text-xs text-slate-400">{opt.description}</p>
                  <p className="text-xs text-green-400 mt-1">{opt.estimatedImpact}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Cookie Lifetime Audit Card
// ═══════════════════════════════════════════════════════════════════════════

interface CookieLifetimeCardProps {
  data: CookieLifetimeAuditResult;
}

export function CookieLifetimeCard({ data }: CookieLifetimeCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (data.impactedCookies.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Cookie className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-200">Cookie Lifetime</h3>
            <p className="text-xs text-green-400">Keine ITP-betroffenen Cookies</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <Cookie className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">Cookie Lifetime Audit</h3>
            <p className="text-xs text-slate-500">
              {data.impactedCookies.length} Cookies von ITP/Safari betroffen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-bold text-yellow-400">
              ~{data.estimatedDataLoss}%
            </div>
            <div className="text-xs text-slate-500">geschätzter Datenverlust</div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Safari Info */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-200">Safari/iOS Nutzeranteil</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${data.safariUserPercentage}%` }}
                />
              </div>
              <span className="text-sm text-slate-300">~{data.safariUserPercentage}%</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Diese Nutzer haben eingeschränktes Tracking durch ITP (7 Tage Cookie-Limit)
            </p>
          </div>

          {/* Impacted Cookies */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Betroffene Cookies</h4>
            {data.impactedCookies.map((cookie, i) => (
              <div 
                key={i}
                className={`p-2 rounded-lg border ${
                  cookie.impact === 'high' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : cookie.impact === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-slate-700/30 border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <code className="text-sm text-slate-200">{cookie.cookieName}</code>
                    <span className="text-xs text-slate-500 ml-2">{cookie.service}</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400">{cookie.originalLifetime}d</span>
                    <span className="text-slate-500 mx-1">→</span>
                    <span className="text-red-400">{cookie.itpLifetime}d</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  {cookie.affectsAttribution && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                      Attribution
                    </span>
                  )}
                  {cookie.affectsRemarketing && (
                    <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                      Remarketing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Server-Side Solution */}
          {data.serverSideWouldHelp && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Lösung: Server-Side Tracking</span>
              </div>
              <p className="text-xs text-slate-300">
                Server-seitig gesetzte Cookies werden nicht von ITP eingeschränkt und behalten ihre volle Lifetime.
              </p>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    rec.priority === 'high' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{rec.title}</p>
                    <p className="text-xs text-slate-400">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Unused Potential Card
// ═══════════════════════════════════════════════════════════════════════════

interface UnusedPotentialCardProps {
  data: UnusedPotentialResult;
}

export function UnusedPotentialCard({ data }: UnusedPotentialCardProps) {
  const [expanded, setExpanded] = useState(false);

  const totalItems = data.totalPotential.length + data.missingPlatforms.length;

  if (totalItems === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Lightbulb className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-200">Potenzial-Check</h3>
            <p className="text-xs text-green-400">Alle Tracking-Möglichkeiten genutzt!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Lightbulb className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">Ungenutztes Potenzial</h3>
            <p className="text-xs text-slate-500">
              {totalItems} Optimierungsmöglichkeiten gefunden
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.quickWins.length > 0 && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
              {data.quickWins.length} Quick Wins
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Incomplete Setups */}
          {data.totalPotential.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Optimierungspotenziale</h4>
              {data.totalPotential.map((item, i) => (
                <div 
                  key={i}
                  className={`p-3 rounded-lg border ${
                    item.difficulty === 'easy' 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : item.difficulty === 'medium'
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-slate-700/30 border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{item.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          item.difficulty === 'easy' 
                            ? 'bg-green-500/20 text-green-400' 
                            : item.difficulty === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {item.difficulty === 'easy' ? 'Einfach' : 
                           item.difficulty === 'medium' ? 'Mittel' : 'Komplex'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Aktuell: {item.currentState}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-xs text-green-400">{item.estimatedImpact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Missing Platforms */}
          {data.missingPlatforms.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Fehlende Plattformen</h4>
              {data.missingPlatforms.map((platform, i) => (
                <div 
                  key={i}
                  className="p-3 rounded-lg bg-slate-700/30 border border-slate-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-200">{platform.platform}</span>
                    <span className="text-xs text-blue-400">{platform.audienceReach}</span>
                  </div>
                  <p className="text-xs text-slate-400">{platform.reason}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {platform.recommendedFor.map((tag, j) => (
                      <span 
                        key={j}
                        className="text-xs px-1.5 py-0.5 bg-slate-600/50 text-slate-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROAS Quality Card
// ═══════════════════════════════════════════════════════════════════════════

interface ROASQualityCardProps {
  data: ROASQualityResult;
}

export function ROASQualityCard({ data }: ROASQualityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            data.overallScore >= 80 ? 'bg-green-500/20' :
            data.overallScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}>
            <DollarSign className={`w-5 h-5 ${getScoreColor(data.overallScore)}`} />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">ROAS Datenqualität</h3>
            <p className="text-xs text-slate-500">
              Wertübergabe für Google/Meta Ads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${getScoreColor(data.overallScore)}`}>
            {data.overallScore}%
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Value Tracking Status */}
          <div className="grid grid-cols-2 gap-2">
            <StatusItem 
              label="Transaction ID" 
              status={data.valueTracking.hasTransactionId} 
              critical
            />
            <StatusItem 
              label="Bestellwert" 
              status={data.valueTracking.hasValue} 
              critical
            />
            <StatusItem 
              label="Währung" 
              status={data.valueTracking.hasCurrency} 
              critical
            />
            <StatusItem 
              label="Item-Daten" 
              status={data.valueTracking.hasItems} 
            />
          </div>

          {/* Data Completeness */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Parameter-Status</h4>
            {data.dataCompleteness.parameters.map(param => (
              <div 
                key={param.name}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30"
              >
                <div className="flex items-center gap-2">
                  {param.status === 'present' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : param.status === 'incomplete' ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-slate-200">{param.displayName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    param.importance === 'critical' 
                      ? 'bg-red-500/20 text-red-400' 
                      : param.importance === 'recommended'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-slate-600/50 text-slate-400'
                  }`}>
                    {param.importance === 'critical' ? 'Kritisch' : 
                     param.importance === 'recommended' ? 'Empfohlen' : 'Optional'}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {param.affects.slice(0, 2).join(', ')}
                </span>
              </div>
            ))}
          </div>

          {/* Estimated Data Loss */}
          {data.estimatedDataLoss > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">
                  Geschätzter Datenverlust: ~{data.estimatedDataLoss}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Durch fehlende Parameter können Ads-Plattformen nicht optimal optimieren.
              </p>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Empfehlungen</h4>
              {data.recommendations.map((rec, i) => (
                <div 
                  key={i}
                  className={`p-3 rounded-lg border ${
                    rec.priority === 'critical' 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : rec.priority === 'high'
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-200">{rec.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{rec.description}</p>
                  <p className="text-xs text-green-400 mt-1">Impact: {rec.impact}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Conversion Tracking Audit Card
// ═══════════════════════════════════════════════════════════════════════════

interface ConversionTrackingAuditCardProps {
  data: ConversionTrackingAuditResult;
}

export function ConversionTrackingAuditCard({ data }: ConversionTrackingAuditCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            data.overallScore >= 80 ? 'bg-green-500/20' :
            data.overallScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}>
            <Target className={`w-5 h-5 ${getScoreColor(data.overallScore)}`} />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">Conversion Tracking Audit</h3>
            <p className="text-xs text-slate-500">Plattform-Setup & Datenqualität</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${getScoreColor(data.overallScore)}`}>
            {data.overallScore}%
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {data.platforms.map((platform) => (
              <div key={platform.platform} className="p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200">{platform.platform.toUpperCase()}</span>
                  <span className={`text-sm font-bold ${getScoreColor(platform.coverageScore)}`}>
                    {platform.coverageScore}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={platform.hasServerSide ? 'text-green-400' : 'text-slate-500'}>
                    {platform.hasServerSide ? '✓' : '○'} Server-Side
                  </span>
                  <span className={platform.hasDedupe ? 'text-green-400' : 'text-slate-500'}>
                    {platform.hasDedupe ? '✓' : '○'} Dedupe
                  </span>
                  <span className={platform.hasValue ? 'text-green-400' : 'text-slate-500'}>
                    {platform.hasValue ? '✓' : '○'} Value
                  </span>
                  <span className={platform.hasCurrency ? 'text-green-400' : 'text-slate-500'}>
                    {platform.hasCurrency ? '✓' : '○'} Currency
                  </span>
                </div>
              </div>
            ))}
          </div>

          {data.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Probleme</h4>
              {data.issues.map((issue, i) => (
                <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                  <p className="text-sm text-slate-200">{issue.title}</p>
                  <p className="text-xs text-slate-400">{issue.description}</p>
                </div>
              ))}
            </div>
          )}

          {data.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Empfehlungen</h4>
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    rec.priority === 'high' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{rec.title}</p>
                    <p className="text-xs text-slate-400">{rec.description}</p>
                    <p className="text-xs text-green-400 mt-1">{rec.estimatedImpact}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Campaign Attribution Card
// ═══════════════════════════════════════════════════════════════════════════

interface CampaignAttributionCardProps {
  data: CampaignAttributionResult;
}

export function CampaignAttributionCard({ data }: CampaignAttributionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            data.overallScore >= 80 ? 'bg-green-500/20' :
            data.overallScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}>
            <Link2 className={`w-5 h-5 ${getScoreColor(data.overallScore)}`} />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">Campaign & Attribution</h3>
            <p className="text-xs text-slate-500">UTM, Click-IDs, Cross-Domain</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${getScoreColor(data.overallScore)}`}>
            {data.overallScore}%
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Click IDs</h4>
            <div className="flex flex-wrap gap-2">
              {data.clickIdStatus.map((signal) => (
                <span
                  key={signal.signal}
                  className={`text-xs px-2 py-1 rounded ${
                    signal.detected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {signal.signal}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">UTM Parameter</h4>
            <div className="flex flex-wrap gap-2">
              {data.utmStatus.map((signal) => (
                <span
                  key={signal.signal}
                  className={`text-xs px-2 py-1 rounded ${
                    signal.detected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {signal.signal}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-700/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-200">Cross-Domain Tracking</span>
            </div>
            <span className={`text-xs ${data.crossDomain.detected ? 'text-green-400' : 'text-yellow-400'}`}>
              {data.crossDomain.detected ? 'Erkannt' : 'Nicht erkannt'}
            </span>
          </div>

          {data.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Empfehlungen</h4>
              {data.recommendations.map((rec, i) => (
                <p key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                  {rec.title}: {rec.description}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GTM Audit Card
// ═══════════════════════════════════════════════════════════════════════════

interface GTMAuditCardProps {
  data: GTMAuditResult;
}

export function GTMAuditCard({ data }: GTMAuditCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            data.score >= 80 ? 'bg-green-500/20' :
            data.score >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}>
            <Layers className={`w-5 h-5 ${getScoreColor(data.score)}`} />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">GTM Container Audit</h3>
            <p className="text-xs text-slate-500">
              {data.detected ? `${data.containerIds.join(', ')}` : 'Kein GTM erkannt'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${getScoreColor(data.score)}`}>
            {data.score}%
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatusItem label="Noscript Tag" status={data.hasNoScriptTag} />
            <StatusItem label="Snippet im Head" status={data.snippetInHead} />
            <StatusItem label="Consent vor GTM" status={data.consentDefaultBeforeGtm} />
            <StatusItem label="Single Container" status={!data.hasMultipleContainers} />
          </div>

          {data.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Auffälligkeiten</h4>
              {data.issues.map((issue, i) => (
                <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                  <p className="text-sm text-slate-200">{issue.title}</p>
                  <p className="text-xs text-slate-400">{issue.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Privacy Sandbox Card
// ═══════════════════════════════════════════════════════════════════════════

interface PrivacySandboxCardProps {
  data: PrivacySandboxResult;
}

export function PrivacySandboxCard({ data }: PrivacySandboxCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-700/50">
            <ShieldCheck className="w-5 h-5 text-slate-300" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">Privacy Sandbox</h3>
            <p className="text-xs text-slate-500">
              {data.summary.detectedSignals} Signale erkannt
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {([
            ['Topics API', data.topicsApi],
            ['Protected Audience', data.protectedAudience],
            ['Attribution Reporting', data.attributionReporting],
            ['Private Aggregation', data.privateAggregation],
            ['CHIPS', data.chips],
            ['First-Party Sets', data.firstPartySets],
          ] as [string, PrivacySandboxSignal][]).map(([label, signal]) => (
            <div key={label} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-200">{label}</span>
              <span className={`text-xs ${signal.detected ? 'text-green-400' : 'text-slate-500'}`}>
                {signal.detected ? 'Erkannt' : 'Nicht erkannt'}
              </span>
            </div>
          ))}
          {data.summary.warnings.length > 0 && (
            <div className="text-xs text-yellow-400">
              {data.summary.warnings.join(' ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// E-Commerce Deep Dive Card
// ═══════════════════════════════════════════════════════════════════════════

interface EcommerceDeepDiveCardProps {
  data: EcommerceDeepDiveResult;
}

export function EcommerceDeepDiveCard({ data }: EcommerceDeepDiveCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            data.overallScore >= 80 ? 'bg-green-500/20' :
            data.overallScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}>
            <ShoppingCart className={`w-5 h-5 ${getScoreColor(data.overallScore)}`} />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-slate-200">E-Commerce Deep Dive</h3>
            <p className="text-xs text-slate-500">
              Coverage & Item-Qualität
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${getScoreColor(data.overallScore)}`}>
            {data.overallScore}%
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatusItem label="Event Coverage" status={data.coverage.coverageScore >= 80} />
            <StatusItem label="Item-Qualität" status={data.itemDataQuality.completenessScore >= 80} />
            <StatusItem label="Revenue Daten" status={data.revenueQuality.issues.length === 0} />
            <StatusItem label="Dynamic Remarketing" status={data.dynamicRemarketingReady} />
          </div>

          {data.coverage.missingEvents.length > 0 && (
            <div className="text-xs text-yellow-400">
              Fehlende Events: {data.coverage.missingEvents.join(', ')}
            </div>
          )}

          {data.itemDataQuality.missingFields.length > 0 && (
            <div className="text-xs text-yellow-400">
              Fehlende Item-Felder: {data.itemDataQuality.missingFields.join(', ')}
            </div>
          )}

          {data.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Empfehlungen</h4>
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    rec.priority === 'high' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{rec.title}</p>
                    <p className="text-xs text-slate-400">{rec.description}</p>
                    <p className="text-xs text-green-400 mt-1">{rec.estimatedImpact}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper Component
function StatusItem({ label, status, critical = false }: { 
  label: string; 
  status: boolean; 
  critical?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${
      status ? 'bg-green-500/10' : critical ? 'bg-red-500/10' : 'bg-yellow-500/10'
    }`}>
      {status ? (
        <CheckCircle2 className="w-4 h-4 text-green-400" />
      ) : (
        <XCircle className={`w-4 h-4 ${critical ? 'text-red-400' : 'text-yellow-400'}`} />
      )}
      <span className={`text-sm ${status ? 'text-green-400' : critical ? 'text-red-400' : 'text-yellow-400'}`}>
        {label}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export: Performance Marketing Section
// ═══════════════════════════════════════════════════════════════════════════

interface PerformanceMarketingSectionProps {
  eventQualityScore?: EventQualityScoreResult;
  funnelValidation?: FunnelValidationResult;
  cookieLifetimeAudit?: CookieLifetimeAuditResult;
  unusedPotential?: UnusedPotentialResult;
  roasQuality?: ROASQualityResult;
  conversionTrackingAudit?: ConversionTrackingAuditResult;
  campaignAttribution?: CampaignAttributionResult;
  gtmAudit?: GTMAuditResult;
  privacySandbox?: PrivacySandboxResult;
  ecommerceDeepDive?: EcommerceDeepDiveResult;
}

export function PerformanceMarketingSection({
  eventQualityScore,
  funnelValidation,
  cookieLifetimeAudit,
  unusedPotential,
  roasQuality,
  conversionTrackingAudit,
  campaignAttribution,
  gtmAudit,
  privacySandbox,
  ecommerceDeepDive,
}: PerformanceMarketingSectionProps) {
  const [expanded, setExpanded] = useState(true);

  // Check if any data exists
  const hasData = eventQualityScore || funnelValidation || cookieLifetimeAudit || unusedPotential || roasQuality ||
    conversionTrackingAudit || campaignAttribution || gtmAudit || privacySandbox || ecommerceDeepDive;

  if (!hasData) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-slate-200">Performance Marketing Analyse</h2>
            <p className="text-xs text-slate-500">Event Quality, Funnel, ROAS & mehr</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-purple-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-purple-400" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 pl-2">
          {eventQualityScore && <EventQualityCard data={eventQualityScore} />}
          {conversionTrackingAudit && <ConversionTrackingAuditCard data={conversionTrackingAudit} />}
          {campaignAttribution && <CampaignAttributionCard data={campaignAttribution} />}
          {gtmAudit && <GTMAuditCard data={gtmAudit} />}
          {roasQuality && <ROASQualityCard data={roasQuality} />}
          {funnelValidation && <FunnelValidationCard data={funnelValidation} />}
          {ecommerceDeepDive && <EcommerceDeepDiveCard data={ecommerceDeepDive} />}
          {cookieLifetimeAudit && <CookieLifetimeCard data={cookieLifetimeAudit} />}
          {unusedPotential && <UnusedPotentialCard data={unusedPotential} />}
          {privacySandbox && <PrivacySandboxCard data={privacySandbox} />}
        </div>
      )}
    </div>
  );
}
