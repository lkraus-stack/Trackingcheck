import { CrawlResult, WindowObjectData } from './crawler';
import { GoogleConsentModeResult, ConsentSettings } from '@/types';

export function analyzeGoogleConsentMode(crawlResult: CrawlResult): GoogleConsentModeResult {
  const { scripts, windowObjects, html } = crawlResult;
  const combinedContent = html + scripts.join(' ');

  // Google Consent Mode erkennen
  const detected = detectConsentMode(combinedContent, windowObjects);
  
  // Version erkennen (v1 vs v2)
  const version = detectVersion(combinedContent);

  // Default Consent Settings extrahieren
  const defaultConsent = extractDefaultConsent(combinedContent, scripts);

  // NEU: Update Consent erkennen
  const updateConsent = extractUpdateConsent(combinedContent, scripts, windowObjects);

  // Alle Parameter prüfen
  const parameters = analyzeParameters(combinedContent, scripts);

  // NEU: Regions-spezifische Einstellungen
  const regionSettings = detectRegionSettings(combinedContent);

  // NEU: Wait for Update
  const waitForUpdate = detectWaitForUpdate(combinedContent);

  return {
    detected,
    version,
    defaultConsent,
    updateConsent,
    parameters,
    regionSettings,
    waitForUpdate,
  };
}

function detectConsentMode(content: string, windowObjects: WindowObjectData): boolean {
  // Prüfe auf gtag consent Aufrufe
  const consentPatterns = [
    'gtag.*consent',
    "gtag\\s*\\(\\s*['\"]consent['\"]",
    'consent.*default',
    'consent.*update',
    'ad_storage',
    'analytics_storage',
    'google.*consent.*mode',
    'consent_mode',
  ];

  const contentLower = content.toLowerCase();

  for (const pattern of consentPatterns) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(contentLower)) {
      return true;
    }
  }

  // Prüfe auf gtag und dataLayer
  if (windowObjects.hasGtag || windowObjects.hasDataLayer) {
    // Prüfe dataLayer Inhalt auf Consent-bezogene Events
    if (windowObjects.dataLayerContent) {
      const dataLayerStr = JSON.stringify(windowObjects.dataLayerContent);
      if (dataLayerStr.includes('consent') || dataLayerStr.includes('ad_storage')) {
        return true;
      }
    }
  }

  return false;
}

function detectVersion(content: string): 'v1' | 'v2' | undefined {
  // v2 spezifische Parameter (ab März 2024 erforderlich)
  const v2Parameters = ['ad_user_data', 'ad_personalization'];
  
  const hasV2Parameters = v2Parameters.some(param => 
    content.toLowerCase().includes(param)
  );

  if (hasV2Parameters) {
    return 'v2';
  }

  // Prüfe auf v1 Parameter
  const v1Parameters = ['ad_storage', 'analytics_storage'];
  const hasV1Parameters = v1Parameters.some(param => 
    content.toLowerCase().includes(param)
  );

  if (hasV1Parameters) {
    return 'v1';
  }

  return undefined;
}

