'use client';

import { useState, useEffect } from 'react';
import {
  Cookie,
  Shield,
  Tag,
  Globe2,
  Scale,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Target,
  ShoppingCart,
  Server,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { AnalysisResult } from '@/types';

interface AnalysisOverviewProps {
  result: AnalysisResult;
}

export function AnalysisOverview({ result }: AnalysisOverviewProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Animate score on mount
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = result.score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= result.score) {
        setAnimatedScore(result.score);
        clearInterval(timer);
        setTimeout(() => setShowDetails(true), 200);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [result.score]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return { main: '#22c55e', secondary: '#4ade80', bg: 'from-green-500/20 to-emerald-500/20' };
    if (score >= 50) return { main: '#eab308', secondary: '#facc15', bg: 'from-yellow-500/20 to-orange-500/20' };
    return { main: '#ef4444', secondary: '#f87171', bg: 'from-red-500/20 to-rose-500/20' };
  };

  const scoreColors = getScoreColor(result.score);
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Calculate category scores
  const categories = [
    {
      id: 'banner',
      name: 'Cookie Banner',
      icon: Cookie,
      score: result.cookieBanner.detected ? (result.cookieBanner.hasRejectButton ? 100 : 70) : 0,
      status: result.cookieBanner.detected ? (result.cookieBanner.hasRejectButton ? 'good' : 'warning') : 'bad',
      details: result.cookieBanner.provider || (result.cookieBanner.detected ? 'Erkannt' : 'Nicht erkannt'),
      color: 'cyan',
    },
    {
      id: 'consent',
      name: 'Consent Mode',
      icon: Shield,
      score: result.googleConsentMode.version === 'v2' ? 100 : result.googleConsentMode.detected ? 60 : 0,
      status: result.googleConsentMode.version === 'v2' ? 'good' : result.googleConsentMode.detected ? 'warning' : 'bad',
      details: result.googleConsentMode.version || (result.googleConsentMode.detected ? 'v1' : 'Nicht erkannt'),
      color: 'purple',
    },
    {
      id: 'tracking',
      name: 'Tracking Tags',
      icon: Tag,
      score: calculateTrackingScore(result),
      status: result.trackingTags.googleAnalytics.detected || result.trackingTags.googleTagManager.detected ? 'good' : 'warning',
      details: getTrackingDetails(result),
      color: 'pink',
    },
    {
      id: 'gdpr',
      name: 'DSGVO',
      icon: Scale,
      score: result.gdprChecklist?.score || 0,
      status: (result.gdprChecklist?.score || 0) >= 80 ? 'good' : (result.gdprChecklist?.score || 0) >= 50 ? 'warning' : 'bad',
      details: getGdprDetails(result),
      color: 'amber',
    },
    {
      id: 'thirdparty',
      name: 'Third-Party',
      icon: Globe2,
      score: Math.max(0, 100 - (result.thirdPartyDomains?.riskAssessment.highRiskDomains.length || 0) * 20),
      status: (result.thirdPartyDomains?.riskAssessment.highRiskDomains.length || 0) === 0 ? 'good' : 'warning',
      details: `${result.thirdPartyDomains?.totalCount || 0} Domains`,
      color: 'teal',
    },
    {
      id: 'issues',
      name: 'Probleme',
      icon: AlertTriangle,
      score: getIssuesScore(result),
      status: getIssuesStatus(result),
      details: getIssuesDetails(result),
      color: getIssuesColor(result),
    },
  ];

  // Quick Stats for the header
  const quickStats = [
    { label: 'Cookies', value: result.cookies.length, icon: Cookie },
    { label: 'Tracking', value: countTrackingTags(result), icon: Tag },
    { label: 'Third-Party', value: result.thirdPartyDomains?.totalCount || 0, icon: Globe2 },
    { label: 'Probleme', value: result.issues.length, icon: AlertTriangle, highlight: result.issues.filter(i => i.severity === 'error').length > 0 },
  ];

  // Performance indicators
  const performanceIndicators = [
    {
      label: 'Server-Side GTM',
      active: result.trackingTags.serverSideTracking?.detected || false,
      icon: Server,
    },
    {
      label: 'Meta CAPI',
      active: result.trackingTags.serverSideTracking?.summary.hasMetaCAPI || false,
      icon: Target,
    },
    {
      label: 'E-Commerce',
      active: result.dataLayerAnalysis?.ecommerce?.detected || false,
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="mb-6 space-y-4">
      {/* Hero Score Section */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${scoreColors.bg} border border-slate-700/50 p-6`}>
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full opacity-30">
            <div 
              className="w-96 h-96 rounded-full blur-3xl animate-pulse-slow"
              style={{ background: `radial-gradient(circle, ${scoreColors.main}40, transparent)` }}
            />
          </div>
          <div className="absolute -bottom-1/2 -left-1/4 w-full h-full opacity-20">
            <div 
              className="w-80 h-80 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"
              style={{ background: `radial-gradient(circle, ${scoreColors.secondary}30, transparent)` }}
            />
          </div>
        </div>

        <div className="relative z-10">
          {/* Top Row: Score + Quick Stats */}
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
            {/* Animated Score Ring */}
            <div className="relative flex-shrink-0">
              <svg width="200" height="200" className="transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-700/50"
                />
                {/* Animated Progress Ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={scoreColors.main} />
                    <stop offset="100%" stopColor={scoreColors.secondary} />
                  </linearGradient>
                </defs>
              </svg>
              {/* Score Number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span 
                  className="text-5xl font-bold tabular-nums"
                  style={{ color: scoreColors.main }}
                >
                  {animatedScore}
                </span>
                <span className="text-sm text-slate-400 font-medium">von 100</span>
                <span className="text-xs text-slate-500 mt-1">Compliance Score</span>
              </div>
            </div>

            {/* Right Side Content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Status Message */}
              <div className="mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
                  {result.score >= 80 ? (
                    <>
                      <Sparkles className="inline w-6 h-6 mr-2 text-green-400" />
                      Sehr gutes Setup!
                    </>
                  ) : result.score >= 50 ? (
                    <>
                      <AlertTriangle className="inline w-6 h-6 mr-2 text-yellow-400" />
                      Optimierungspotenzial vorhanden
                    </>
                  ) : (
                    <>
                      <XCircle className="inline w-6 h-6 mr-2 text-red-400" />
                      Kritische Probleme erkannt
                    </>
                  )}
                </h3>
                <p className="text-slate-400 text-sm max-w-md">
                  {result.score >= 80 
                    ? 'Dein Tracking-Setup erfüllt die meisten Compliance-Anforderungen. Nur kleine Optimierungen möglich.'
                    : result.score >= 50
                    ? 'Einige Bereiche benötigen Aufmerksamkeit. Schau dir die Details unten an.'
                    : 'Dringender Handlungsbedarf! Mehrere kritische Bereiche müssen optimiert werden.'}
                </p>
              </div>

              {/* Quick Stats Pills */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {quickStats.map((stat) => (
                  <div 
                    key={stat.label}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                      stat.highlight 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : 'bg-slate-800/60 text-slate-300 border border-slate-700/50'
                    }`}
                  >
                    <stat.icon className="w-4 h-4" />
                    <span className="font-medium">{stat.value}</span>
                    <span className="text-slate-500">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Performance Indicators */}
              <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
                {performanceIndicators.map((indicator) => (
                  <div 
                    key={indicator.label}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                      indicator.active 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-slate-800/40 text-slate-500 border border-slate-700/30'
                    }`}
                  >
                    {indicator.active ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {indicator.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div 
        className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 transition-all duration-500 ${
          showDetails ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {categories.map((category, index) => (
          <CategoryCard key={category.id} category={category} delay={index * 50} />
        ))}
      </div>

      {/* Issues Quick View */}
      {result.issues.length > 0 && (
        <div 
          className={`transition-all duration-500 delay-300 ${
            showDetails ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <IssuesQuickView issues={result.issues} />
        </div>
      )}
    </div>
  );
}

// Category Card Component
function CategoryCard({ category, delay }: { 
  category: { 
    id: string; 
    name: string; 
    icon: any; 
    score: number; 
    status: string; 
    details: string;
    color: string;
  }; 
  delay: number;
}) {
  const Icon = category.icon;
  
  const colorClasses: Record<string, { bg: string; border: string; icon: string; progress: string }> = {
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: 'text-cyan-400', progress: 'bg-cyan-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-400', progress: 'bg-purple-500' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', icon: 'text-pink-400', progress: 'bg-pink-500' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400', progress: 'bg-amber-500' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', icon: 'text-teal-400', progress: 'bg-teal-500' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: 'text-rose-400', progress: 'bg-rose-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: 'text-yellow-400', progress: 'bg-yellow-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400', progress: 'bg-emerald-500' },
  };

  const colors = colorClasses[category.color] || colorClasses.cyan;

  const statusIcon = category.status === 'good' 
    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
    : category.status === 'warning'
    ? <AlertTriangle className="w-4 h-4 text-yellow-400" />
    : <XCircle className="w-4 h-4 text-red-400" />;

  return (
    <div 
      className={`relative group p-3 rounded-xl ${colors.bg} border ${colors.border} hover:border-opacity-60 transition-all duration-300 hover:scale-[1.02] cursor-default`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Icon & Status */}
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg bg-slate-800/50 ${colors.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        {statusIcon}
      </div>

      {/* Name & Score */}
      <h4 className="text-sm font-medium text-slate-200 mb-1 truncate">{category.name}</h4>
      
      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full ${colors.progress} transition-all duration-1000 ease-out`}
          style={{ width: `${category.score}%` }}
        />
      </div>

      {/* Details */}
      <p className="text-xs text-slate-500 truncate">{category.details}</p>

      {/* Score Badge */}
      <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        category.score >= 80 ? 'bg-green-500 text-white' :
        category.score >= 50 ? 'bg-yellow-500 text-black' :
        'bg-red-500 text-white'
      }`}>
        {category.score}
      </div>
    </div>
  );
}

