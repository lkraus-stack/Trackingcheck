'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Cookie,
  Shield,
  Tag,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { AnalysisResult, Issue } from '@/types';
import { AIAnalysis } from './AIAnalysis';

interface ResultCardProps {
  result: AnalysisResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cookieBanner: true,
    googleConsentMode: true,
    tracking: false,
    cookies: false,
    issues: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-emerald-500/20';
    if (score >= 50) return 'from-yellow-500/20 to-orange-500/20';
    return 'from-red-500/20 to-rose-500/20';
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Score Card */}
      <div className={`bg-gradient-to-r ${getScoreBackground(result.score)} rounded-xl p-4 border border-slate-700`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Compliance Score</p>
            <p className={`text-4xl font-bold ${getScoreColor(result.score)}`}>{result.score}/100</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Analysiert am</p>
            <p className="text-slate-300 text-sm">
              {new Date(result.timestamp).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Cookie Banner Section */}
      <Section
        title="Cookie Banner"
        icon={<Cookie className="w-5 h-5" />}
        status={result.cookieBanner.detected}
        expanded={expandedSections.cookieBanner}
        onToggle={() => toggleSection('cookieBanner')}
      >
        <div className="grid grid-cols-2 gap-3">
          <StatusItem
            label="Banner erkannt"
            value={result.cookieBanner.detected}
          />
          <StatusItem
            label="Provider"
            value={result.cookieBanner.provider || 'Unbekannt'}
            isText
          />
          <StatusItem
            label="Akzeptieren-Button"
            value={result.cookieBanner.hasAcceptButton}
          />
          <StatusItem
            label="Ablehnen-Button"
            value={result.cookieBanner.hasRejectButton}
          />
          <StatusItem
            label="Einstellungen-Option"
            value={result.cookieBanner.hasSettingsOption}
          />
          <StatusItem
            label="Blockiert Content"
            value={result.cookieBanner.blocksContent}
            invertColor
          />
        </div>
      </Section>

      {/* Google Consent Mode Section */}
      <Section
        title="Google Consent Mode"
        icon={<Shield className="w-5 h-5" />}
        status={result.googleConsentMode.detected}
        expanded={expandedSections.googleConsentMode}
        onToggle={() => toggleSection('googleConsentMode')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatusItem
              label="Consent Mode erkannt"
              value={result.googleConsentMode.detected}
            />
            <StatusItem
              label="Version"
              value={result.googleConsentMode.version || 'Nicht erkannt'}
              isText
              highlight={result.googleConsentMode.version === 'v2'}
            />
          </div>
          <div className="border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-400 mb-2">Parameter Status:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.googleConsentMode.parameters).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  {value ? (
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  ) : (
                    <XCircle className="w-3 h-3 text-slate-500" />
                  )}
                  <span className={`text-xs ${value ? 'text-slate-300' : 'text-slate-500'}`}>
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* TCF Section */}
      {result.tcf.detected && (
        <Section
          title="IAB TCF"
          icon={<Shield className="w-5 h-5" />}
          status={result.tcf.detected}
          expanded={expandedSections.tcf}
          onToggle={() => toggleSection('tcf')}
        >
          <div className="grid grid-cols-2 gap-3">
            <StatusItem label="TCF erkannt" value={result.tcf.detected} />
            <StatusItem label="Version" value={result.tcf.version || 'Unbekannt'} isText />
            <StatusItem label="CMP" value={result.tcf.cmpName || 'Unbekannt'} isText />
            <StatusItem label="Gültiger TC String" value={result.tcf.validTcString} />
          </div>
        </Section>
      )}

      {/* Tracking Tags Section */}
      <Section
        title="Tracking Tags"
        icon={<Tag className="w-5 h-5" />}
        status={
          result.trackingTags.googleAnalytics.detected ||
          result.trackingTags.googleTagManager.detected ||
          result.trackingTags.metaPixel.detected
        }
        expanded={expandedSections.tracking}
        onToggle={() => toggleSection('tracking')}
      >
        <div className="space-y-3">
          {/* Google Analytics */}
          <TrackingItem
            name="Google Analytics"
            detected={result.trackingTags.googleAnalytics.detected}
            identifier={
              result.trackingTags.googleAnalytics.measurementIds?.[0] || result.trackingTags.googleAnalytics.measurementId
            }
            extraCount={
              result.trackingTags.googleAnalytics.measurementIds && result.trackingTags.googleAnalytics.measurementIds.length > 1
                ? result.trackingTags.googleAnalytics.measurementIds.length - 1
                : undefined
            }
            badge={result.trackingTags.googleAnalytics.version}
          />
          {/* GTM */}
          <TrackingItem
            name="Google Tag Manager"
            detected={result.trackingTags.googleTagManager.detected}
            identifier={result.trackingTags.googleTagManager.containerId}
          />
          {/* Meta Pixel */}
          <TrackingItem
            name="Meta Pixel"
            detected={result.trackingTags.metaPixel.detected}
            identifier={result.trackingTags.metaPixel.pixelId}
          />
          {/* LinkedIn */}
          <TrackingItem
            name="LinkedIn Insight"
            detected={result.trackingTags.linkedInInsight.detected}
            identifier={result.trackingTags.linkedInInsight.partnerId}
          />
          {/* TikTok */}
          <TrackingItem
            name="TikTok Pixel"
            detected={result.trackingTags.tiktokPixel.detected}
            identifier={result.trackingTags.tiktokPixel.pixelId}
          />
          {/* Andere */}
          {result.trackingTags.other.length > 0 && (
            <div className="border-t border-slate-700 pt-2 mt-2">
              <p className="text-xs text-slate-400 mb-2">Weitere erkannt:</p>
              <div className="flex flex-wrap gap-2">
                {result.trackingTags.other.map((tag) => (
                  <span
                    key={tag.name}
                    className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Cookies Section */}
      <Section
        title={`Cookies (${result.cookies.length})`}
        icon={<BarChart3 className="w-5 h-5" />}
        status={result.cookies.length > 0}
        expanded={expandedSections.cookies}
        onToggle={() => toggleSection('cookies')}
      >
        <div className="space-y-2">
          {/* Cookie Categories Summary */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <CookieCategorySummary
              category="Notwendig"
              count={result.cookies.filter((c) => c.category === 'necessary').length}
              color="bg-green-500"
            />
            <CookieCategorySummary
              category="Funktional"
              count={result.cookies.filter((c) => c.category === 'functional').length}
              color="bg-blue-500"
            />
            <CookieCategorySummary
              category="Analytics"
              count={result.cookies.filter((c) => c.category === 'analytics').length}
              color="bg-yellow-500"
            />
            <CookieCategorySummary
              category="Marketing"
              count={result.cookies.filter((c) => c.category === 'marketing').length}
              color="bg-red-500"
            />
          </div>
          {/* Cookie List */}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {result.cookies.slice(0, 10).map((cookie, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs p-2 bg-slate-800 rounded"
              >
                <span className="text-slate-300 font-mono truncate max-w-[150px]">
                  {cookie.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    cookie.category === 'necessary'
                      ? 'bg-green-500/20 text-green-400'
                      : cookie.category === 'analytics'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : cookie.category === 'marketing'
                      ? 'bg-red-500/20 text-red-400'
                      : cookie.category === 'functional'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-600 text-slate-400'
                  }`}
                >
                  {cookie.category}
                </span>
              </div>
            ))}
            {result.cookies.length > 10 && (
              <p className="text-xs text-slate-500 text-center pt-2">
                +{result.cookies.length - 10} weitere Cookies
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Issues Section */}
      {result.issues.length > 0 && (
        <Section
          title={`Probleme & Hinweise (${result.issues.length})`}
          icon={<AlertTriangle className="w-5 h-5" />}
          status={false}
          expanded={expandedSections.issues}
          onToggle={() => toggleSection('issues')}
          statusColor="text-yellow-400"
        >
          <div className="space-y-3">
            {result.issues.map((issue, index) => (
              <IssueItem key={index} issue={issue} />
            ))}
          </div>
        </Section>
      )}

      {/* KI-Analyse */}
      <AIAnalysis result={result} />

      {/* Link zur Website */}
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Website öffnen
      </a>
    </div>
  );
}

// Helper Components
function Section({
  title,
  icon,
  status,
  expanded,
  onToggle,
  children,
  statusColor,
}: {
  title: string;
  icon: React.ReactNode;
  status: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  statusColor?: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={statusColor || (status ? 'text-green-400' : 'text-slate-500')}>
            {icon}
          </span>
          <span className="font-medium text-slate-200">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {!statusColor && (
            status ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-500" />
            )
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function StatusItem({
  label,
  value,
  isText = false,
  invertColor = false,
  highlight = false,
}: {
  label: string;
  value: boolean | string;
  isText?: boolean;
  invertColor?: boolean;
  highlight?: boolean;
}) {
  const isBoolean = typeof value === 'boolean';
  const isPositive = isBoolean ? (invertColor ? !value : value) : false;

  return (
    <div className="flex items-center justify-between p-2 bg-slate-800 rounded">
      <span className="text-xs text-slate-400">{label}</span>
      {isText ? (
        <span className={`text-xs font-medium ${highlight ? 'text-green-400' : 'text-slate-300'}`}>
          {value}
        </span>
      ) : (
        <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {value ? 'Ja' : 'Nein'}
        </span>
      )}
    </div>
  );
}

function TrackingItem({
  name,
  detected,
  identifier,
  badge,
  extraCount,
}: {
  name: string;
  detected: boolean;
  identifier?: string;
  badge?: string;
  extraCount?: number;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-slate-800 rounded">
      <div className="flex items-center gap-2">
        {detected ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <XCircle className="w-4 h-4 text-slate-500" />
        )}
        <span className={`text-sm ${detected ? 'text-slate-200' : 'text-slate-500'}`}>{name}</span>
        {badge && (
          <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded">
            {badge}
          </span>
        )}
      </div>
      {identifier && (
        <span className="text-xs text-slate-400 font-mono">
          {identifier}
          {extraCount ? ` (+${extraCount})` : ''}
        </span>
      )}
    </div>
  );
}

function CookieCategorySummary({
  category,
  count,
  color,
}: {
  category: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-800 rounded">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-slate-400">{category}</span>
      <span className="text-xs font-medium text-slate-300 ml-auto">{count}</span>
    </div>
  );
}

function IssueItem({ issue }: { issue: Issue }) {
  const getIcon = () => {
    switch (issue.severity) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (issue.severity) {
      case 'error':
        return 'border-red-500/30';
      case 'warning':
        return 'border-yellow-500/30';
      case 'info':
        return 'border-blue-500/30';
    }
  };

  return (
    <div className={`p-3 bg-slate-800 rounded border-l-2 ${getBorderColor()}`}>
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200">{issue.title}</p>
          <p className="text-xs text-slate-400 mt-1">{issue.description}</p>
          {issue.recommendation && (
            <p className="text-xs text-indigo-400 mt-2">💡 {issue.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
}