function extractDefaultConsent(content: string, scripts: string[]): ConsentSettings | undefined {
  const combinedScripts = scripts.join('\n');
  
  // Suche nach gtag('consent', 'default', {...})
  const defaultConsentRegex = /gtag\s*\(\s*['"]consent['"]\s*,\s*['"]default['"]\s*,\s*(\{[^}]+\})/gi;
  
  let match = defaultConsentRegex.exec(content);
  if (!match) {
    match = defaultConsentRegex.exec(combinedScripts);
  }

  if (match) {
    try {
      // Versuche das JSON-Objekt zu parsen
      const consentObj = match[1]
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
        .replace(/,\s*}/g, '}');
      
      const parsed = JSON.parse(consentObj);
      return normalizeConsentSettings(parsed);
    } catch {
      // JSON Parse fehlgeschlagen, versuche manuelle Extraktion
      return extractConsentFromString(match[1]);
    }
  }

  return undefined;
}

// NEU: Update Consent extrahieren
function extractUpdateConsent(
  content: string, 
  scripts: string[], 
  windowObjects: WindowObjectData
): GoogleConsentModeResult['updateConsent'] {
  const combinedScripts = scripts.join('\n');
  const combinedContent = content + combinedScripts;
  
  // Suche nach gtag('consent', 'update', {...})
  const updateConsentRegex = /gtag\s*\(\s*['"]consent['"]\s*,\s*['"]update['"]\s*,\s*(\{[^}]+\})/gi;
  
  let match = updateConsentRegex.exec(combinedContent);
  let detected = !!match;
  let updateSettings: ConsentSettings | undefined;
  let updateTrigger: 'banner_click' | 'tcf_api' | 'custom' | 'unknown' = 'unknown';

  if (match) {
    try {
      const consentObj = match[1]
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
        .replace(/,\s*}/g, '}');
      
      const parsed = JSON.parse(consentObj);
      updateSettings = normalizeConsentSettings(parsed);
    } catch {
      updateSettings = extractConsentFromString(match[1]);
    }
  }

  // Prüfe auch im DataLayer nach consent update Events
  if (windowObjects.dataLayerContent) {
    const dataLayerStr = JSON.stringify(windowObjects.dataLayerContent);
    if (dataLayerStr.includes('consent') && dataLayerStr.includes('update')) {
      detected = true;
    }
    
    // Suche nach Update-Events im DataLayer
    for (const item of windowObjects.dataLayerContent) {
      if (typeof item === 'object' && item !== null) {
        const itemStr = JSON.stringify(item);
        if (itemStr.includes('consent_update') || 
            (itemStr.includes('consent') && itemStr.includes('granted'))) {
          detected = true;
        }
      }
    }
  }

  // Erkennung des Update-Triggers
  if (detected) {
    // TCF API Trigger
    if (combinedContent.includes('__tcfapi') && 
        (combinedContent.includes('addEventListener') || combinedContent.includes('tcloaded'))) {
      updateTrigger = 'tcf_api';
    }
    // Banner Click Trigger
    else if (combinedContent.includes('onclick') || 
             combinedContent.includes('addEventListener') ||
             combinedContent.includes('click')) {
      // Prüfe ob Consent Update nach Click-Handler
      const clickConsentPattern = /(click|onclick|addEventListener)[\s\S]{0,500}consent[\s\S]{0,200}update/i;
      if (clickConsentPattern.test(combinedContent)) {
        updateTrigger = 'banner_click';
      }
    }
    // Custom/CMP Trigger
    if (combinedContent.includes('Cookiebot') || 
        combinedContent.includes('OneTrust') ||
        combinedContent.includes('Usercentrics')) {
      updateTrigger = 'custom';
    }
  }

  // Prüfe ob Update nach Banner-Interaktion getriggert wird
  const triggeredAfterBanner = detectUpdateAfterBanner(combinedContent);

  return {
    detected,
    triggeredAfterBanner,
    updateSettings,
    updateTrigger,
  };
}

function detectUpdateAfterBanner(content: string): boolean {
  // Patterns die darauf hindeuten, dass consent update nach Banner-Klick kommt
  const patterns = [
    /CookieConsent[\s\S]*consent[\s\S]*update/i,
    /accept[\s\S]*gtag[\s\S]*consent[\s\S]*update/i,
    /onAccept[\s\S]*consent/i,
    /consent.*callback/i,
    /setConsent/i,
    /updateConsent/i,
    /consentCallback/i,
    /__tcfapi[\s\S]*addEventListener[\s\S]*consent/i,
  ];

  return patterns.some(pattern => pattern.test(content));
}

// NEU: Regions-spezifische Einstellungen erkennen
function detectRegionSettings(content: string): GoogleConsentModeResult['regionSettings'] {
  // Suche nach region-spezifischen Consent-Einstellungen
  const regionPattern = /region\s*:\s*\[([^\]]+)\]/gi;
  const match = regionPattern.exec(content);
  
  if (match) {
    const regionsStr = match[1];
    const regions = regionsStr.match(/['"]([A-Z]{2})['"]|([A-Z]{2})/g)?.map(r => r.replace(/['"]/g, '')) || [];
    
    return {
      detected: true,
      regions,
    };
  }

  // Prüfe auf gängige Region-Patterns
  if (content.includes('EU') || content.includes('EEA') || content.includes('GDPR')) {
    return {
      detected: true,
      regions: ['EU'],
    };
  }

  return undefined;
}

// NEU: Wait for Update erkennen
function detectWaitForUpdate(content: string): GoogleConsentModeResult['waitForUpdate'] {
  // Suche nach wait_for_update Parameter
  const waitPattern = /wait_for_update\s*:\s*(\d+)/i;
  const match = waitPattern.exec(content);
  
  if (match) {
    return {
      detected: true,
      timeout: parseInt(match[1], 10),
    };
  }

  // Alternative Patterns
  if (content.includes('wait_for_update')) {
    return {
      detected: true,
    };
  }

  return undefined;
}

