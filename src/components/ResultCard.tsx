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
  Download,
  Server,
  ShoppingCart,
  Globe2,
  Scale,
  FileCheck,
  Search,
  Filter,
  ArrowUpDown,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { AnalysisResult, Issue, CookieResult } from '@/types';
import { AIAnalysis } from './AIAnalysis';
import { exportAnalysisToPDF } from '@/lib/pdf/exportToPdf';
import { SectionInfoPopup } from './SectionInfoPopup';
import { QuickActions } from './QuickActions';
import { AnalysisComparison } from './AnalysisComparison';
import { PerformanceMarketingSection } from './PerformanceMarketing';

interface ResultCardProps {
  result: AnalysisResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cookieBanner: true,
    googleConsentMode: true,
    tracking: false,
    ecommerce: false,
    thirdParty: false,
    cookies: false,
    gdpr: false,
    dma: false,
    issues: true,
  });

  // Cookie-Filter und Sortierung
  const [cookieFilter, setCookieFilter] = useState<string>('all');
  const [cookieSearch, setCookieSearch] = useState('');
  const [cookieSort, setCookieSort] = useState<'name' | 'category' | 'lifetime'>('category');

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
            {result.gdprChecklist && (
              <p className="text-xs text-slate-500 mt-1">
                DSGVO: {result.gdprChecklist.score}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cookie Consent Test */}
      {result.cookieConsentTest && (
        <Section
          title="Cookie-Consent Test"
          icon={<Shield className="w-5 h-5" />}
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
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <ConsentTestPhase
                phase="Vor Consent"
                cookieCount={result.cookieConsentTest.beforeConsent.cookieCount}
                trackingFound={result.cookieConsentTest.beforeConsent.trackingCookiesFound}
                status={!result.cookieConsentTest.beforeConsent.trackingCookiesFound ? 'good' : 'bad'}
              />
              <ConsentTestPhase
                phase="Nach Akzeptieren"
                cookieCount={result.cookieConsentTest.afterAccept.cookieCount}
                newCookies={result.cookieConsentTest.afterAccept.newCookies.length}
                buttonFound={result.cookieConsentTest.afterAccept.buttonFound}
                clickSuccessful={result.cookieConsentTest.afterAccept.clickSuccessful}
                status={result.cookieConsentTest.afterAccept.clickSuccessful ? 'good' : 'neutral'}
              />
              <ConsentTestPhase
                phase="Nach Ablehnen"
                cookieCount={result.cookieConsentTest.afterReject.cookieCount}
                newCookies={result.cookieConsentTest.afterReject.newCookies.length}
                buttonFound={result.cookieConsentTest.afterReject.buttonFound}
                clickSuccessful={result.cookieConsentTest.afterReject.clickSuccessful}
                status={
                  result.cookieConsentTest.afterReject.clickSuccessful &&
                  result.cookieConsentTest.afterReject.newCookies.filter(
                    c => c.category === 'marketing' || c.category === 'analytics'
                  ).length === 0
                    ? 'good'
                    : result.cookieConsentTest.afterReject.buttonFound
                    ? 'bad'
                    : 'neutral'
                }
              />
            </div>
            
            {result.cookieConsentTest.analysis.trackingBeforeConsent && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 font-medium">⚠️ Tracking vor Einwilligung erkannt!</p>
                <p className="text-xs text-red-400/80 mt-1">
                  Dies ist ein DSGVO-Verstoß. Cookies dürfen erst nach Einwilligung gesetzt werden.
                </p>
              </div>
            )}
            
            {result.cookieConsentTest.analysis.consentWorksProperly &&
              result.cookieConsentTest.analysis.rejectWorksProperly &&
              !result.cookieConsentTest.analysis.trackingBeforeConsent && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 font-medium">✅ Cookie-Consent funktioniert korrekt</p>
                <p className="text-xs text-green-400/80 mt-1">
                  Der Banner reagiert korrekt auf Akzeptieren und Ablehnen.
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Cookie Banner Section */}
      <Section
        title="Cookie Banner"
        icon={<Cookie className="w-5 h-5" />}
        status={result.cookieBanner.detected}
        expanded={expandedSections.cookieBanner}
        onToggle={() => toggleSection('cookieBanner')}
        sectionName="Cookie Banner"
        sectionData={result.cookieBanner}
        fullAnalysis={result}
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
            label="Essenzielle auswählen"
            value={result.cookieBanner.hasEssentialSaveButton ?? false}
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
        sectionName="Google Consent Mode"
        sectionData={result.googleConsentMode}
        fullAnalysis={result}
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
            <StatusItem
              label="Update-Funktion"
              value={result.googleConsentMode.updateConsent?.detected || false}
            />
            <StatusItem
              label="Wait for Update"
              value={result.googleConsentMode.waitForUpdate?.detected || false}
            />
          </div>
          
          {result.googleConsentMode.updateConsent?.detected && (
            <div className="p-2 bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-400">
                Update-Trigger: <span className="text-slate-300">{result.googleConsentMode.updateConsent.updateTrigger || 'Unbekannt'}</span>
              </p>
            </div>
          )}

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

      {/* E-Commerce Section */}
      {result.dataLayerAnalysis?.ecommerce?.detected && (
        <Section
          title="E-Commerce Tracking"
          icon={<ShoppingCart className="w-5 h-5" />}
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
        icon={<Tag className="w-5 h-5" />}
        status={
          result.trackingTags.googleAnalytics.detected ||
          result.trackingTags.googleTagManager.detected ||
          result.trackingTags.metaPixel.detected
        }
        expanded={expandedSections.tracking}
        onToggle={() => toggleSection('tracking')}
        sectionName="Tracking Tags"
        sectionData={result.trackingTags}
        fullAnalysis={result}
      >
        <div className="space-y-3">
          <TrackingItem
            name="Google Analytics"
            detected={result.trackingTags.googleAnalytics.detected}
            identifier={result.trackingTags.googleAnalytics.measurementIds?.[0]}
            extraCount={
              result.trackingTags.googleAnalytics.measurementIds?.length > 1
                ? result.trackingTags.googleAnalytics.measurementIds.length - 1
                : undefined
            }
            badge={result.trackingTags.googleAnalytics.version}
          />
          <TrackingItem
            name="Google Tag Manager"
            detected={result.trackingTags.googleTagManager.detected}
            identifier={result.trackingTags.googleTagManager.containerId}
          />
          {result.trackingTags.googleAdsConversion?.detected && (
            <TrackingItem
              name="Google Ads"
              detected={true}
              identifier={result.trackingTags.googleAdsConversion.conversionId}
              badge={result.trackingTags.googleAdsConversion.hasRemarketing ? 'Remarketing' : undefined}
            />
          )}
          <TrackingItem
            name="Meta Pixel"
            detected={result.trackingTags.metaPixel.detected}
            identifier={result.trackingTags.metaPixel.pixelId}
          />
          <TrackingItem
            name="LinkedIn Insight"
            detected={result.trackingTags.linkedInInsight.detected}
            identifier={result.trackingTags.linkedInInsight.partnerId}
          />
          <TrackingItem
            name="TikTok Pixel"
            detected={result.trackingTags.tiktokPixel.detected}
            identifier={result.trackingTags.tiktokPixel.pixelId}
          />
          {result.trackingTags.pinterestTag?.detected && (
            <TrackingItem name="Pinterest Tag" detected={true} identifier={result.trackingTags.pinterestTag.tagId} />
          )}
          {result.trackingTags.snapchatPixel?.detected && (
            <TrackingItem name="Snapchat Pixel" detected={true} identifier={result.trackingTags.snapchatPixel.pixelId} />
          )}
          {result.trackingTags.twitterPixel?.detected && (
            <TrackingItem name="Twitter/X Pixel" detected={true} identifier={result.trackingTags.twitterPixel.pixelId} />
          )}
          {result.trackingTags.bingAds?.detected && (
            <TrackingItem name="Bing Ads" detected={true} identifier={result.trackingTags.bingAds.tagId} />
          )}
          {result.trackingTags.criteo?.detected && (
            <TrackingItem name="Criteo" detected={true} identifier={result.trackingTags.criteo.accountId} />
          )}
          
          {result.trackingTags.other.length > 0 && (
            <div className="border-t border-slate-700 pt-2 mt-2">
              <p className="text-xs text-slate-400 mb-2">Weitere erkannt:</p>
              <div className="flex flex-wrap gap-2">
                {result.trackingTags.other.map((tag) => (
                  <span key={tag.name} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.trackingTags.serverSideTracking.detected && (
            <div className="border-t border-slate-700 pt-2 mt-2">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                <Server className="w-3 h-3" />
                Server-Side Tracking:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.trackingTags.serverSideTracking.summary.hasServerSideGTM && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">sGTM</span>
                )}
                {result.trackingTags.serverSideTracking.summary.hasMetaCAPI && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Meta CAPI</span>
                )}
                {result.trackingTags.serverSideTracking.summary.hasCookieBridging && (
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">Cookie Bridging</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Third-Party Domains */}
      {result.thirdPartyDomains && (
        <Section
          title={`Third-Party Domains (${result.thirdPartyDomains.totalCount})`}
          icon={<Globe2 className="w-5 h-5" />}
          status={result.thirdPartyDomains.totalCount > 0}
          expanded={expandedSections.thirdParty}
          onToggle={() => toggleSection('thirdParty')}
          sectionName="Third-Party Domains"
          sectionData={result.thirdPartyDomains}
          fullAnalysis={result}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
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

      {/* Cookies Section - Erweitert */}
      <Section
        title={`Cookies (${result.cookies.length})`}
        icon={<BarChart3 className="w-5 h-5" />}
        status={result.cookies.length > 0}
        expanded={expandedSections.cookies}
        onToggle={() => toggleSection('cookies')}
        sectionName="Cookies"
        sectionData={{ cookies: result.cookies, count: result.cookies.length }}
        fullAnalysis={result}
      >
        <div className="space-y-3">
          {/* Filter und Suche */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                type="text"
                placeholder="Cookie suchen..."
                value={cookieSearch}
                onChange={(e) => setCookieSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200"
              />
            </div>
            <select
              value={cookieFilter}
              onChange={(e) => setCookieFilter(e.target.value)}
              className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200"
            >
              <option value="all">Alle</option>
              <option value="necessary">Notwendig</option>
              <option value="functional">Funktional</option>
              <option value="analytics">Analytics</option>
              <option value="marketing">Marketing</option>
              <option value="unknown">Unbekannt</option>
            </select>
            <select
              value={cookieSort}
              onChange={(e) => setCookieSort(e.target.value as any)}
              className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200"
            >
              <option value="category">Nach Kategorie</option>
              <option value="name">Nach Name</option>
              <option value="lifetime">Nach Laufzeit</option>
            </select>
          </div>

          {/* Cookie Categories Summary */}
          <div className="grid grid-cols-4 gap-2">
            <CookieCategorySummary
              category="Notwendig"
              count={result.cookies.filter((c) => c.category === 'necessary').length}
              color="bg-green-500"
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
            <CookieCategorySummary
              category="Andere"
              count={result.cookies.filter((c) => c.category === 'functional' || c.category === 'unknown').length}
              color="bg-slate-500"
            />
          </div>

          {/* Cookie List */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredCookies.map((cookie, index) => (
              <CookieItem key={index} cookie={cookie} />
            ))}
            {filteredCookies.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">Keine Cookies gefunden</p>
            )}
          </div>
        </div>
      </Section>

      {/* GDPR Checklist */}
      {result.gdprChecklist && (
        <Section
          title={`DSGVO-Checkliste (${result.gdprChecklist.score}%)`}
          icon={<Scale className="w-5 h-5" />}
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
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
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
          icon={<FileCheck className="w-5 h-5" />}
          status={result.dmaCheck.summary.nonCompliant === 0}
          expanded={expandedSections.dma}
          onToggle={() => toggleSection('dma')}
          sectionName="DMA-Compliance"
          sectionData={result.dmaCheck}
          fullAnalysis={result}
        >
          <div className="space-y-3">
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
          title={`Probleme & Hinweise (${result.issues.length})`}
          icon={<AlertTriangle className="w-5 h-5" />}
          status={false}
          expanded={expandedSections.issues}
          onToggle={() => toggleSection('issues')}
          statusColor="text-yellow-400"
          sectionName="Probleme & Hinweise"
          sectionData={{ issues: result.issues, count: result.issues.length }}
          fullAnalysis={result}
        >
          <div className="space-y-3 max-h-96 overflow-y-auto">
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
      />

      {/* Analyse-Vergleich */}
      <AnalysisComparison currentResult={result} />

      {/* KI-Analyse */}
      <AIAnalysis result={result} />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => exportAnalysisToPDF(result)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all"
        >
          <Download className="w-4 h-4" />
          PDF Export
        </button>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Website öffnen
        </a>
      </div>
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
          {sectionName && sectionData !== undefined && sectionData !== null && fullAnalysis && (
            <SectionInfoPopup
              sectionName={sectionName}
              sectionData={sectionData}
              fullAnalysis={fullAnalysis}
              trigger={<HelpCircle className="w-4 h-4" />}
            />
          )}
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

function CookieItem({ cookie }: { cookie: CookieResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800/50 rounded overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs p-2 hover:bg-slate-700/30"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-300 font-mono truncate max-w-[150px]">{cookie.name}</span>
          {cookie.isLongLived && <span className="text-orange-400" title="Lange Laufzeit">⏰</span>}
          {cookie.isThirdParty && <span className="text-blue-400" title="Third-Party">🌐</span>}
        </div>
        <div className="flex items-center gap-2">
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
          <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-2 pb-2 text-[10px] text-slate-400 space-y-1 border-t border-slate-700/50 pt-2">
          <p><span className="text-slate-500">Domain:</span> {cookie.domain}</p>
          <p><span className="text-slate-500">Laufzeit:</span> {cookie.lifetimeDays !== undefined ? `${cookie.lifetimeDays} Tage` : 'Session'}</p>
          {cookie.service && <p><span className="text-slate-500">Service:</span> {cookie.service}</p>}
          <p><span className="text-slate-500">Secure:</span> {cookie.secure ? 'Ja' : 'Nein'} | <span className="text-slate-500">HttpOnly:</span> {cookie.httpOnly ? 'Ja' : 'Nein'}</p>
        </div>
      )}
    </div>
  );
}

function ConsentTestPhase({
  phase,
  cookieCount,
  trackingFound,
  newCookies,
  buttonFound,
  clickSuccessful,
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
    <div className={`p-2 rounded-lg border ${
      status === 'good' ? 'bg-green-500/10 border-green-500/30' :
      status === 'bad' ? 'bg-red-500/10 border-red-500/30' :
      'bg-slate-700/50 border-slate-600'
    }`}>
      <p className="text-xs font-medium text-slate-300 mb-1">{phase}</p>
      <p className="text-lg font-bold text-slate-200">{cookieCount}</p>
      <p className="text-[10px] text-slate-500">Cookies</p>
      {trackingFound !== undefined && (
        <p className={`text-[10px] mt-1 ${trackingFound ? 'text-red-400' : 'text-green-400'}`}>
          {trackingFound ? '⚠️ Tracking!' : '✓ Kein Tracking'}
        </p>
      )}
      {newCookies !== undefined && (
        <p className="text-[10px] text-slate-500 mt-1">+{newCookies} neue</p>
      )}
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
