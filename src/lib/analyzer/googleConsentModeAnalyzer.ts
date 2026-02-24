import { CrawlResult, WindowObjectData } from './crawler';
import { GoogleConsentModeResult, ConsentSettings } from '@/types';

export function analyzeGoogleConsentMode(crawlResult: CrawlResult): GoogleConsentModeResult {
  const { scripts, windowObjects, html, networkRequests } = crawlResult;
  const combinedContent = html + scripts.join(' ');

  // Google Consent Mode erkennen
  const detected = detectConsentMode(combinedContent, windowObjects, networkRequests.map(r => r.url));
  
  // Version erkennen (v1 vs v2)
  const version = detectVersion(combinedContent, windowObjects);

  // Default Consent Settings extrahieren
  const defaultConsent = extractDefaultConsent(combinedContent, scripts, windowObjects);

  // NEU: Update Consent erkennen
  const updateConsent = extractUpdateConsent(combinedContent, scripts, windowObjects);

  // Alle Parameter prüfen
  const parameters = analyzeParameters(combinedContent, scripts, windowObjects);

  // NEU: Regions-spezifische Einstellungen
  const regionSettings = detectRegionSettings(combinedContent, windowObjects);

  // NEU: Wait for Update
  const waitForUpdate = detectWaitForUpdate(combinedContent, windowObjects);

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

function getRuntimeConsentCalls(windowObjects: WindowObjectData): Array<{ source: string; args: unknown[] }> {
  const calls = windowObjects.consentModeCalls;
  if (!Array.isArray(calls) || calls.length === 0) return [];
  return calls
    .filter((c) => Array.isArray(c?.args) && c.args.length > 0)
    .map((c) => ({ source: c.source, args: c.args }));
}

function detectConsentMode(content: string, windowObjects: WindowObjectData, requestUrls: string[]): boolean {
  // 1) Runtime-Instrumentation: zuverlässig auch bei externen Scripts (GTM/CMP)
  const runtimeCalls = getRuntimeConsentCalls(windowObjects);
  if (runtimeCalls.some(c => c.args?.[0] === 'consent' && (c.args?.[1] === 'default' || c.args?.[1] === 'update'))) {
    return true;
  }

  // 2) Netzwerk-Evidenz: Consent Mode Signalparameter in Google Requests (gcs/gcd)
  if (requestUrls.some((url) => /[?&](gcs|gcd)=/i.test(url))) {
    return true;
  }

  // Prüfe auf EXPLIZITE gtag consent Aufrufe - NICHT allgemeine Keywords
  // Das Pattern muss im JavaScript-Code sein, nicht im Text-Content
  
  // Sehr spezifische Patterns die NUR im Consent Mode Code vorkommen
  const strictConsentPatterns = [
    // gtag('consent', 'default', {...}) oder gtag('consent', 'update', {...})
    /gtag\s*\(\s*['"]consent['"]\s*,\s*['"](default|update)['"]/i,
    // dataLayer.push mit consent
    /dataLayer\.push\s*\(\s*\{[^}]*consent/i,
    // Spezifische Consent Mode Parameter im Code-Kontext (nicht als Text)
    /['"]ad_storage['"]\s*:\s*['"](granted|denied)['"]/i,
    /['"]analytics_storage['"]\s*:\s*['"](granted|denied)['"]/i,
    /['"]ad_user_data['"]\s*:\s*['"](granted|denied)['"]/i,
    /['"]ad_personalization['"]\s*:\s*['"](granted|denied)['"]/i,
    // wait_for_update Pattern
    /wait_for_update\s*:\s*\d+/i,
  ];

  for (const pattern of strictConsentPatterns) {
    if (pattern.test(content)) {
      return true;
    }
  }

  // Prüfe auf gtag und dataLayer mit spezifischen Consent-Events
  if (windowObjects.hasGtag || windowObjects.hasDataLayer) {
    // Prüfe dataLayer Inhalt auf echte Consent-bezogene Events
    if (windowObjects.dataLayerContent) {
      const dataLayerStr = JSON.stringify(windowObjects.dataLayerContent);
      // Nur erkennen wenn es wirklich consent default/update Events gibt
      // NICHT wenn einfach nur "consent" als Text vorkommt
      const hasConsentEvent = 
        dataLayerStr.includes('"consent"') && 
        (dataLayerStr.includes('"default"') || dataLayerStr.includes('"update"'));
      const hasConsentStorage = 
        dataLayerStr.includes('ad_storage') || 
        dataLayerStr.includes('analytics_storage');
      
      if (hasConsentEvent || hasConsentStorage) {
        return true;
      }
    }
  }

  return false;
}

function detectVersion(content: string, windowObjects: WindowObjectData): 'v1' | 'v2' | undefined {
  const runtimeCalls = getRuntimeConsentCalls(windowObjects);
  const runtimeArgsStr = runtimeCalls.length ? JSON.stringify(runtimeCalls.map(c => c.args)) : '';

  // v2 Parameter, ggf. nur zur Laufzeit gesetzt
  if (/ad_user_data/i.test(runtimeArgsStr) || /ad_personalization/i.test(runtimeArgsStr)) {
    return 'v2';
  }

  // Prüfe erst ob überhaupt Consent Mode vorhanden ist (strikte Erkennung)
  // Parameter müssen im JavaScript-Code-Kontext stehen, nicht als Text
  
  // v2 spezifische Parameter (ab März 2024 erforderlich)
  // Müssen in einem consent-relevanten Kontext stehen
  const v2ContextPatterns = [
    /['"]ad_user_data['"]\s*:\s*['"](granted|denied)['"]/i,
    /['"]ad_personalization['"]\s*:\s*['"](granted|denied)['"]/i,
    /ad_user_data\s*:\s*['"](granted|denied)['"]/i,
    /ad_personalization\s*:\s*['"](granted|denied)['"]/i,
  ];
  
  const hasV2Parameters = v2ContextPatterns.some(pattern => pattern.test(content));

  if (hasV2Parameters) {
    return 'v2';
  }

  // Prüfe auf v1 Parameter im Code-Kontext (nicht als Text)
  const v1ContextPatterns = [
    /['"]ad_storage['"]\s*:\s*['"](granted|denied)['"]/i,
    /['"]analytics_storage['"]\s*:\s*['"](granted|denied)['"]/i,
    /ad_storage\s*:\s*['"](granted|denied)['"]/i,
    /analytics_storage\s*:\s*['"](granted|denied)['"]/i,
    // Auch in gtag consent Aufrufen
    /gtag\s*\(\s*['"]consent['"]/i,
  ];
  
  const hasV1Parameters = v1ContextPatterns.some(pattern => pattern.test(content));

  if (hasV1Parameters) {
    return 'v1';
  }

  return undefined;
}

function extractDefaultConsent(content: string, scripts: string[], windowObjects: WindowObjectData): ConsentSettings | undefined {
  // 1) Runtime Calls bevorzugen
  const runtimeCalls = getRuntimeConsentCalls(windowObjects)
    .filter(c => c.args?.[0] === 'consent' && c.args?.[1] === 'default');
  for (let i = runtimeCalls.length - 1; i >= 0; i--) {
    const args = runtimeCalls[i].args;
    const payload = args?.[2];
    if (payload && typeof payload === 'object') {
      return normalizeConsentSettings(payload as Record<string, string>);
    }
  }

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
  
  // 1) Runtime Calls bevorzugen (Consent Update wird häufig dynamisch nach CMP-Interaktion gesetzt)
  const runtimeCalls = getRuntimeConsentCalls(windowObjects)
    .filter(c => c.args?.[0] === 'consent' && c.args?.[1] === 'update');
  let detected = runtimeCalls.length > 0;
  let updateSettings: ConsentSettings | undefined;
  if (runtimeCalls.length > 0) {
    for (let i = runtimeCalls.length - 1; i >= 0; i--) {
      const payload = runtimeCalls[i].args?.[2];
      if (payload && typeof payload === 'object') {
        updateSettings = normalizeConsentSettings(payload as Record<string, string>);
        break;
      }
    }
  }

  // Suche nach gtag('consent', 'update', {...})
  const updateConsentRegex = /gtag\s*\(\s*['"]consent['"]\s*,\s*['"]update['"]\s*,\s*(\{[^}]+\})/gi;
  
  let match = updateConsentRegex.exec(combinedContent);
  detected = detected || !!match;
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
  const triggeredAfterBanner =
    detectUpdateAfterBanner(combinedContent) ||
    // Runtime: wenn überhaupt ein update Call beobachtet wurde, ist der Trigger sehr wahrscheinlich Banner/CMP
    (runtimeCalls.length > 0);

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
function detectRegionSettings(content: string, windowObjects: WindowObjectData): GoogleConsentModeResult['regionSettings'] {
  // Runtime: region settings können als payload im consent default/update gesetzt sein
  const runtimeCalls = getRuntimeConsentCalls(windowObjects);
  const runtimeStr = runtimeCalls.length ? JSON.stringify(runtimeCalls.map(c => c.args)) : '';
  const runtimeRegionMatch = /"region"\s*:\s*\[([^\]]+)\]/i.exec(runtimeStr);
  if (runtimeRegionMatch) {
    const regionsStr = runtimeRegionMatch[1];
    const regions = regionsStr.match(/["']?([A-Z]{2})["']?/g)?.map(r => r.replace(/['"]/g, '')) || [];
    return { detected: true, regions };
  }

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
function detectWaitForUpdate(content: string, windowObjects: WindowObjectData): GoogleConsentModeResult['waitForUpdate'] {
  // Runtime: wait_for_update kann als payload übergeben werden
  const runtimeCalls = getRuntimeConsentCalls(windowObjects);
  const runtimeStr = runtimeCalls.length ? JSON.stringify(runtimeCalls.map(c => c.args)) : '';
  const runtimeWait = /wait_for_update\s*"\s*:\s*"?(\\d+|[0-9]+)"?/i.exec(runtimeStr) || /wait_for_update"\s*:\s*(\d+)/i.exec(runtimeStr);
  if (runtimeWait?.[1]) {
    const timeout = parseInt(runtimeWait[1], 10);
    return Number.isFinite(timeout) ? { detected: true, timeout } : { detected: true };
  }

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

function analyzeParameters(content: string, scripts: string[], windowObjects: WindowObjectData): GoogleConsentModeResult['parameters'] {
  const combinedContent = content + scripts.join('\n');
  const contentLower = combinedContent.toLowerCase();
  const runtimeCalls = getRuntimeConsentCalls(windowObjects);
  const runtimeLower = runtimeCalls.length ? JSON.stringify(runtimeCalls.map(c => c.args)).toLowerCase() : '';

  return {
    ad_storage: contentLower.includes('ad_storage') || runtimeLower.includes('ad_storage'),
    analytics_storage: contentLower.includes('analytics_storage') || runtimeLower.includes('analytics_storage'),
    ad_user_data: contentLower.includes('ad_user_data') || runtimeLower.includes('ad_user_data'),
    ad_personalization: contentLower.includes('ad_personalization') || runtimeLower.includes('ad_personalization'),
    functionality_storage: contentLower.includes('functionality_storage') || runtimeLower.includes('functionality_storage'),
    personalization_storage: contentLower.includes('personalization_storage') || runtimeLower.includes('personalization_storage'),
    security_storage: contentLower.includes('security_storage') || runtimeLower.includes('security_storage'),
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
