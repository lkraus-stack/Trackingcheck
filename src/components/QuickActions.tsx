'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Code,
  FileSpreadsheet,
  ClipboardList,
  Copy,
  Check,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronUp,
  Zap,
  Settings,
  FileCode,
  Table,
  Layers,
  Eye,
  Filter,
  Tag,
  ShoppingCart,
  Shield,
  FileText,
} from 'lucide-react';
import { AnalysisResult, DataLayerAnalysisResult, DataLayerEntry } from '@/types';
import {
  standardEvents,
  generateExampleCode,
  generateConsentUpdateCode,
} from '@/lib/templates/dataLayerGenerator';
import { exportAnalysisToPDF } from '@/lib/pdf/exportToPdf';

interface QuickActionsProps {
  result: AnalysisResult;
}

export function QuickActions({ result }: QuickActionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showDataLayerModal, setShowDataLayerModal] = useState(false);
  const [showDataLayerViewerModal, setShowDataLayerViewerModal] = useState(false);
  const [showWhiteLabelModal, setShowWhiteLabelModal] = useState(false);
  const overallScore = result.scoreBreakdown?.overall ?? result.score;
  const gdprScore = result.scoreBreakdown?.gdpr ?? result.gdprChecklist?.score ?? 0;

  const copyToClipboard = async (text: string, actionId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedAction(actionId);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const exportCookiesCSV = () => {
    const headers = ['Name', 'Kategorie', 'Domain', 'Laufzeit (Tage)', 'Secure', 'HttpOnly', 'SameSite', 'Service'];
    const rows = result.cookies.map(c => [
      c.name,
      c.category || 'unknown',
      c.domain,
      c.lifetimeDays?.toString() || 'Session',
      c.secure ? 'Ja' : 'Nein',
      c.httpOnly ? 'Ja' : 'Nein',
      c.sameSite || '-',
      c.service || '-',
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookies-${result.url.replace(/https?:\/\//, '').replace(/[/:]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportThirdPartyCSV = () => {
    if (!result.thirdPartyDomains) return;

    const headers = ['Domain', 'Kategorie', 'Firma', 'Land', 'EU-Sitz', 'Requests', 'Cookies gesetzt'];
    const rows = result.thirdPartyDomains.domains.map(d => [
      d.domain,
      d.category,
      d.company || '-',
      d.country || '-',
      d.isEUBased === true ? 'Ja' : d.isEUBased === false ? 'Nein' : '-',
      d.requestCount.toString(),
      d.cookiesSet.toString(),
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `third-party-${result.url.replace(/https?:\/\//, '').replace(/[/:]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getGTMPreviewUrl = () => {
    const containerId = result.trackingTags.googleTagManager.containerId;
    if (!containerId) return null;
    return `https://tagmanager.google.com/#/container/accounts/~2F${containerId}/workspaces?tab=preview&url=${encodeURIComponent(result.url)}`;
  };

  const gtmPreviewUrl = getGTMPreviewUrl();

  return (
    <div className="mt-3 sm:mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          <span className="font-medium text-slate-200 text-sm sm:text-base">Quick Actions</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Code Generator */}
          <button
            onClick={() => setShowCodeModal(true)}
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
          >
            <Code className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-200">Code Generator</p>
              <p className="text-xs text-slate-500">Consent Mode Code</p>
            </div>
          </button>

          {/* Setup Checkliste */}
          <button
            onClick={() => setShowChecklistModal(true)}
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
          >
            <ClipboardList className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-200">Setup Checkliste</p>
              <p className="text-xs text-slate-500">Zum Abhaken</p>
            </div>
          </button>

          {/* DataLayer Generator */}
          <button
            onClick={() => setShowDataLayerModal(true)}
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
          >
            <Layers className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-200">DataLayer Generator</p>
              <p className="text-xs text-slate-500">GA4 E-Commerce Events</p>
            </div>
          </button>

          {/* DataLayer Viewer - Immer anzeigen */}
          <button
            onClick={() => setShowDataLayerViewerModal(true)}
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
          >
            <Eye className={`w-5 h-5 flex-shrink-0 ${result.dataLayerAnalysis?.hasDataLayer ? 'text-sky-400' : 'text-slate-500'}`} />
            <div>
              <p className="text-sm font-medium text-slate-200">DataLayer Viewer</p>
              <p className="text-xs text-slate-500">
                {result.dataLayerAnalysis?.hasDataLayer 
                  ? `${result.dataLayerAnalysis.rawDataLayer?.length || result.dataLayerAnalysis.events.length} Einträge`
                  : 'Kein DataLayer erkannt'}
              </p>
            </div>
          </button>

          {/* Cookies Export */}
          <button
            onClick={exportCookiesCSV}
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
          >
            <Table className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-200">Cookies CSV</p>
              <p className="text-xs text-slate-500">{result.cookies.length} Cookies</p>
            </div>
          </button>

          {/* Third-Party Export */}
          {result.thirdPartyDomains && result.thirdPartyDomains.totalCount > 0 && (
            <button
              onClick={exportThirdPartyCSV}
              className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
            >
              <FileSpreadsheet className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-200">Third-Party CSV</p>
                <p className="text-xs text-slate-500">{result.thirdPartyDomains.totalCount} Domains</p>
              </div>
            </button>
          )}

          {/* GTM Preview */}
          {result.trackingTags.googleTagManager.detected && gtmPreviewUrl && (
            <a
              href={gtmPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
            >
              <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-200">GTM Preview</p>
                <p className="text-xs text-slate-500">{result.trackingTags.googleTagManager.containerId}</p>
              </div>
            </a>
          )}

          {/* Copy IDs */}
          <button
            onClick={() => {
              const ids = [];
              if (result.trackingTags.googleAnalytics.measurementId) {
                ids.push(`GA4: ${result.trackingTags.googleAnalytics.measurementId}`);
              }
              if (result.trackingTags.googleTagManager.containerId) {
                ids.push(`GTM: ${result.trackingTags.googleTagManager.containerId}`);
              }
              if (result.trackingTags.metaPixel.pixelId) {
                ids.push(`Meta: ${result.trackingTags.metaPixel.pixelId}`);
              }
              if (result.trackingTags.googleAdsConversion?.conversionId) {
                ids.push(`GAds: ${result.trackingTags.googleAdsConversion.conversionId}`);
              }
              copyToClipboard(ids.join('\n'), 'ids');
            }}
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
          >
            {copiedAction === 'ids' ? (
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : (
              <Copy className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-slate-200">Tracking IDs</p>
              <p className="text-xs text-slate-500">In Zwischenablage</p>
            </div>
          </button>

          {/* White-Label Report */}
          <button
            onClick={() => setShowWhiteLabelModal(true)}
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-colors text-left"
          >
            <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-200">Client Report</p>
              <p className="text-xs text-slate-500">White-Label PDF</p>
            </div>
          </button>
        </div>
      )}

      {/* Code Generator Modal */}
      {showCodeModal && (
        <CodeGeneratorModal
          result={result}
          onClose={() => setShowCodeModal(false)}
          onCopy={(text, id) => copyToClipboard(text, id)}
          copiedAction={copiedAction}
        />
      )}

      {/* Checklist Modal */}
      {showChecklistModal && (
        <ChecklistModal
          result={result}
          onClose={() => setShowChecklistModal(false)}
        />
      )}

      {/* DataLayer Generator Modal */}
      {showDataLayerModal && (
        <DataLayerGeneratorModal
          onClose={() => setShowDataLayerModal(false)}
          onCopy={(text, id) => copyToClipboard(text, id)}
          copiedAction={copiedAction}
        />
      )}

      {/* DataLayer Viewer Modal */}
      {showDataLayerViewerModal && (
        <DataLayerViewerModal
          dataLayerAnalysis={result.dataLayerAnalysis}
          onClose={() => setShowDataLayerViewerModal(false)}
          onCopy={(text, id) => copyToClipboard(text, id)}
          copiedAction={copiedAction}
        />
      )}

      {/* White-Label Report Modal */}
      {showWhiteLabelModal && (
        <WhiteLabelReportModal
          result={result}
          onClose={() => setShowWhiteLabelModal(false)}
        />
      )}
    </div>
  );
}

function WhiteLabelReportModal({
  result,
  onClose,
}: {
  result: AnalysisResult;
  onClose: () => void;
}) {
  const [brandName, setBrandName] = useState('');
  const [clientName, setClientName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [reportTitle, setReportTitle] = useState('Tracking Report');

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[90vw] sm:max-w-lg bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-medium text-slate-200">White-Label Report</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Report Titel</label>
            <input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
              placeholder="Tracking Report"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Agentur / Brand</label>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
              placeholder="Agenturname"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Client Name</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
              placeholder="Kundenname"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Kontakt</label>
            <input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
              placeholder="E-Mail / Telefon"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              exportAnalysisToPDF(result, {
                brandName: brandName.trim() || undefined,
                clientName: clientName.trim() || undefined,
                contactInfo: contactInfo.trim() || undefined,
                reportTitle: reportTitle.trim() || undefined,
                showTrackingCheckerBranding: false,
              });
              onClose();
            }}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            PDF erstellen
          </button>
        </div>
      </div>
    </>
  );
}

// Code Generator Modal
function CodeGeneratorModal({
  result,
  onClose,
  onCopy,
  copiedAction,
}: {
  result: AnalysisResult;
  onClose: () => void;
  onCopy: (text: string, id: string) => void;
  copiedAction: string | null;
}) {
  const [selectedCMP, setSelectedCMP] = useState<string>(
    result.cookieBanner.provider?.toLowerCase().includes('cookiebot') ? 'cookiebot' :
    result.cookieBanner.provider?.toLowerCase().includes('usercentrics') ? 'usercentrics' :
    result.cookieBanner.provider?.toLowerCase().includes('onetrust') ? 'onetrust' :
    result.cookieBanner.provider?.toLowerCase().includes('borlabs') ? 'borlabs' :
    result.cookieBanner.provider?.toLowerCase().includes('complianz') ? 'complianz' :
    'generic'
  );

  const codes: Record<string, { name: string; code: string }> = {
    cookiebot: {
      name: 'Cookiebot',
      code: `<!-- Google Consent Mode v2 für Cookiebot -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  // Default: Alles auf "denied"
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',
    'wait_for_update': 500
  });
  
  // Regionsbasiert für EU
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'region': ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH', 'NO', 'IS', 'LI']
  });
</script>

<!-- Cookiebot Script (mit data-cbid) -->
<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="DEINE-COOKIEBOT-ID" data-blockingmode="auto" type="text/javascript"></script>

<!-- Consent Update nach Cookiebot Entscheidung -->
<script>
  window.addEventListener('CookiebotOnAccept', function() {
    gtag('consent', 'update', {
      'analytics_storage': Cookiebot.consent.statistics ? 'granted' : 'denied',
      'ad_storage': Cookiebot.consent.marketing ? 'granted' : 'denied',
      'ad_user_data': Cookiebot.consent.marketing ? 'granted' : 'denied',
      'ad_personalization': Cookiebot.consent.marketing ? 'granted' : 'denied',
      'functionality_storage': Cookiebot.consent.preferences ? 'granted' : 'denied',
      'personalization_storage': Cookiebot.consent.preferences ? 'granted' : 'denied'
    });
  });
  
  window.addEventListener('CookiebotOnDecline', function() {
    gtag('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied'
    });
  });
</script>

<!-- GTM Container (NACH Consent Mode) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${result.trackingTags.googleTagManager.containerId || 'GTM-XXXXXXX'}');</script>`,
    },
    usercentrics: {
      name: 'Usercentrics',
      code: `<!-- Google Consent Mode v2 für Usercentrics -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  // Default: Alles auf "denied"
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',
    'wait_for_update': 2000
  });
</script>

<!-- Usercentrics Script -->
<script id="usercentrics-cmp" src="https://app.usercentrics.eu/browser-ui/latest/loader.js" data-settings-id="DEINE-SETTINGS-ID" async></script>

<!-- Usercentrics Consent Update -->
<script>
  window.addEventListener('UC_UI_INITIALIZED', function() {
    // Initial check
    updateConsentFromUsercentrics();
  });
  
  window.addEventListener('UC_UI_CMP_EVENT', function(event) {
    if (event.detail && event.detail.type === 'ACCEPT_ALL' || event.detail.type === 'SAVE') {
      updateConsentFromUsercentrics();
    }
  });
  
  function updateConsentFromUsercentrics() {
    if (typeof UC_UI !== 'undefined') {
      const services = UC_UI.getServicesBaseInfo();
      let analyticsGranted = false;
      let marketingGranted = false;
      
      services.forEach(function(service) {
        if (service.consent.status) {
          // Google Analytics, Google Tag Manager
          if (service.name.toLowerCase().includes('google analytics') || 
              service.name.toLowerCase().includes('google tag manager')) {
            analyticsGranted = true;
          }
          // Google Ads, Facebook, etc.
          if (service.name.toLowerCase().includes('google ads') || 
              service.name.toLowerCase().includes('facebook') ||
              service.name.toLowerCase().includes('meta')) {
            marketingGranted = true;
          }
        }
      });
      
      gtag('consent', 'update', {
        'analytics_storage': analyticsGranted ? 'granted' : 'denied',
        'ad_storage': marketingGranted ? 'granted' : 'denied',
        'ad_user_data': marketingGranted ? 'granted' : 'denied',
        'ad_personalization': marketingGranted ? 'granted' : 'denied'
      });
    }
  }
</script>

<!-- GTM Container -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${result.trackingTags.googleTagManager.containerId || 'GTM-XXXXXXX'}');</script>`,
    },
    onetrust: {
      name: 'OneTrust',
      code: `<!-- Google Consent Mode v2 für OneTrust -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',
    'wait_for_update': 500
  });
</script>

<!-- OneTrust Script -->
<script src="https://cdn.cookielaw.org/scripttemplates/otSDKStub.js" type="text/javascript" charset="UTF-8" data-domain-script="DEINE-DOMAIN-SCRIPT-ID"></script>

<script type="text/javascript">
  function OptanonWrapper() {
    // C0002 = Performance/Analytics
    // C0004 = Targeting/Advertising
    const analyticsGranted = OnetrustActiveGroups.includes('C0002');
    const marketingGranted = OnetrustActiveGroups.includes('C0004');
    
    gtag('consent', 'update', {
      'analytics_storage': analyticsGranted ? 'granted' : 'denied',
      'ad_storage': marketingGranted ? 'granted' : 'denied',
      'ad_user_data': marketingGranted ? 'granted' : 'denied',
      'ad_personalization': marketingGranted ? 'granted' : 'denied'
    });
  }
</script>

<!-- GTM Container -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${result.trackingTags.googleTagManager.containerId || 'GTM-XXXXXXX'}');</script>`,
    },
    borlabs: {
      name: 'Borlabs Cookie',
      code: `<!-- Google Consent Mode v2 für Borlabs Cookie (WordPress) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',
    'wait_for_update': 500
  });
</script>

<!-- Borlabs Cookie lädt automatisch -->
<!-- Consent Update via Borlabs Events -->
<script>
  document.addEventListener('borlabs-cookie-consent-saved', function() {
    updateBorlabsConsent();
  });
  
  // Initial check wenn Consent bereits erteilt
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof BorlabsCookie !== 'undefined') {
      updateBorlabsConsent();
    }
  });
  
  function updateBorlabsConsent() {
    if (typeof BorlabsCookie !== 'undefined') {
      const statistics = BorlabsCookie.checkCookieGroupConsent('statistics');
      const marketing = BorlabsCookie.checkCookieGroupConsent('marketing');
      
      gtag('consent', 'update', {
        'analytics_storage': statistics ? 'granted' : 'denied',
        'ad_storage': marketing ? 'granted' : 'denied',
        'ad_user_data': marketing ? 'granted' : 'denied',
        'ad_personalization': marketing ? 'granted' : 'denied'
      });
    }
  }
</script>

<!-- GTM Container -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${result.trackingTags.googleTagManager.containerId || 'GTM-XXXXXXX'}');</script>`,
    },
    complianz: {
      name: 'Complianz',
      code: `<!-- Google Consent Mode v2 für Complianz (WordPress) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',
    'wait_for_update': 500
  });
</script>

<!-- Complianz hat native Google Consent Mode v2 Unterstützung -->
<!-- Aktiviere in Complianz: Einstellungen > Integrationen > Google Consent Mode v2 -->

<!-- Falls manuell: -->
<script>
  document.addEventListener('cmplz_fire_categories', function(e) {
    const consentedCategories = e.detail.categories;
    
    const analyticsGranted = consentedCategories.includes('statistics');
    const marketingGranted = consentedCategories.includes('marketing');
    
    gtag('consent', 'update', {
      'analytics_storage': analyticsGranted ? 'granted' : 'denied',
      'ad_storage': marketingGranted ? 'granted' : 'denied',
      'ad_user_data': marketingGranted ? 'granted' : 'denied',
      'ad_personalization': marketingGranted ? 'granted' : 'denied'
    });
  });
</script>

<!-- GTM Container -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${result.trackingTags.googleTagManager.containerId || 'GTM-XXXXXXX'}');</script>`,
    },
    generic: {
      name: 'Generisch / Custom',
      code: `<!-- Google Consent Mode v2 - Generische Implementierung -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  // 1. Default Consent (VOR allen anderen Scripts!)
  gtag('consent', 'default', {
    'analytics_storage': 'denied',      // Google Analytics
    'ad_storage': 'denied',             // Google Ads Cookies
    'ad_user_data': 'denied',           // Nutzerdaten an Google Ads
    'ad_personalization': 'denied',     // Personalisierte Werbung
    'functionality_storage': 'denied',  // Funktionale Cookies
    'personalization_storage': 'denied',// Personalisierung
    'security_storage': 'granted',      // Sicherheits-Cookies (immer erlaubt)
    'wait_for_update': 500              // Wartezeit für CMP
  });
  
  // Optional: Regionsbasierte Defaults (EU strenger)
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'region': ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH', 'NO', 'IS', 'LI']
  });
</script>

<!-- 2. GTM Container laden -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${result.trackingTags.googleTagManager.containerId || 'GTM-XXXXXXX'}');</script>

<!-- 3. Consent Update Funktion (vom CMP aufrufen!) -->
<script>
  // Diese Funktion muss vom Cookie-Banner aufgerufen werden
  function updateGoogleConsent(analyticsAllowed, marketingAllowed) {
    gtag('consent', 'update', {
      'analytics_storage': analyticsAllowed ? 'granted' : 'denied',
      'ad_storage': marketingAllowed ? 'granted' : 'denied',
      'ad_user_data': marketingAllowed ? 'granted' : 'denied',
      'ad_personalization': marketingAllowed ? 'granted' : 'denied',
      'functionality_storage': analyticsAllowed ? 'granted' : 'denied',
      'personalization_storage': analyticsAllowed ? 'granted' : 'denied'
    });
    
    // Optional: Event für GTM
    dataLayer.push({
      'event': 'consent_update',
      'analytics_consent': analyticsAllowed,
      'marketing_consent': marketingAllowed
    });
  }
  
  // Beispiel-Aufrufe:
  // Bei "Alle akzeptieren": updateGoogleConsent(true, true);
  // Bei "Nur notwendige": updateGoogleConsent(false, false);
  // Bei "Nur Analytics": updateGoogleConsent(true, false);
</script>

<!-- WICHTIG: Die Reihenfolge ist entscheidend! -->
<!-- 1. Consent Default -->
<!-- 2. GTM/GA4 laden -->
<!-- 3. CMP/Banner laden -->
<!-- 4. Consent Update bei Nutzerinteraktion -->`,
    },
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[90vw] sm:max-w-3xl sm:max-h-[85vh] bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            <h3 className="font-medium text-slate-200 text-sm sm:text-base">Consent Mode v2 Code Generator</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            ✕
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <label className="block text-sm text-slate-400 mb-2">CMP auswählen:</label>
          <select
            value={selectedCMP}
            onChange={(e) => setSelectedCMP(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
          >
            {Object.entries(codes).map(([key, { name }]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
          {result.cookieBanner.provider && (
            <p className="text-xs text-slate-500 mt-2">
              Erkannter CMP: {result.cookieBanner.provider}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs text-slate-300 bg-slate-900 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {codes[selectedCMP]?.code || codes.generic.code}
          </pre>
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={() => onCopy(codes[selectedCMP]?.code || codes.generic.code, 'code')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            {copiedAction === 'code' ? (
              <>
                <Check className="w-4 h-4" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Code kopieren
              </>
            )}
          </button>
          <button
            onClick={() => {
              const blob = new Blob([codes[selectedCMP]?.code || codes.generic.code], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `consent-mode-${selectedCMP}.html`;
              a.click();
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// Checklist Modal
function ChecklistModal({
  result,
  onClose,
}: {
  result: AnalysisResult;
  onClose: () => void;
}) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const checklistSections = [
    {
      title: '1. Cookie-Banner Setup',
      items: [
        { id: 'banner-1', text: 'Cookie-Banner/CMP installiert', done: result.cookieBanner.detected },
        { id: 'banner-2', text: '"Alle akzeptieren" Button vorhanden', done: result.cookieBanner.hasAcceptButton },
        { id: 'banner-3', text: '"Alle ablehnen" Button auf gleicher Ebene', done: result.cookieBanner.hasRejectButton },
        { id: 'banner-4', text: 'Granulare Einstellungen möglich', done: result.cookieBanner.hasSettingsOption },
        { id: 'banner-5', text: 'Datenschutzerklärung verlinkt', done: result.cookieBanner.hasPrivacyPolicyLink ?? false },
      ],
    },
    {
      title: '2. Google Consent Mode v2',
      items: [
        { id: 'gcm-1', text: 'Consent Mode implementiert', done: result.googleConsentMode.detected },
        { id: 'gcm-2', text: 'Version 2 (nicht v1!)', done: result.googleConsentMode.version === 'v2' },
        { id: 'gcm-3', text: 'Default auf "denied" gesetzt', done: result.googleConsentMode.defaultConsent?.ad_storage === 'denied' },
        { id: 'gcm-4', text: 'Update-Funktion implementiert', done: result.googleConsentMode.updateConsent?.detected ?? false },
        { id: 'gcm-5', text: 'ad_user_data Parameter vorhanden', done: result.googleConsentMode.parameters.ad_user_data },
        { id: 'gcm-6', text: 'ad_personalization Parameter vorhanden', done: result.googleConsentMode.parameters.ad_personalization },
      ],
    },
    {
      title: '3. Tracking Tags',
      items: [
        { id: 'tags-1', text: `GTM Container: ${result.trackingTags.googleTagManager.containerId || 'Nicht erkannt'}`, done: result.trackingTags.googleTagManager.detected },
        { id: 'tags-2', text: `GA4 Property: ${result.trackingTags.googleAnalytics.measurementId || 'Nicht erkannt'}`, done: result.trackingTags.googleAnalytics.detected },
        { id: 'tags-3', text: 'Alle Tags über GTM geladen', done: result.trackingTags.googleAnalytics.loadedViaGTM },
        { id: 'tags-4', text: 'Consent-basierte Trigger in GTM', done: false },
        ...(result.trackingTags.metaPixel.detected ? [
          { id: 'tags-5', text: `Meta Pixel: ${result.trackingTags.metaPixel.pixelId || 'Erkannt'}`, done: true },
        ] : []),
        ...(result.trackingTags.googleAdsConversion?.detected ? [
          { id: 'tags-6', text: `Google Ads: ${result.trackingTags.googleAdsConversion.conversionId || 'Erkannt'}`, done: true },
        ] : []),
      ],
    },
    {
      title: '4. Cookie-Verhalten testen',
      items: [
        { id: 'test-1', text: 'Keine Tracking-Cookies vor Consent', done: !result.cookieConsentTest?.analysis.trackingBeforeConsent },
        { id: 'test-2', text: 'Akzeptieren-Button funktioniert', done: result.cookieConsentTest?.afterAccept.clickSuccessful ?? false },
        { id: 'test-3', text: 'Ablehnen-Button funktioniert', done: result.cookieConsentTest?.afterReject.clickSuccessful ?? false },
        { id: 'test-4', text: 'Nach Ablehnen keine Marketing-Cookies', done: result.cookieConsentTest?.analysis.rejectWorksProperly ?? false },
      ],
    },
    {
      title: '5. DSGVO & DMA Compliance',
      items: [
        { id: 'gdpr-1', text: `DSGVO Score: ${gdprScore}%`, done: gdprScore >= 70 },
        { id: 'gdpr-2', text: 'Einwilligung dokumentiert', done: false },
        { id: 'gdpr-3', text: 'Datenschutzerklärung aktualisiert', done: false },
        { id: 'gdpr-4', text: 'Auftragsverarbeitungsverträge (AVV) vorhanden', done: false },
        ...(result.dmaCheck?.applicable ? [
          { id: 'dma-1', text: `DMA: ${result.dmaCheck.gatekeepersDetected.join(', ')}`, done: result.dmaCheck.summary.nonCompliant === 0 },
        ] : []),
      ],
    },
  ];

  const totalItems = checklistSections.reduce((acc, s) => acc + s.items.length, 0);
  const checkedCount = checklistSections.reduce((acc, s) => 
    acc + s.items.filter(i => i.done || checkedItems.has(i.id)).length, 0
  );
  const progress = Math.round((checkedCount / totalItems) * 100);

  const printChecklist = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tracking Setup Checkliste - ${result.url}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
          h2 { color: #6366f1; margin-top: 30px; }
          .meta { color: #666; margin-bottom: 20px; }
          .progress { background: #e5e7eb; border-radius: 9999px; height: 20px; margin: 20px 0; }
          .progress-bar { background: linear-gradient(to right, #6366f1, #a855f7); height: 100%; border-radius: 9999px; }
          ul { list-style: none; padding: 0; }
          li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; }
          .checkbox { width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center; }
          .checkbox.done { background: #22c55e; border-color: #22c55e; color: white; }
          .status { margin-left: auto; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
          .status.done { background: #dcfce7; color: #166534; }
          .status.pending { background: #fef3c7; color: #92400e; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>🔍 Tracking Setup Checkliste</h1>
        <div class="meta">
          <strong>Website:</strong> ${result.url}<br>
          <strong>Erstellt:</strong> ${new Date().toLocaleString('de-DE')}<br>
          <strong>Score:</strong> ${overallScore}/100
        </div>
        <div class="progress">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        <p><strong>${checkedCount}/${totalItems}</strong> Punkte erledigt (${progress}%)</p>
        
        ${checklistSections.map(section => `
          <h2>${section.title}</h2>
          <ul>
            ${section.items.map(item => `
              <li>
                <div class="checkbox ${item.done || checkedItems.has(item.id) ? 'done' : ''}">${item.done || checkedItems.has(item.id) ? '✓' : ''}</div>
                <span>${item.text}</span>
                <span class="status ${item.done || checkedItems.has(item.id) ? 'done' : 'pending'}">${item.done || checkedItems.has(item.id) ? 'Erledigt' : 'Offen'}</span>
              </li>
            `).join('')}
          </ul>
        `).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[90vw] sm:max-w-2xl sm:max-h-[85vh] bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            <h3 className="font-medium text-slate-200 text-sm sm:text-base">Setup Checkliste</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>{checkedCount}/{totalItems} erledigt</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {checklistSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-medium text-slate-200 mb-3">{section.title}</h4>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const isChecked = item.done || checkedItems.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-green-500/10' : 'bg-slate-700/50 hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => !item.done && toggleItem(item.id)}
                        disabled={item.done}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                        isChecked 
                          ? 'bg-green-500 text-white' 
                          : 'border-2 border-slate-500'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <span className={`text-sm ${isChecked ? 'text-green-400' : 'text-slate-300'}`}>
                        {item.text}
                      </span>
                      {item.done && (
                        <span className="ml-auto text-xs text-green-500 bg-green-500/20 px-2 py-0.5 rounded">
                          Auto
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={printChecklist}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Drucken / PDF
          </button>
        </div>
      </div>
    </>
  );
}

// DataLayer Generator Modal
function DataLayerGeneratorModal({
  onClose,
  onCopy,
  copiedAction,
}: {
  onClose: () => void;
  onCopy: (text: string, id: string) => void;
  copiedAction: string | null;
}) {
  const [selectedEvent, setSelectedEvent] = useState('purchase');
  const [generatedCode, setGeneratedCode] = useState('');

  useEffect(() => {
    setGeneratedCode(generateExampleCode(selectedEvent));
  }, [selectedEvent]);

  const eventCategories = useMemo(() => ({
    ecommerce: standardEvents.filter(e => e.category === 'ecommerce'),
    engagement: standardEvents.filter(e => e.category === 'engagement'),
    conversion: standardEvents.filter(e => e.category === 'conversion'),
  }), []);

  const consentCode = generateConsentUpdateCode(true, true);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[90vw] sm:max-w-4xl sm:max-h-[85vh] bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <h3 className="font-medium text-slate-200 text-sm sm:text-base">DataLayer Generator</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Event Auswahl */}
            <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600">
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
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-300 hover:bg-slate-600/50'
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
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-300 hover:bg-slate-600/50'
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
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-300 hover:bg-slate-600/50'
                      }`}
                    >
                      {event.event}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Output */}
            <div className="col-span-2 flex flex-col gap-4">
              <div className="bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-600/50 border-b border-slate-500">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {standardEvents.find(e => e.event === selectedEvent)?.event || selectedEvent}
                    </p>
                    <p className="text-xs text-slate-400">
                      {standardEvents.find(e => e.event === selectedEvent)?.description}
                    </p>
                  </div>
                  <button
                    onClick={() => onCopy(generatedCode, 'datalayer')}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white transition-colors"
                  >
                    {copiedAction === 'datalayer' ? (
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
                <pre className="p-4 text-xs text-slate-300 overflow-auto max-h-52 bg-slate-900/50">
                  <code>{generatedCode}</code>
                </pre>
              </div>

              {/* Consent Update Code */}
              <div className="bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-600/50 border-b border-slate-500">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Consent Update Code</p>
                    <p className="text-xs text-slate-400">Nach CMP-Interaktion aufrufen</p>
                  </div>
                  <button
                    onClick={() => onCopy(consentCode, 'consent')}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-500 hover:bg-slate-400 rounded text-xs text-white transition-colors"
                  >
                    {copiedAction === 'consent' ? (
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
                <pre className="p-4 text-xs text-slate-300 overflow-auto max-h-36 bg-slate-900/50">
                  <code>{consentCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            💡 Tipp: Passe die Beispiel-Werte an deine Produkte/Events an. Für E-Commerce muss der DataLayer VOR dem GTM gefüllt werden.
          </p>
        </div>
      </div>
    </>
  );
}

// DataLayer Viewer Modal - Zeigt den tatsächlichen DataLayer der Website
function DataLayerViewerModal({
  dataLayerAnalysis,
  onClose,
  onCopy,
  copiedAction,
}: {
  dataLayerAnalysis: DataLayerAnalysisResult | undefined;
  onClose: () => void;
  onCopy: (text: string, id: string) => void;
  copiedAction: string | null;
}) {
  const [filter, setFilter] = useState<'all' | 'ecommerce' | 'consent' | 'pageview' | 'custom'>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Kein DataLayer vorhanden
  if (!dataLayerAnalysis || !dataLayerAnalysis.hasDataLayer) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xl bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-500" />
              <h3 className="font-medium text-slate-200">DataLayer Viewer</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              ✕
            </button>
          </div>

          {/* Kein DataLayer Meldung */}
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Eye className="w-8 h-8 text-yellow-500" />
            </div>
            <h4 className="text-lg font-medium text-slate-200 mb-2">
              Kein DataLayer erkannt
            </h4>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Auf dieser Website wurde kein <code className="px-1 py-0.5 bg-slate-700 rounded text-xs">window.dataLayer</code> gefunden. 
              Das kann folgende Gründe haben:
            </p>
            
            <div className="text-left bg-slate-700/30 rounded-lg p-4 mb-6">
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong>GTM nicht installiert:</strong> Der Google Tag Manager erstellt den DataLayer automatisch.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong>DataLayer wird später initialisiert:</strong> Manchmal wird der DataLayer erst nach User-Interaktion erstellt.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong>Anderer Variablenname:</strong> Der DataLayer könnte einen anderen Namen haben (z.B. <code className="px-1 py-0.5 bg-slate-600 rounded text-xs">dataLayer1</code>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong>Consent erforderlich:</strong> Einige CMPs laden GTM erst nach Cookie-Consent.</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                Schließen
              </button>
              <a
                href="https://developers.google.com/tag-manager/devguide"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                GTM Doku
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  const rawDataLayer = dataLayerAnalysis.rawDataLayer || [];
  
  // Fallback: Erstelle Einträge aus Events wenn rawDataLayer leer ist
  const entries: DataLayerEntry[] = rawDataLayer.length > 0 
    ? rawDataLayer 
    : dataLayerAnalysis.events.map((e, i) => ({
        index: i,
        event: e.event,
        data: { event: e.event, count: e.count, parameters: e.parameters },
        type: e.hasEcommerceData ? 'ecommerce' as const : 'custom' as const,
        hasEcommerce: e.hasEcommerceData,
        hasConsent: e.event.toLowerCase().includes('consent'),
      }));

  // Filter anwenden
  const filteredEntries = entries.filter(entry => {
    // Filter nach Typ
    if (filter !== 'all') {
      if (filter === 'ecommerce' && !entry.hasEcommerce) return false;
      if (filter === 'consent' && !entry.hasConsent) return false;
      if (filter === 'pageview' && entry.type !== 'pageview') return false;
      if (filter === 'custom' && entry.type !== 'custom') return false;
    }
    
    // Suche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const eventMatch = entry.event?.toLowerCase().includes(searchLower);
      const dataMatch = JSON.stringify(entry.data).toLowerCase().includes(searchLower);
      if (!eventMatch && !dataMatch) return false;
    }
    
    return true;
  });

  // Statistiken
  const stats = {
    total: entries.length,
    ecommerce: entries.filter(e => e.hasEcommerce).length,
    consent: entries.filter(e => e.hasConsent).length,
    pageviews: entries.filter(e => e.type === 'pageview').length,
    gtmEvents: entries.filter(e => e.type === 'gtm.js' || e.type === 'gtm.dom' || e.type === 'gtm.load').length,
  };

  const getTypeIcon = (type: DataLayerEntry['type']) => {
    switch (type) {
      case 'ecommerce': return <ShoppingCart className="w-4 h-4 text-green-400" />;
      case 'consent': return <Shield className="w-4 h-4 text-purple-400" />;
      case 'pageview': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'gtm.js':
      case 'gtm.dom':
      case 'gtm.load': return <Tag className="w-4 h-4 text-orange-400" />;
      case 'config': return <Settings className="w-4 h-4 text-slate-400" />;
      default: return <Code className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeBadge = (type: DataLayerEntry['type']) => {
    const colors: Record<string, string> = {
      'ecommerce': 'bg-green-500/20 text-green-400',
      'consent': 'bg-purple-500/20 text-purple-400',
      'pageview': 'bg-blue-500/20 text-blue-400',
      'gtm.js': 'bg-orange-500/20 text-orange-400',
      'gtm.dom': 'bg-orange-500/20 text-orange-400',
      'gtm.load': 'bg-orange-500/20 text-orange-400',
      'config': 'bg-slate-500/20 text-slate-400',
      'custom': 'bg-cyan-500/20 text-cyan-400',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[95vw] sm:max-w-5xl sm:max-h-[90vh] bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            <h3 className="font-medium text-slate-200 text-sm sm:text-base">DataLayer Viewer</h3>
            <span className="text-[10px] sm:text-xs text-slate-500">({entries.length} Einträge)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            ✕
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-2 bg-slate-700/30 border-b border-slate-600 flex gap-4 text-xs">
          <span className="text-slate-400">
            <span className="font-medium text-slate-200">{stats.total}</span> Gesamt
          </span>
          {stats.ecommerce > 0 && (
            <span className="text-green-400">
              <span className="font-medium">{stats.ecommerce}</span> E-Commerce
            </span>
          )}
          {stats.consent > 0 && (
            <span className="text-purple-400">
              <span className="font-medium">{stats.consent}</span> Consent
            </span>
          )}
          {stats.pageviews > 0 && (
            <span className="text-blue-400">
              <span className="font-medium">{stats.pageviews}</span> Pageviews
            </span>
          )}
          {stats.gtmEvents > 0 && (
            <span className="text-orange-400">
              <span className="font-medium">{stats.gtmEvents}</span> GTM Events
            </span>
          )}
        </div>

        {/* Filter & Search */}
        <div className="px-4 py-3 border-b border-slate-600 flex gap-3">
          <div className="flex gap-1">
            {(['all', 'ecommerce', 'consent', 'pageview', 'custom'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-slate-600/50 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {f === 'all' ? 'Alle' : 
                 f === 'ecommerce' ? 'E-Commerce' :
                 f === 'consent' ? 'Consent' :
                 f === 'pageview' ? 'Pageviews' : 'Custom'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Events durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500"
            />
          </div>
          <button
            onClick={() => onCopy(JSON.stringify(entries, null, 2), 'full-datalayer')}
            className="flex items-center gap-1 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded-lg text-xs text-slate-200 transition-colors"
          >
            {copiedAction === 'full-datalayer' ? (
              <>
                <Check className="w-3 h-3" />
                Kopiert
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Alle kopieren
              </>
            )}
          </button>
        </div>

        {/* DataLayer Entries */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Keine Einträge gefunden</p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-sky-400 text-sm mt-2 hover:underline"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.index}
                className={`bg-slate-700/30 rounded-lg border transition-colors ${
                  expandedIndex === entry.index 
                    ? 'border-sky-500/50' 
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                {/* Entry Header */}
                <button
                  onClick={() => setExpandedIndex(expandedIndex === entry.index ? null : entry.index)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <span className="text-xs text-slate-500 font-mono w-6">#{entry.index}</span>
                  {getTypeIcon(entry.type)}
                  <span className="font-medium text-slate-200 flex-1">
                    {entry.event || '(kein Event)'}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.hasEcommerce && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                        E-Commerce
                      </span>
                    )}
                    {entry.hasConsent && (
                      <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                        Consent
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${getTypeBadge(entry.type)}`}>
                      {entry.type}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
                      expandedIndex === entry.index ? 'rotate-180' : ''
                    }`} />
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedIndex === entry.index && (
                  <div className="px-3 pb-3 border-t border-slate-600">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-slate-500">Daten:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopy(JSON.stringify(entry.data, null, 2), `entry-${entry.index}`);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-slate-600 hover:bg-slate-500 rounded text-xs text-slate-200 transition-colors"
                      >
                        {copiedAction === `entry-${entry.index}` ? (
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
                    <pre className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-lg overflow-x-auto max-h-64">
                      <code>{JSON.stringify(entry.data, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-700/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              💡 Der DataLayer zeigt alle Daten, die an Google Tag Manager übertragen werden.
            </p>
            <div className="flex gap-2">
              {dataLayerAnalysis.ecommerce.detected && (
                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                  ✓ E-Commerce aktiv
                </span>
              )}
              {dataLayerAnalysis.customDimensions.length > 0 && (
                <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                  {dataLayerAnalysis.customDimensions.length} Custom Dimensions
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
