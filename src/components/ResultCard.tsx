'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
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
  Download,
  ShoppingCart,
  Globe2,
  Scale,
  FileCheck,
  Search,
  HelpCircle,
} from 'lucide-react';
import { AnalysisResult, Issue, CookieResult } from '@/types';
import { AIAnalysis } from './AIAnalysis';
import { exportAnalysisToPDF } from '@/lib/pdf/exportToPdf';
import { SectionInfoPopup } from './SectionInfoPopup';
import { QuickActions } from './QuickActions';
import { AnalysisComparison } from './AnalysisComparison';
import { PerformanceMarketingSection } from './PerformanceMarketing';
import { AnalysisOverview } from './AnalysisOverview';
import { UpgradePrompt } from './UpgradePrompt';

interface ResultCardProps {
  result: AnalysisResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const { data: session } = useSession();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    consentTest: false,
    cookieBanner: false,
    googleConsentMode: false,
    tracking: false,
    ecommerce: false,
    thirdParty: false,
    cookies: false,
    gdpr: false,
    dma: false,
    issues: true, // Issues bleiben offen da wichtig
  });

  const isLoggedIn = !!session?.user;
  const sessionUser = session?.user as (typeof session.user & {
    subscription?: { plan?: string };
    usageLimits?: { plan?: string };
  }) | undefined;
  const plan = sessionUser?.subscription?.plan
    || sessionUser?.usageLimits?.plan
    || 'free';
  const showFullAnalysis = isLoggedIn;
  const canUseAI = isLoggedIn;
  const canExportPdf = isLoggedIn;

  // Cookie-Filter und Sortierung
  const [cookieFilter, setCookieFilter] = useState<string>('all');
  const [cookieSearch, setCookieSearch] = useState('');
  const cookieSort: 'name' | 'category' | 'lifetime' = 'category';

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Gefilterte und sortierte Cookies
  const filteredCookies = result.cookies
    .filter(c => {
      if (cookieFilter !== 'all' && c.category !== cookieFilter) return false;
      if (cookieSearch && !c.name.toLowerCase().includes(cookieSearch.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (cookieSort === 'name') return a.name.localeCompare(b.name);
      if (cookieSort === 'category') return (a.category || '').localeCompare(b.category || '');
      if (cookieSort === 'lifetime') return (b.lifetimeDays || 0) - (a.lifetimeDays || 0);
      return 0;
    });
  const trackingItems = buildTrackingItems(result);

  return (
    <div className="mt-2 space-y-3">
      {/* New Visual Overview Dashboard */}
      <AnalysisOverview result={result} />

      {!showFullAnalysis && (
        <>
          <FreeSummary result={result} />
          <UpgradePrompt
            type="feature-unavailable"
            plan={plan}
            message="Im Free-Plan siehst du nur den Überblick. Upgrade auf Pro für die vollständige Analyse."
            showDismiss={false}
          />
        </>
      )}

      {showFullAnalysis && (
        <>
      {/* Cookie Consent Test */}
      {result.cookieConsentTest && (
        <Section
          title="Consent Test"
          icon={<Shield className="w-4 h-4" />}
          status={
            result.cookieConsentTest.analysis.consentWorksProperly &&
            result.cookieConsentTest.analysis.rejectWorksProperly
          }
          expanded={expandedSections.consentTest}
          onToggle={() => toggleSection('consentTest')}
          statusColor={
            result.cookieConsentTest.analysis.trackingBeforeConsent
              ? 'text-red-400'
              : result.cookieConsentTest.analysis.consentWorksProperly &&
                result.cookieConsentTest.analysis.rejectWorksProperly
              ? 'text-green-400'
              : 'text-yellow-400'
          }
          sectionName="Cookie-Consent Test"
          sectionData={result.cookieConsentTest}
          fullAnalysis={result}
        >
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <ConsentTestPhase
                phase="Vorher"
                cookieCount={result.cookieConsentTest.beforeConsent.cookieCount}
                trackingFound={result.cookieConsentTest.beforeConsent.trackingCookiesFound}
                status={!result.cookieConsentTest.beforeConsent.trackingCookiesFound ? 'good' : 'bad'}
              />
              <ConsentTestPhase
                phase="Akzeptiert"
                cookieCount={result.cookieConsentTest.afterAccept.cookieCount}
                newCookies={result.cookieConsentTest.afterAccept.newCookies.length}
                status={result.cookieConsentTest.afterAccept.clickSuccessful ? 'good' : 'neutral'}
              />
              <ConsentTestPhase
                phase="Abgelehnt"
                cookieCount={result.cookieConsentTest.afterReject.cookieCount}
                newCookies={result.cookieConsentTest.afterReject.newCookies.length}
                status={
                  result.cookieConsentTest.afterReject.clickSuccessful &&
                  result.cookieConsentTest.afterReject.newCookies.filter(
                    c => c.category === 'marketing' || c.category === 'analytics'
                  ).length === 0 ? 'good' : result.cookieConsentTest.afterReject.buttonFound ? 'bad' : 'neutral'
                }
              />
            </div>
            
            {result.cookieConsentTest.analysis.trackingBeforeConsent && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                ⚠️ Tracking vor Consent erkannt - DSGVO-Verstoß
              </div>
            )}
            
            {/* NEU: Anzeige der Reject-Methode */}
            {result.cookieConsentTest.afterReject.rejectMethod && result.cookieConsentTest.afterReject.rejectMethod !== 'unknown' && (
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300">
                ℹ️ Ablehnung via: {
                  result.cookieConsentTest.afterReject.rejectMethod === 'essential-only' ? '"Nur Essenzielle" Button' :
                  result.cookieConsentTest.afterReject.rejectMethod === 'save-button' ? '"Speichern" Button' :
                  result.cookieConsentTest.afterReject.rejectMethod === 'direct' ? 'Direkter Ablehnen-Button' :
                  'Unbekannt'
                }
                {result.cookieConsentTest.afterReject.buttonText && (
                  <span className="ml-1 opacity-70">({result.cookieConsentTest.afterReject.buttonText.substring(0, 30)}...)</span>
                )}
              </div>
            )}
            
            {/* Marketing korrekt abgelehnt */}
            {result.cookieConsentTest.analysis.marketingRejectedProperly && result.cookieConsentTest.afterReject.clickSuccessful && (
              <div className="p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400">
                ✅ Marketing-Cookies wurden erfolgreich abgelehnt
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Cookie Banner Section */}
      <Section
        title="Cookie Banner"
        icon={<Cookie className="w-4 h-4" />}
        status={result.cookieBanner.detected}
        expanded={expandedSections.cookieBanner}
        onToggle={() => toggleSection('cookieBanner')}
        sectionName="Cookie Banner"
        sectionData={result.cookieBanner}
        fullAnalysis={result}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <StatusItem label="Erkannt" value={result.cookieBanner.detected} />
          <StatusItem label="Provider" value={result.cookieBanner.provider || '?'} isText />
          <StatusItem label="Akzeptieren" value={result.cookieBanner.hasAcceptButton} />
          <StatusItem label="Ablehnen" value={result.cookieBanner.hasRejectButton} />
          <StatusItem label="Einstellungen" value={result.cookieBanner.hasSettingsOption} />
          <StatusItem label="Blockiert" value={result.cookieBanner.blocksContent} invertColor />
          {/* NEU: hasEssentialSaveButton anzeigen */}
          {result.cookieBanner.hasEssentialSaveButton && (
            <StatusItem label="Nur Essenzielle" value={true} />
          )}
        </div>
      </Section>

      {/* Google Consent Mode Section */}
      <Section
        title={`Consent Mode ${result.googleConsentMode.version || ''}`}
        icon={<Shield className="w-4 h-4" />}
        status={result.googleConsentMode.detected}
        expanded={expandedSections.googleConsentMode}
        onToggle={() => toggleSection('googleConsentMode')}
        sectionName="Google Consent Mode"
        sectionData={result.googleConsentMode}
        fullAnalysis={result}
      >
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatusItem label="Erkannt" value={result.googleConsentMode.detected} />
            <StatusItem label="Version" value={result.googleConsentMode.version || '?'} isText highlight={result.googleConsentMode.version === 'v2'} />
            <StatusItem label="Update" value={result.googleConsentMode.updateConsent?.detected || false} />
            <StatusItem label="Wait" value={result.googleConsentMode.waitForUpdate?.detected || false} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(result.googleConsentMode.parameters).map(([key, value]) => (
              <span key={key} className={`px-2 py-1 rounded text-xs ${value ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                {key}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* E-Commerce Section */}
      {result.dataLayerAnalysis?.ecommerce?.detected && (
        <Section
          title="E-Commerce Tracking"
          icon={<ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />}
          status={result.dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue}
          expanded={expandedSections.ecommerce}
          onToggle={() => toggleSection('ecommerce')}
          statusColor={
            result.dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue
              ? 'text-green-400'
              : 'text-yellow-400'
          }
          sectionName="E-Commerce Tracking"
          sectionData={result.dataLayerAnalysis.ecommerce}
          fullAnalysis={result}
        >
          <div className="space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <StatusItem
                label="Plattform"
                value={result.dataLayerAnalysis.ecommerce.platform?.toUpperCase() || 'Unbekannt'}
                isText
              />
              <StatusItem
                label="Wertübergabe"
                value={result.dataLayerAnalysis.ecommerce.valueTracking.hasTransactionValue}
              />
              <StatusItem
                label="Währung"
                value={result.dataLayerAnalysis.ecommerce.valueTracking.hasCurrency}
              />
              <StatusItem
                label="Produktdaten"
                value={result.dataLayerAnalysis.ecommerce.valueTracking.hasItemData}
              />
            </div>

            {result.dataLayerAnalysis.ecommerce.events.length > 0 && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400 mb-2">Erkannte Events:</p>
                <div className="flex flex-wrap gap-2">
                  {result.dataLayerAnalysis.ecommerce.events.map((event) => (
                    <span
                      key={event.name}
                      className={`px-2 py-1 rounded text-xs ${
                        event.hasValue
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                      title={event.hasValue ? 'Mit Wertübergabe' : 'Ohne Wertübergabe'}
                    >
                      {event.name}
                      {event.hasValue && ' ✓'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.dataLayerAnalysis.ecommerce.valueTracking.missingRecommended.length > 0 && (
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-400">
                  Fehlende Parameter: {result.dataLayerAnalysis.ecommerce.valueTracking.missingRecommended.join(', ')}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Tracking Tags Section */}
      <Section
        title="Tracking Tags"
        icon={<Tag className="w-4 h-4" />}
        status={trackingItems.some((item) => item.detected) || result.trackingTags.serverSideTracking?.detected}
        expanded={expandedSections.tracking}
        onToggle={() => toggleSection('tracking')}
        sectionName="Tracking Tags"
        sectionData={result.trackingTags}
        fullAnalysis={result}
      >
        <div className="space-y-2 pt-1">
          {trackingItems.map((item) => (
            <TrackingItem
              key={item.name}
              name={item.name}
              detected={item.detected}
              identifier={item.identifier}
              badge={item.badge}
              extraCount={item.extraCount}
              confidence={item.confidence}
              evidence={item.evidence}
            />
          ))}
          
          {result.trackingTags.serverSideTracking?.detected && (
            <div className="space-y-2 pt-2 border-t border-slate-700/50 mt-2">
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Server-Side:</span>
                {result.trackingTags.serverSideTracking.summary.hasServerSideGTM && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">sGTM</span>}
                {result.trackingTags.serverSideTracking.summary.hasMetaCAPI && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">CAPI</span>}
                {result.trackingTags.serverSideTracking.summary.hasFirstPartyProxy && <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">1st-Party Proxy</span>}
              </div>

              <div className="space-y-1.5">
                {result.trackingTags.serverSideTracking.indicators.map((indicator) => (
                  <div key={`${indicator.type}-${indicator.description}`} className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-200">{indicator.description}</span>
                      <ConfidenceBadge confidence={indicator.confidence} />
                    </div>
                    {indicator.evidence.length > 0 && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        Basis: {indicator.evidence.slice(0, 3).join(' | ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Third-Party Domains */}
      {result.thirdPartyDomains && (
        <Section
          title={`Third-Party Domains (${result.thirdPartyDomains.totalCount})`}
          icon={<Globe2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          status={result.thirdPartyDomains.totalCount > 0}
          expanded={expandedSections.thirdParty}
          onToggle={() => toggleSection('thirdParty')}
          sectionName="Third-Party Domains"
          sectionData={result.thirdPartyDomains}
          fullAnalysis={result}
        >
          <div className="space-y-2 sm:space-y-3">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="p-2 bg-slate-800 rounded text-center">
                <p className="text-xs text-slate-400">Advertising</p>
                <p className="text-lg font-bold text-red-400">{result.thirdPartyDomains.categories.advertising}</p>
              </div>
              <div className="p-2 bg-slate-800 rounded text-center">
                <p className="text-xs text-slate-400">Analytics</p>
                <p className="text-lg font-bold text-yellow-400">{result.thirdPartyDomains.categories.analytics}</p>
              </div>
              <div className="p-2 bg-slate-800 rounded text-center">
                <p className="text-xs text-slate-400">Andere</p>
                <p className="text-lg font-bold text-slate-300">
                  {result.thirdPartyDomains.categories.social + 
                   result.thirdPartyDomains.categories.cdn + 
                   result.thirdPartyDomains.categories.functional}
                </p>
              </div>
            </div>

            {result.thirdPartyDomains.riskAssessment.highRiskDomains.length > 0 && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-400">
                  ⚠️ Hochrisiko: {result.thirdPartyDomains.riskAssessment.highRiskDomains.join(', ')}
                </p>
              </div>
            )}

            <div className="max-h-32 overflow-y-auto space-y-1">
              {result.thirdPartyDomains.domains.slice(0, 15).map((domain) => (
                <div key={domain.domain} className="flex items-center justify-between text-xs p-1.5 bg-slate-800/50 rounded">
                  <span className="text-slate-300 truncate max-w-[200px]">{domain.domain}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      domain.category === 'advertising' ? 'bg-red-500/20 text-red-400' :
                      domain.category === 'analytics' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-600 text-slate-400'
                    }`}>
                      {domain.category}
                    </span>
                    {domain.isEUBased === false && (
                      <span className="text-orange-400" title="Nicht EU">🌍</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Cookies Section - Compact */}
      <Section
        title={`Cookies (${result.cookies.length})`}
        icon={<BarChart3 className="w-4 h-4" />}
        status={result.cookies.length > 0}
        expanded={expandedSections.cookies}
        onToggle={() => toggleSection('cookies')}
        sectionName="Cookies"
        sectionData={{ cookies: result.cookies, count: result.cookies.length }}
        fullAnalysis={result}
      >
        <div className="space-y-3 pt-1">
          {/* Cookie Categories Summary - Compact */}
          <div className="flex flex-wrap gap-2">
            <CookieCategorySummary category="Notw." count={result.cookies.filter((c) => c.category === 'necessary').length} color="bg-green-500" />
            <CookieCategorySummary category="Analytics" count={result.cookies.filter((c) => c.category === 'analytics').length} color="bg-yellow-500" />
            <CookieCategorySummary category="Marketing" count={result.cookies.filter((c) => c.category === 'marketing').length} color="bg-red-500" />
            <CookieCategorySummary category="Andere" count={result.cookies.filter((c) => c.category === 'functional' || c.category === 'unknown').length} color="bg-slate-500" />
          </div>

          {/* Filter Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                type="text"
                placeholder="Suchen..."
                value={cookieSearch}
                onChange={(e) => setCookieSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-200"
              />
            </div>
            <select
              value={cookieFilter}
              onChange={(e) => setCookieFilter(e.target.value)}
              className="px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-200"
            >
              <option value="all">Alle</option>
              <option value="marketing">Marketing</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>

          {/* Cookie List */}
          <div className="max-h-32 overflow-y-auto space-y-1">
            {filteredCookies.slice(0, 10).map((cookie, index) => (
              <CookieItem key={index} cookie={cookie} />
            ))}
            {filteredCookies.length > 10 && (
              <p className="text-xs text-slate-500 text-center py-1.5">+{filteredCookies.length - 10} weitere</p>
            )}
          </div>
        </div>
      </Section>

      {/* GDPR Checklist */}
      {result.gdprChecklist && (
        <Section
          title={`DSGVO-Checkliste (${result.gdprChecklist.score}%)`}
          icon={<Scale className="w-4 h-4 sm:w-5 sm:h-5" />}
          status={result.gdprChecklist.score >= 70}
          expanded={expandedSections.gdpr}
          onToggle={() => toggleSection('gdpr')}
          statusColor={
            result.gdprChecklist.score >= 80 ? 'text-green-400' :
            result.gdprChecklist.score >= 50 ? 'text-yellow-400' :
            'text-red-400'
          }
          sectionName="DSGVO-Checkliste"
          sectionData={result.gdprChecklist}
          fullAnalysis={result}
        >
          <div className="space-y-2 sm:space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-center">
              <div className="p-2 bg-green-500/10 rounded">
                <p className="text-lg font-bold text-green-400">{result.gdprChecklist.summary.passed}</p>
                <p className="text-[10px] text-slate-400">Bestanden</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded">
                <p className="text-lg font-bold text-red-400">{result.gdprChecklist.summary.failed}</p>
                <p className="text-[10px] text-slate-400">Fehler</p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded">
                <p className="text-lg font-bold text-yellow-400">{result.gdprChecklist.summary.warnings}</p>
                <p className="text-[10px] text-slate-400">Warnungen</p>
              </div>
              <div className="p-2 bg-slate-700/50 rounded">
                <p className="text-lg font-bold text-slate-400">{result.gdprChecklist.summary.notApplicable}</p>
                <p className="text-[10px] text-slate-400">N/A</p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {result.gdprChecklist.checks
                .filter(c => c.status !== 'not_applicable')
                .map((check) => (
                <div key={check.id} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded">
                  {check.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                  {check.status === 'failed' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 truncate">{check.title}</p>
                    {check.details && <p className="text-[10px] text-slate-500 truncate">{check.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* DMA Check */}
      {result.dmaCheck?.applicable && (
        <Section
          title="DMA-Compliance"
          icon={<FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
          status={result.dmaCheck.summary.nonCompliant === 0}
          expanded={expandedSections.dma}
          onToggle={() => toggleSection('dma')}
          sectionName="DMA-Compliance"
          sectionData={result.dmaCheck}
          fullAnalysis={result}
        >
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-wrap gap-2">
              {result.dmaCheck.gatekeepersDetected.map((gk) => (
                <span key={gk} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                  {gk}
                </span>
              ))}
            </div>

            {result.dmaCheck.checks.map((check) => (
              <div key={check.id} className="p-2 bg-slate-800/50 rounded">
                <div className="flex items-center gap-2">
                  {check.status === 'compliant' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  {check.status === 'non_compliant' && <XCircle className="w-4 h-4 text-red-400" />}
                  {check.status === 'requires_review' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                  <span className="text-xs text-slate-300">{check.gatekeeper}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{check.details}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Issues Section */}
      {result.issues.length > 0 && (
        <Section
          title={`Probleme (${result.issues.length})`}
          icon={<AlertTriangle className="w-4 h-4" />}
          status={false}
          expanded={expandedSections.issues}
          onToggle={() => toggleSection('issues')}
          statusColor="text-yellow-400"
          sectionName="Probleme & Hinweise"
          sectionData={{ issues: result.issues, count: result.issues.length }}
          fullAnalysis={result}
        >
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {result.issues.map((issue, index) => (
              <IssueItem key={index} issue={issue} />
            ))}
          </div>
        </Section>
      )}

      {/* Quick Actions */}
      <QuickActions result={result} />

      {/* Performance Marketing Analyse */}
      <PerformanceMarketingSection
        eventQualityScore={result.eventQualityScore}
        funnelValidation={result.funnelValidation}
        cookieLifetimeAudit={result.cookieLifetimeAudit}
        unusedPotential={result.unusedPotential}
        roasQuality={result.roasQuality}
        conversionTrackingAudit={result.conversionTrackingAudit}
        campaignAttribution={result.campaignAttribution}
        gtmAudit={result.gtmAudit}
        privacySandbox={result.privacySandbox}
        ecommerceDeepDive={result.ecommerceDeepDive}
      />

      {/* Analyse-Vergleich */}
      <AnalysisComparison currentResult={result} />

      {/* KI-Analyse */}
      {canUseAI ? (
        <AIAnalysis result={result} />
      ) : (
        <UpgradePrompt
          type="feature-unavailable"
          plan={plan}
          message="KI-Analyse ist nur im Pro-Plan verfügbar."
          showDismiss={true}
        />
      )}

      {/* Actions - Compact */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={canExportPdf ? () => exportAnalysisToPDF(result) : undefined}
          disabled={!canExportPdf}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
            canExportPdf
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
              : 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
          title={canExportPdf ? 'PDF exportieren' : 'PDF-Export nur im Pro-Plan verfügbar'}
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </button>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Website
        </a>
      </div>

        </>
      )}
    </div>
  );
}

function FreeSummary({ result }: { result: AnalysisResult }) {
  const topIssues = getTopIssues(result.issues);
  const errorCount = result.issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = result.issues.filter((issue) => issue.severity === 'warning').length;
  const consentModeLabel = result.googleConsentMode.detected
    ? result.googleConsentMode.version
      ? `Consent Mode ${result.googleConsentMode.version}`
      : 'Consent Mode erkannt'
    : 'Nicht erkannt';

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">Kurz-Zusammenfassung</span>
        <span className="text-xs text-slate-500">Free-Überblick</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-900/50 rounded-lg p-2">
          <p className="text-slate-500">Cookie-Banner</p>
          <p className="text-slate-200">{result.cookieBanner.detected ? 'Erkannt' : 'Nicht erkannt'}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2">
          <p className="text-slate-500">Consent</p>
          <p className="text-slate-200">{consentModeLabel}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2">
          <p className="text-slate-500">Probleme</p>
          <p className="text-slate-200">{result.issues.length}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2">
          <p className="text-slate-500">Third-Party</p>
          <p className="text-slate-200">{result.thirdPartyDomains?.totalCount || 0}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-400">
          Top-Issues: {errorCount} Fehler · {warningCount} Warnungen
        </div>
        {topIssues.length === 0 ? (
          <div className="text-xs text-slate-500">Keine kritischen Probleme gefunden.</div>
        ) : (
          <ul className="space-y-2">
            {topIssues.map((issue, index) => (
              <li key={`${issue.category}-${index}`} className="flex gap-2 text-xs text-slate-300">
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    issue.severity === 'error'
                      ? 'bg-red-400'
                      : issue.severity === 'warning'
                      ? 'bg-yellow-400'
                      : 'bg-slate-400'
                  }`}
                />
                <div>
                  <p className="font-medium text-slate-200">{issue.title}</p>
                  <p className="text-slate-500">{issue.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function getTopIssues(issues: Issue[]): Issue[] {
  const severityOrder: Record<Issue['severity'], number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  return [...issues]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 3);
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
  sectionName,
  sectionData,
  fullAnalysis,
}: {
  title: string;
  icon: React.ReactNode;
  status: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  statusColor?: string;
  sectionName?: string;
  sectionData?: unknown;
  fullAnalysis?: AnalysisResult;
}) {
  void sectionData;
  void fullAnalysis;

  return (
    <div className="bg-slate-800/40 rounded-lg border border-slate-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2.5 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 ${statusColor || (status ? 'text-green-400' : 'text-slate-500')}`}>
            {icon}
          </span>
          <span className="font-medium text-slate-200 text-sm sm:text-base truncate">{title}</span>
          {sectionName && (
            <SectionInfoPopup
              sectionName={sectionName}
              trigger={<HelpCircle className="w-3 h-3" />}
            />
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!statusColor && (
            status ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500" />
            )
          )}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>
      {expanded && <div className="px-3 pb-3 border-t border-slate-700/30">{children}</div>}
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
    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700/30 text-xs">
      <span className="text-slate-400 font-medium">{label}</span>
      {isText ? (
        <span className={`font-medium ${highlight ? 'text-green-400' : 'text-slate-300'}`}>
          {value}
        </span>
      ) : (
        <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {value ? '✓' : '✗'}
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
  confidence,
  evidence,
}: {
  name: string;
  detected: boolean;
  identifier?: string;
  badge?: string;
  extraCount?: number;
  confidence?: 'high' | 'medium' | 'low';
  evidence?: string[];
}) {
  return (
    <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {detected ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span className={`text-xs ${detected ? 'text-slate-200' : 'text-slate-500'}`}>{name}</span>
          {badge && (
            <span className="px-1 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] rounded">
              {badge}
            </span>
          )}
          {detected && confidence && <ConfidenceBadge confidence={confidence} />}
        </div>
        {identifier && (
          <span className="text-xs text-slate-400 font-mono text-right">
            {identifier}{extraCount ? ` +${extraCount}` : ''}
          </span>
        )}
      </div>
      {detected && evidence && evidence.length > 0 && (
        <div className="text-[11px] text-slate-500 mt-1">
          Basis: {evidence.slice(0, 3).join(' | ')}
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const tone =
    confidence === 'high'
      ? 'bg-green-500/15 text-green-300'
      : confidence === 'medium'
        ? 'bg-yellow-500/15 text-yellow-300'
        : 'bg-slate-600/70 text-slate-300';

  const label =
    confidence === 'high' ? 'hoch' : confidence === 'medium' ? 'mittel' : 'niedrig';

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${tone}`}>
      {`Sicherheit: ${label}`}
    </span>
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
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/30">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-slate-400">{category}</span>
      <span className="text-xs font-medium text-slate-300">{count}</span>
    </div>
  );
}

function CookieItem({ cookie }: { cookie: CookieResult }) {
  return (
    <div className="flex items-center justify-between text-xs p-1.5 bg-slate-800/30 rounded border border-slate-700/20">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-slate-300 font-mono truncate max-w-[140px]">{cookie.name}</span>
        {cookie.isThirdParty && <span className="text-blue-400 text-[10px]">3rd</span>}
      </div>
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
        cookie.category === 'necessary' ? 'bg-green-500/20 text-green-400' :
        cookie.category === 'analytics' ? 'bg-yellow-500/20 text-yellow-400' :
        cookie.category === 'marketing' ? 'bg-red-500/20 text-red-400' :
        'bg-slate-600 text-slate-400'
      }`}>
        {cookie.category === 'necessary' ? 'N' : cookie.category === 'analytics' ? 'A' : cookie.category === 'marketing' ? 'M' : '?'}
      </span>
    </div>
  );
}

function ConsentTestPhase({
  phase,
  cookieCount,
  trackingFound,
  newCookies,
  status,
}: {
  phase: string;
  cookieCount: number;
  trackingFound?: boolean;
  newCookies?: number;
  buttonFound?: boolean;
  clickSuccessful?: boolean;
  status: 'good' | 'bad' | 'neutral';
}) {
  return (
    <div className={`p-2.5 rounded-lg border-2 text-center ${
      status === 'good' ? 'bg-green-500/10 border-green-500/30' :
      status === 'bad' ? 'bg-red-500/10 border-red-500/30' :
      'bg-slate-700/50 border-slate-600'
    }`}>
      <p className="text-xs text-slate-400 font-medium mb-1">{phase}</p>
      <p className="text-base font-bold text-slate-200">{cookieCount}</p>
      {trackingFound !== undefined && (
        <p className={`text-xs mt-1 ${trackingFound ? 'text-red-400' : 'text-green-400'}`}>
          {trackingFound ? '⚠️' : '✓'}
        </p>
      )}
      {newCookies !== undefined && newCookies > 0 && (
        <p className="text-xs text-slate-400 mt-1">+{newCookies}</p>
      )}
    </div>
  );
}

function IssueItem({ issue }: { issue: Issue }) {
  const getIcon = () => {
    switch (issue.severity) {
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
      case 'info':
        return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
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
    <div className={`p-2 bg-slate-800/50 rounded border-l-2 ${getBorderColor()}`}>
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-200">{issue.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{issue.description}</p>
          {issue.recommendation && (
            <p className="text-[10px] text-indigo-400 mt-1">💡 {issue.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

type TrackingDisplayItem = {
  name: string;
  detected: boolean;
  identifier?: string;
  badge?: string;
  extraCount?: number;
  confidence?: 'high' | 'medium' | 'low';
  evidence?: string[];
};

function buildTrackingItems(result: AnalysisResult): TrackingDisplayItem[] {
  const items: TrackingDisplayItem[] = [
    {
      name: 'GA4',
      detected: result.trackingTags.googleAnalytics.detected,
      identifier: result.trackingTags.googleAnalytics.measurementIds?.[0],
      badge: result.trackingTags.googleAnalytics.version,
      extraCount: Math.max(0, result.trackingTags.googleAnalytics.measurementIds.length - 1) || undefined,
      confidence: result.trackingTags.googleAnalytics.confidence,
      evidence: result.trackingTags.googleAnalytics.evidence,
    },
    {
      name: 'GTM',
      detected: result.trackingTags.googleTagManager.detected,
      identifier: result.trackingTags.googleTagManager.containerId,
      extraCount: Math.max(0, result.trackingTags.googleTagManager.containerIds.length - 1) || undefined,
      confidence: result.trackingTags.googleTagManager.confidence,
      evidence: result.trackingTags.googleTagManager.evidence,
    },
    {
      name: 'Meta Pixel',
      detected: result.trackingTags.metaPixel.detected,
      identifier: result.trackingTags.metaPixel.pixelId,
      extraCount: Math.max(0, result.trackingTags.metaPixel.pixelIds.length - 1) || undefined,
      confidence: result.trackingTags.metaPixel.confidence,
      evidence: result.trackingTags.metaPixel.evidence,
    },
  ];

  if (result.trackingTags.googleAdsConversion.detected) {
    items.push({
      name: 'Google Ads',
      detected: true,
      identifier: result.trackingTags.googleAdsConversion.conversionId,
      extraCount: Math.max(0, result.trackingTags.googleAdsConversion.conversionIds.length - 1) || undefined,
      confidence: result.trackingTags.googleAdsConversion.confidence,
      evidence: result.trackingTags.googleAdsConversion.evidence,
    });
  }

  const optionalItems: TrackingDisplayItem[] = [
    {
      name: 'LinkedIn',
      detected: result.trackingTags.linkedInInsight.detected,
      identifier: result.trackingTags.linkedInInsight.partnerId,
      confidence: result.trackingTags.linkedInInsight.confidence,
      evidence: result.trackingTags.linkedInInsight.evidence,
    },
    {
      name: 'TikTok',
      detected: result.trackingTags.tiktokPixel.detected,
      identifier: result.trackingTags.tiktokPixel.pixelId,
      confidence: result.trackingTags.tiktokPixel.confidence,
      evidence: result.trackingTags.tiktokPixel.evidence,
    },
    {
      name: 'Pinterest',
      detected: result.trackingTags.pinterestTag.detected,
      identifier: result.trackingTags.pinterestTag.tagId,
      confidence: result.trackingTags.pinterestTag.confidence,
      evidence: result.trackingTags.pinterestTag.evidence,
    },
    {
      name: 'Snapchat',
      detected: result.trackingTags.snapchatPixel.detected,
      identifier: result.trackingTags.snapchatPixel.pixelId,
      confidence: result.trackingTags.snapchatPixel.confidence,
      evidence: result.trackingTags.snapchatPixel.evidence,
    },
    {
      name: 'X/Twitter',
      detected: result.trackingTags.twitterPixel.detected,
      identifier: result.trackingTags.twitterPixel.pixelId,
      confidence: result.trackingTags.twitterPixel.confidence,
      evidence: result.trackingTags.twitterPixel.evidence,
    },
    {
      name: 'Reddit',
      detected: result.trackingTags.redditPixel.detected,
      identifier: result.trackingTags.redditPixel.pixelId,
      confidence: result.trackingTags.redditPixel.confidence,
      evidence: result.trackingTags.redditPixel.evidence,
    },
    {
      name: 'Bing Ads',
      detected: result.trackingTags.bingAds.detected,
      identifier: result.trackingTags.bingAds.tagId,
      confidence: result.trackingTags.bingAds.confidence,
      evidence: result.trackingTags.bingAds.evidence,
    },
    {
      name: 'Criteo',
      detected: result.trackingTags.criteo.detected,
      identifier: result.trackingTags.criteo.accountId,
      confidence: result.trackingTags.criteo.confidence,
      evidence: result.trackingTags.criteo.evidence,
    },
    ...result.trackingTags.other.map((entry) => ({
      name: entry.name,
      detected: entry.detected,
      identifier: entry.identifier,
      confidence: entry.confidence,
      evidence: entry.evidence,
    })),
  ];

  return [...items, ...optionalItems.filter((item) => item.detected)];
}