// Issues Quick View Component
function IssuesQuickView({ issues }: { issues: AnalysisResult['issues'] }) {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        <h3 className="font-medium text-slate-200">Gefundene Probleme</h3>
      </div>

      <div className="flex flex-wrap gap-4">
        {errors.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg">
              <XCircle className="w-4 h-4" />
              <span className="font-bold">{errors.length}</span>
              <span className="text-sm">Fehler</span>
            </div>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-bold">{warnings.length}</span>
              <span className="text-sm">Warnungen</span>
            </div>
          </div>
        )}
        {infos.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Zap className="w-4 h-4" />
              <span className="font-bold">{infos.length}</span>
              <span className="text-sm">Hinweise</span>
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Issues Preview */}
      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.slice(0, 3).map((issue, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-200">{issue.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{issue.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper Functions
function calculateTrackingScore(result: AnalysisResult): number {
  let score = 0;
  if (result.trackingTags.googleAnalytics.detected) score += 30;
  if (result.trackingTags.googleTagManager.detected) score += 30;
  if (result.trackingTags.metaPixel.detected) score += 20;
  if (result.trackingTags.serverSideTracking?.detected) score += 20;
  return Math.min(100, score);
}

function countTrackingTags(result: AnalysisResult): number {
  let count = 0;
  if (result.trackingTags.googleAnalytics.detected) count++;
  if (result.trackingTags.googleTagManager.detected) count++;
  if (result.trackingTags.metaPixel.detected) count++;
  if (result.trackingTags.linkedInInsight.detected) count++;
  if (result.trackingTags.tiktokPixel.detected) count++;
  if (result.trackingTags.googleAdsConversion?.detected) count++;
  return count;
}

function getTrackingDetails(result: AnalysisResult): string {
  const tags: string[] = [];
  if (result.trackingTags.googleAnalytics.detected) tags.push('GA4');
  if (result.trackingTags.googleTagManager.detected) tags.push('GTM');
  if (result.trackingTags.metaPixel.detected) tags.push('Meta');
  if (result.trackingTags.serverSideTracking?.detected) tags.push('sGTM');
  return tags.length > 0 ? tags.join(', ') : 'Kein Tracking';
}

// Improved GDPR details to show ALL statuses including warnings
function getGdprDetails(result: AnalysisResult): string {
  const summary = result.gdprChecklist?.summary;
  if (!summary) return 'Nicht verfügbar';
  
  const passed = summary.passed || 0;
  const failed = summary.failed || 0;
  const warnings = summary.warnings || 0;
  const total = passed + failed + warnings;
  
  if (warnings > 0) {
    return `${passed}✓ ${failed > 0 ? failed + '✗ ' : ''}${warnings}⚠ von ${total}`;
  }
  return `${passed} von ${total} bestanden`;
}

// Issues Score with better weighting
function getIssuesScore(result: AnalysisResult): number {
  const errors = result.issues.filter(i => i.severity === 'error').length;
  const warnings = result.issues.filter(i => i.severity === 'warning').length;
  const infos = result.issues.filter(i => i.severity === 'info').length;
  
  // If no issues at all, perfect score
  if (errors === 0 && warnings === 0 && infos === 0) return 100;
  
  // Weighted calculation: errors = -20, warnings = -8, infos = -2
  const score = 100 - (errors * 20) - (warnings * 8) - (infos * 2);
  return Math.max(0, Math.min(100, score));
}

// Issues status based on overall health
function getIssuesStatus(result: AnalysisResult): 'good' | 'warning' | 'bad' {
  const errors = result.issues.filter(i => i.severity === 'error').length;
  const warnings = result.issues.filter(i => i.severity === 'warning').length;
  
  if (errors > 0) return 'bad';
  if (warnings > 3) return 'warning';
  return 'good';
}

// Issues details with better summary
function getIssuesDetails(result: AnalysisResult): string {
  const errors = result.issues.filter(i => i.severity === 'error').length;
  const warnings = result.issues.filter(i => i.severity === 'warning').length;
  const infos = result.issues.filter(i => i.severity === 'info').length;
  
  if (errors === 0 && warnings === 0 && infos === 0) {
    return 'Keine Probleme!';
  }
  
  const parts: string[] = [];
  if (errors > 0) parts.push(`${errors}✗`);
  if (warnings > 0) parts.push(`${warnings}⚠`);
  if (infos > 0) parts.push(`${infos}ℹ`);
  
  return parts.join(' ');
}

// Dynamic color based on issues severity
function getIssuesColor(result: AnalysisResult): string {
  const errors = result.issues.filter(i => i.severity === 'error').length;
  const warnings = result.issues.filter(i => i.severity === 'warning').length;
  
  if (errors > 0) return 'rose';
  if (warnings > 3) return 'amber';
  if (warnings > 0) return 'yellow';
  return 'emerald'; // No issues = green
}