function extractConsentFromString(consentStr: string): ConsentSettings {
  const settings: ConsentSettings = {};
  
  const parameterPatterns = [
    { key: 'ad_storage', pattern: /ad_storage\s*:\s*['"]?(granted|denied)['"]?/i },
    { key: 'analytics_storage', pattern: /analytics_storage\s*:\s*['"]?(granted|denied)['"]?/i },
    { key: 'ad_user_data', pattern: /ad_user_data\s*:\s*['"]?(granted|denied)['"]?/i },
    { key: 'ad_personalization', pattern: /ad_personalization\s*:\s*['"]?(granted|denied)['"]?/i },
    { key: 'functionality_storage', pattern: /functionality_storage\s*:\s*['"]?(granted|denied)['"]?/i },
    { key: 'personalization_storage', pattern: /personalization_storage\s*:\s*['"]?(granted|denied)['"]?/i },
    { key: 'security_storage', pattern: /security_storage\s*:\s*['"]?(granted|denied)['"]?/i },
  ];

  for (const { key, pattern } of parameterPatterns) {
    const match = consentStr.match(pattern);
    if (match) {
      settings[key as keyof ConsentSettings] = match[1].toLowerCase() as 'granted' | 'denied';
    }
  }

  return settings;
}

function normalizeConsentSettings(parsed: Record<string, string>): ConsentSettings {
  const settings: ConsentSettings = {};
  
  const validKeys: (keyof ConsentSettings)[] = [
    'ad_storage',
    'analytics_storage',
    'ad_user_data',
    'ad_personalization',
    'functionality_storage',
    'personalization_storage',
    'security_storage',
  ];

  for (const key of validKeys) {
    if (parsed[key] && (parsed[key] === 'granted' || parsed[key] === 'denied')) {
      settings[key] = parsed[key] as 'granted' | 'denied';
    }
  }

  return settings;
}

function analyzeParameters(content: string, scripts: string[]): GoogleConsentModeResult['parameters'] {
  const combinedContent = content + scripts.join('\n');
  const contentLower = combinedContent.toLowerCase();

  return {
    ad_storage: contentLower.includes('ad_storage'),
    analytics_storage: contentLower.includes('analytics_storage'),
    ad_user_data: contentLower.includes('ad_user_data'),
    ad_personalization: contentLower.includes('ad_personalization'),
    functionality_storage: contentLower.includes('functionality_storage'),
    personalization_storage: contentLower.includes('personalization_storage'),
    security_storage: contentLower.includes('security_storage'),
  };
}

// Hilfsfunktion zur Prüfung der Consent Mode Vollständigkeit
export function checkConsentModeCompleteness(result: GoogleConsentModeResult): {
  isComplete: boolean;
  missingV2Parameters: string[];
  recommendations: string[];
  hasProperUpdateFlow: boolean;
} {
  const recommendations: string[] = [];
  const missingV2Parameters: string[] = [];

  // v2 erfordert ad_user_data und ad_personalization
  if (!result.parameters.ad_user_data) {
    missingV2Parameters.push('ad_user_data');
  }
  if (!result.parameters.ad_personalization) {
    missingV2Parameters.push('ad_personalization');
  }

  // Basis-Parameter
  if (!result.parameters.ad_storage) {
    recommendations.push('ad_storage Parameter fehlt - wichtig für Ads Tracking');
  }
  if (!result.parameters.analytics_storage) {
    recommendations.push('analytics_storage Parameter fehlt - wichtig für Analytics');
  }

  // Version Check
  if (result.version === 'v1') {
    recommendations.push(
      'Google Consent Mode v1 erkannt. Seit März 2024 ist v2 erforderlich für volle Funktionalität mit Google Ads.'
    );
  }

  // NEU: Update Flow Check
  const hasProperUpdateFlow = !!(
    result.updateConsent?.detected && 
    result.updateConsent?.triggeredAfterBanner
  );

  if (result.detected && !result.updateConsent?.detected) {
    recommendations.push(
      'Kein Consent Update erkannt. Stellen Sie sicher, dass gtag("consent", "update", {...}) nach Nutzerinteraktion aufgerufen wird.'
    );
  }

  if (result.updateConsent?.detected && !result.updateConsent?.triggeredAfterBanner) {
    recommendations.push(
      'Consent Update gefunden, aber möglicherweise nicht korrekt mit Banner-Interaktion verknüpft.'
    );
  }

  // Wait for Update Check
  if (result.detected && !result.waitForUpdate?.detected) {
    recommendations.push(
      'wait_for_update nicht konfiguriert. Empfohlen für asynchrone Consent-Abfragen.'
    );
  }

  const isComplete = 
    result.parameters.ad_storage &&
    result.parameters.analytics_storage &&
    result.parameters.ad_user_data &&
    result.parameters.ad_personalization;

  return {
    isComplete,
    missingV2Parameters,
    recommendations,
    hasProperUpdateFlow,
  };
}
