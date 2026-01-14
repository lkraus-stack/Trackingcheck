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
} from 'lucide-react';
import { AnalysisResult } from '@/types';
import {
  standardEvents,
  generateExampleCode,
  generateConsentUpdateCode,
} from '@/lib/templates/dataLayerGenerator';

interface QuickActionsProps {
  result: AnalysisResult;
}

export function QuickActions({ result }: QuickActionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showDataLayerModal, setShowDataLayerModal] = useState(false);

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
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="font-medium text-slate-200">Quick Actions</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-2">
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
    </div>
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
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-3xl max-h-[85vh] bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <h3 className="font-medium text-slate-200">Consent Mode v2 Code Generator</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
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
        { id: 'gdpr-1', text: `DSGVO Score: ${result.gdprChecklist?.score || 0}%`, done: (result.gdprChecklist?.score || 0) >= 70 },
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
          <strong>Score:</strong> ${result.score}/100
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
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[85vh] bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-400" />
            <h3 className="font-medium text-slate-200">Setup Checkliste</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
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
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[85vh] bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="font-medium text-slate-200">DataLayer Generator</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-4">
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
