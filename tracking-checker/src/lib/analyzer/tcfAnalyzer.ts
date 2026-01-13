import { CrawlResult } from './crawler';
import { TCFResult } from '@/types';

// Bekannte CMP IDs (IAB Europe CMP List)
const KNOWN_CMPS: Record<number, string> = {
  1: 'Quantcast',
  2: 'Google',
  3: 'Amazon',
  6: 'Sourcepoint',
  10: 'Didomi',
  14: 'Evidon',
  28: 'OneTrust',
  31: 'Iubenda',
  50: 'Sirdata',
  76: 'TrustArc',
  107: 'Admiral',
  128: 'Usercentrics',
  134: 'Cookiebot',
  162: 'CookieYes',
  224: 'Consentmanager',
  300: 'Borlabs',
};

export function analyzeTCF(crawlResult: CrawlResult): TCFResult {
  const { windowObjects, scripts, html } = crawlResult;
  const combinedContent = html + scripts.join(' ');

  // Prüfe ob TCF API vorhanden ist
  const hasTcfApi = windowObjects.hasTcfApi;

  // Prüfe auf TCF-bezogene Skripte
  const tcfScriptDetected = detectTCFScripts(combinedContent, scripts);

  // TCF Response analysieren
  let tcfData = null;
  if (windowObjects.tcfApiResponse) {
    tcfData = windowObjects.tcfApiResponse as Record<string, unknown>;
  }

  // Versuche TC String aus verschiedenen Quellen zu extrahieren
  const tcString = extractTCString(crawlResult);

  // TC String validieren
  const validTcString = tcString ? validateTCString(tcString) : false;

  // CMP ID und Version extrahieren
  const cmpInfo = extractCMPInfo(tcfData, tcString);

  // GDPR Applies prüfen
  const gdprApplies = tcfData?.gdprApplies as boolean | undefined;

  return {
    detected: hasTcfApi || tcfScriptDetected || !!tcString,
    version: detectTCFVersion(combinedContent, tcfData),
    cmpId: cmpInfo.cmpId,
    cmpName: cmpInfo.cmpName,
    tcString: tcString,
    validTcString,
    gdprApplies,
  };
}

function detectTCFScripts(content: string, scripts: string[]): boolean {
  const tcfPatterns = [
    '__tcfapi',
    'tcf-stub',
    'tcfapi',
    'cmp-stub',
    'gdpr-stub',
    'euconsent',
    'iabtcf',
    'TCF',
    'CmpApi',
  ];

  const contentLower = content.toLowerCase();
  const scriptsLower = scripts.map(s => s.toLowerCase()).join(' ');

  for (const pattern of tcfPatterns) {
    if (contentLower.includes(pattern.toLowerCase()) || scriptsLower.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function extractTCString(crawlResult: CrawlResult): string | undefined {
  const { cookies, windowObjects, html } = crawlResult;

  // 1. Aus TCF API Response
  if (windowObjects.tcfApiResponse) {
    const tcfData = windowObjects.tcfApiResponse as Record<string, unknown>;
    if (tcfData.tcString && typeof tcfData.tcString === 'string') {
      return tcfData.tcString;
    }
  }

  // 2. Aus Cookies
  const tcfCookieNames = ['euconsent-v2', 'eupubconsent-v2', 'IABTCF_TCString', '__tcfconsent'];
  for (const cookie of cookies) {
    if (tcfCookieNames.some(name => cookie.name.toLowerCase().includes(name.toLowerCase()))) {
      // TC Strings beginnen typischerweise mit 'C' und sind Base64-encoded
      if (cookie.value && cookie.value.length > 10) {
        return cookie.value;
      }
    }
  }

  // 3. Aus localStorage/HTML (indirekt)
  const tcStringPattern = /[A-Za-z0-9+/=]{50,}/g;
  const matches = html.match(tcStringPattern);
  if (matches) {
    for (const match of matches) {
      if (match.startsWith('C') && validateTCString(match)) {
        return match;
      }
    }
  }

  return undefined;
}

function validateTCString(tcString: string): boolean {
  // Grundlegende Validierung eines TC Strings
  // TC Strings sind Base64url encoded und haben eine spezifische Struktur
  
  if (!tcString || tcString.length < 20) {
    return false;
  }

  // TC String v2 beginnt mit 'C' (Core String identifier)
  if (!tcString.startsWith('C')) {
    return false;
  }

  // Prüfe auf valide Base64url Zeichen
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  if (!base64urlRegex.test(tcString.replace(/\./g, ''))) {
    return false;
  }

  // Weitere Validierung: Versuche zu dekodieren
  try {
    // TC String besteht aus mehreren Segmenten getrennt durch '.'
    const segments = tcString.split('.');
    if (segments.length < 1) {
      return false;
    }

    // Das erste Segment (Core String) muss mindestens vorhanden sein
    const coreString = segments[0];
    if (coreString.length < 20) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function detectTCFVersion(content: string, tcfData: Record<string, unknown> | null): string | undefined {
  // Aus TCF Data
  if (tcfData?.tcfPolicyVersion) {
    return `2.${tcfData.tcfPolicyVersion}`;
  }

  // Aus Content
  if (content.includes('TCF 2.2') || content.includes('tcf_2.2')) {
    return '2.2';
  }
  if (content.includes('TCF 2.0') || content.includes('tcf_2.0') || content.includes('__tcfapi')) {
    return '2.0';
  }
  if (content.includes('TCF 1.1') || content.includes('tcf_1.1')) {
    return '1.1';
  }

  // Wenn TCF API vorhanden, nehme 2.x an
  if (content.includes('__tcfapi')) {
    return '2.x';
  }

  return undefined;
}

function extractCMPInfo(
  tcfData: Record<string, unknown> | null,
  tcString: string | undefined
): { cmpId?: number; cmpName?: string } {
  let cmpId: number | undefined;
  let cmpName: string | undefined;

  // Aus TCF Data
  if (tcfData?.cmpId) {
    cmpId = tcfData.cmpId as number;
  }

  // Aus TC String dekodieren (vereinfacht)
  if (!cmpId && tcString) {
    // Die CMP ID ist in den ersten Bits des Core Strings encoded
    // Für eine vollständige Implementierung wäre ein TC String Decoder nötig
    // Hier eine vereinfachte Erkennung
  }

  // CMP Name aus bekannter Liste
  if (cmpId && KNOWN_CMPS[cmpId]) {
    cmpName = KNOWN_CMPS[cmpId];
  }

  return { cmpId, cmpName };
}
