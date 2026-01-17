import { CrawlResult } from './crawler';
import { CookieBannerResult } from '@/types';

// Bekannte CMP Provider und ihre Erkennungsmerkmale
const CMP_PROVIDERS = [
  // Internationale CMPs
  { name: 'Cookiebot', patterns: ['cookiebot', 'cookieconsent', 'cybotcookiebot', 'CybotCookiebot'] },
  { name: 'OneTrust', patterns: ['onetrust', 'optanon', 'cookielaw.org', 'ot-sdk', 'OptanonConsent'] },
  { name: 'Usercentrics', patterns: ['usercentrics', 'uc-', 'uc_ui', 'UC_UI', '__ucCmp', 'usercentrics-root'] },
  { name: 'CookieYes', patterns: ['cookieyes', 'cky-', 'cky_consent'] },
  { name: 'Quantcast', patterns: ['quantcast', 'qc-cmp', '__qcCmp'] },
  { name: 'TrustArc', patterns: ['trustarc', 'truste', 'consent.trustarc'] },
  { name: 'Didomi', patterns: ['didomi', 'didomi-notice', 'didomi_token'] },
  { name: 'Sourcepoint', patterns: ['sourcepoint', 'sp_', 'sp-ccpa', 'sp-gdpr'] },
  { name: 'Consentmanager', patterns: ['consentmanager', 'cmp.', 'consentmanager.net'] },
  { name: 'Osano', patterns: ['osano', 'osano-cm', 'osano.com'] },
  { name: 'Klaro', patterns: ['klaro', 'klaro-cookie'] },
  { name: 'Iubenda', patterns: ['iubenda', 'iubenda-cs'] },
  { name: 'Termly', patterns: ['termly', 'termly.io'] },
  { name: 'Admiral', patterns: ['admiral', 'getadmiral'] },
  { name: 'Securiti', patterns: ['securiti', 'securiti.ai'] },
  { name: 'Transcend', patterns: ['transcend', 'transcend.io'] },
  { name: 'LiveRamp', patterns: ['liveramp', 'ats.rlcdn.com'] },
  
  // WordPress/Shopify CMPs (Deutschland)
  { name: 'Borlabs Cookie', patterns: ['borlabs', 'borlabscookie', 'BorlabsCookieBox', 'BorlabsCookie'] },
  { name: 'Complianz', patterns: ['complianz', 'cmplz', 'cmplz_', 'cmplz-cookiebanner'] },
  { name: 'GDPR Cookie Consent', patterns: ['gdpr-cookie-consent', 'cli_', 'webtoffee', 'wt-cli'] },
  { name: 'Cookie Notice', patterns: ['cookie-notice', 'cn-', 'cookie-notice-js'] },
  { name: 'Cookie Law Info', patterns: ['cookie-law-info', 'wplc', 'cookie-law-info-bar'] },
  { name: 'Real Cookie Banner', patterns: ['real cookie banner', 'real-cookie-banner', 'rcb-', 'rcb_', 'devowl', 'rcbConsentManager', 'consentApi'] },
  { name: 'CCM19', patterns: ['ccm19', 'ccm-', 'ccm_'] },
  { name: 'Cookie Script', patterns: ['cookie-script', 'cookiescript'] },
  { name: 'Cookie First', patterns: ['cookiefirst', 'cookie-first', 'cf-consent'] },
  { name: 'Pandectes', patterns: ['pandectes', 'pandectes-gdpr'] },
  { name: 'Orestbida', patterns: ['orestbida', 'cookie-consent-box'] },
  
  // Enterprise CMPs
  { name: 'Axeptio', patterns: ['axeptio', 'axeptio_'] },
  { name: 'Cookie Information', patterns: ['cookieinformation', 'cookie-information', 'coi-'] },
  { name: 'CookiePro', patterns: ['cookiepro', 'cookie-pro'] },
  { name: 'Crownpeak', patterns: ['crownpeak', 'evidon'] },
  { name: 'Ensighten', patterns: ['ensighten', 'ensighten-'] },
];

// Keywords für Banner-Erkennung
const BANNER_KEYWORDS = [
  'cookie',
  'consent',
  'privacy',
  'datenschutz',
  'privatsphäre',
  'privatsphaere',
  'einwilligung',
  'akzeptieren',
  'accept',
  'ablehnen',
  'reject',
  'decline',
  'alle akzeptieren',
  'alles akzeptieren',
  'accept all',
  'alle ablehnen',
  'reject all',
  'einstellungen',
  'settings',
  'preferences',
  'datenschutz-einstellungen',
  'cookie-einstellungen',
  'privacy settings',
  'nur essenzielle',
  'only essential',
];

export function analyzeCookieBanner(crawlResult: CrawlResult): CookieBannerResult {
  const { html, scripts, networkRequests } = crawlResult;
  const htmlLower = html.toLowerCase();
  const networkContent = networkRequests.map(req => req.url).join(' ');
  const combinedContent = `${html} ${scripts.join(' ')} ${networkContent}`;
  const combinedLower = combinedContent.toLowerCase();

  // CMP-Domains für Netzwerk-basierte Erkennung
  const CMP_DOMAINS = [
    { domain: 'cookiebot.com', provider: 'Cookiebot' },
    { domain: 'consent.cookiebot.com', provider: 'Cookiebot' },
    { domain: 'onetrust.com', provider: 'OneTrust' },
    { domain: 'cdn.cookielaw.org', provider: 'OneTrust' },
    { domain: 'usercentrics.eu', provider: 'Usercentrics' },
    { domain: 'app.usercentrics.eu', provider: 'Usercentrics' },
    { domain: 'privacy-mgmt.com', provider: 'Sourcepoint' },
    { domain: 'quantcast.com', provider: 'Quantcast' },
    { domain: 'quantcast.mgr.consensu.org', provider: 'Quantcast' },
    { domain: 'didomi.io', provider: 'Didomi' },
    { domain: 'sdk.privacy-center.org', provider: 'Didomi' },
    { domain: 'trustarc.com', provider: 'TrustArc' },
    { domain: 'consent-manager.trustarc.com', provider: 'TrustArc' },
    { domain: 'iubenda.com', provider: 'Iubenda' },
    { domain: 'cdn.iubenda.com', provider: 'Iubenda' },
    { domain: 'termly.io', provider: 'Termly' },
    { domain: 'app.termly.io', provider: 'Termly' },
    { domain: 'osano.com', provider: 'Osano' },
    { domain: 'cmp.osano.com', provider: 'Osano' },
    { domain: 'cookieyes.com', provider: 'CookieYes' },
    { domain: 'cdn-cookieyes.com', provider: 'CookieYes' },
    { domain: 'klaro.org', provider: 'Klaro' },
    { domain: 'consentmanager.net', provider: 'Consentmanager' },
    { domain: 'delivery.consentmanager.net', provider: 'Consentmanager' },
  ];

  // CMP Provider erkennen (HTML + Scripts)
  let detectedProvider: string | undefined;
  for (const provider of CMP_PROVIDERS) {
    for (const pattern of provider.patterns) {
      if (combinedLower.includes(pattern.toLowerCase())) {
        detectedProvider = provider.name;
        break;
      }
    }
    if (detectedProvider) break;
  }
  
  // Fallback: CMP-Erkennung über Netzwerkanfragen (Domain-basiert)
  if (!detectedProvider) {
    for (const request of networkRequests) {
      const urlLower = request.url.toLowerCase();
      for (const cmpDomain of CMP_DOMAINS) {
        if (urlLower.includes(cmpDomain.domain)) {
          detectedProvider = cmpDomain.provider;
          break;
        }
      }
      if (detectedProvider) break;
    }
  }

  // Banner-Erkennung durch Keywords und Struktur
  const bannerDetected = detectBannerPresence(htmlLower, combinedLower);

  // Button-Analyse
  const hasAcceptButton = detectAcceptButton(htmlLower);
  const hasRejectButton = detectRejectButton(htmlLower);
  const hasEssentialSaveButton = detectEssentialSaveButton(htmlLower);
  const hasSettingsOption = detectSettingsOption(htmlLower);
  const hasPrivacyPolicyLink = detectPrivacyPolicyLink(htmlLower, combinedLower);

  // Prüfen ob Banner Content blockiert
  const blocksContent = detectContentBlocking(html);

  return {
    detected: bannerDetected || !!detectedProvider,
    provider: detectedProvider,
    hasAcceptButton,
    hasRejectButton,
    hasEssentialSaveButton,
    hasSettingsOption,
    blocksContent,
    hasPrivacyPolicyLink,
  };
}

function detectBannerPresence(htmlLower: string, combinedLower: string): boolean {
  // Prüfe auf typische Cookie-Banner Elemente
  const bannerPatterns = [
    'cookie-banner',
    'cookie-consent',
    'consent-banner',
    'privacy-banner',
    'gdpr-banner',
    'cookie-notice',
    'cookie-popup',
    'consent-popup',
    'cookie-modal',
    'consent-modal',
    'cookie-overlay',
    'consent-overlay',
    'cookieconsent',
    'cookie_banner',
    'consent_banner',
    'cybotcookiebot',
    'onetrust',
    'ot-sdk-container',
    'usercentrics',
    'uc-banner',
    'uc-center-container',
    'real-cookie-banner',
    'rcb-consent',
    'rcb-banner',
    'borlabs',
    'cmplz',
    'didomi-notice',
    'didomi-popup',
    'qc-cmp',
    'klaro',
    'iubenda',
    'termly',
    'cookieyes',
    'cky-consent',
  ];

  for (const pattern of bannerPatterns) {
    if (htmlLower.includes(pattern) || combinedLower.includes(pattern)) {
      return true;
    }
  }

  // DSGVO-konform: Prüfe auf role="dialog" und aria-modal="true" (Standard-Attribute für Consent-Banner)
  const dialogPatterns = [
    'role="dialog"',
    "role='dialog'",
    'role="alertdialog"',
    "role='alertdialog'",
    'aria-modal="true"',
    "aria-modal='true'",
    'data-consent',
    'data-cookie',
    'data-gdpr',
    'data-privacy',
    'data-cmp',
  ];
  
  let hasDialogElement = false;
  for (const pattern of dialogPatterns) {
    if (htmlLower.includes(pattern)) {
      hasDialogElement = true;
      break;
    }
  }
  
  // Wenn ein Dialog-Element gefunden wurde UND Cookie/Consent Keywords vorhanden sind
  if (hasDialogElement) {
    const cookieKeywords = ['cookie', 'consent', 'datenschutz', 'privacy', 'dsgvo', 'gdpr'];
    for (const keyword of cookieKeywords) {
      if (htmlLower.includes(keyword)) {
        return true;
      }
    }
  }

  // Prüfe auf Kombination von Keywords die auf einen Banner hindeuten
  let keywordCount = 0;
  for (const keyword of BANNER_KEYWORDS) {
    if (htmlLower.includes(keyword) || combinedLower.includes(keyword)) {
      keywordCount++;
    }
  }

  // Wenn mehrere Keywords gefunden wurden, ist wahrscheinlich ein Banner vorhanden
  return keywordCount >= 3;
}

function detectAcceptButton(htmlLower: string): boolean {
  const acceptPatterns = [
    // Englisch
    'accept',
    'accept all',
    'accept cookies',
    'allow all',
    'allow all cookies',
    'agree',
    'agree to all',
    'i agree',
    'i accept',
    'consent',
    'got it',
    'okay',
    'ok',
    'yes',
    'allow',
    'continue',
    'proceed',
    'enable all',
    'accept & close',
    'accept and close',
    'accept & continue',
    // Deutsch
    'akzeptieren',
    'alle akzeptieren',
    'alles akzeptieren',
    'alle cookies akzeptieren',
    'cookies akzeptieren',
    'alle erlauben',
    'erlauben',
    'zustimmen',
    'allen zustimmen',
    'einverstanden',
    'verstanden',
    'einwilligen',
    'annehmen',
    'alle annehmen',
    'weiter',
    'fortfahren',
    'aktivieren',
    'alle aktivieren',
    // Button-Varianten
    'submit',
    'confirm all',
    'bestätigen',
    'alle bestätigen',
  ];

  return hasButtonPattern(htmlLower, acceptPatterns);
}

function detectRejectButton(htmlLower: string): boolean {
  const rejectPatterns = [
    // Englisch
    'reject',
    'reject all',
    'decline',
    'decline all',
    'deny',
    'deny all',
    'refuse',
    'refuse all',
    'no thanks',
    'no, thanks',
    'no thank you',
    'disagree',
    'do not accept',
    'don\'t accept',
    'not now',
    'later',
    'skip',
    'close',
    'x',
    'dismiss',
    'opt out',
    'opt-out',
    'optout',
    'disable',
    'disable all',
    'block all',
    'only necessary',
    'only essential',
    'essential only',
    'necessary only',
    'strictly necessary',
    'required only',
    'minimal',
    'continue without',
    'without accepting',
    'no cookies',
    'no tracking',
    // Deutsch
    'ablehnen',
    'alle ablehnen',
    'verweigern',
    'nicht akzeptieren',
    'nicht zustimmen',
    'nein danke',
    'nein, danke',
    'später',
    'schließen',
    'abbrechen',
    'überspringen',
    'nur essenzielle',
    'nur essenziell',
    'nur notwendige',
    'nur erforderliche',
    'nur technische',
    'nur technisch',
    'nur funktionale',
    'essentielle cookies',
    'notwendige cookies',
    'erforderliche cookies',
    'technische cookies',
    'keine cookies',
    'ohne tracking',
    'ohne cookies',
    'minimale cookies',
    'weiter ohne',
    'ohne akzeptieren',
    'deaktivieren',
    'alle deaktivieren',
    'nicht einverstanden',
    'widersprechen',
  ];

  return hasButtonPattern(htmlLower, rejectPatterns);
}

function detectEssentialSaveButton(htmlLower: string): boolean {
  // Prüfe auf "Speichern"-Button, "Nur essenzielle"-Button oder ähnliche Buttons
  // Diese werden verwendet, um nur essentielle/notwendige Cookies zu speichern
  const savePatterns = [
    // Speichern-Varianten
    'speichern',
    'save',
    'auswahl speichern',
    'save selection',
    'save preferences',
    'einstellungen speichern',
    'save settings',
    'auswahl bestätigen',
    'confirm selection',
    // Nur Essenzielle-Varianten
    'nur essenzielle',
    'nur essenziell',
    'nur notwendige',
    'nur erforderliche',
    'only essential',
    'only necessary',
    'essential only',
    'necessary only',
    'essenziell',
    'essential',
    'necessary cookies only',
    'erforderliche cookies',
    'notwendige cookies',
    'nur technisch',
    'nur funktional',
    'technical only',
  ];

  return hasButtonPattern(htmlLower, savePatterns);
}

function detectSettingsOption(htmlLower: string): boolean {
  const settingsPatterns = [
    'settings',
    'einstellungen',
    'preferences',
    'präferenzen',
    'customize',
    'anpassen',
    'manage',
    'verwalten',
    'mehr optionen',
    'more options',
    'cookie-einstellungen',
    'cookie settings',
    'privacy settings',
    'privatsphäre',
    'privatsphaere',
    'datenschutzeinstellungen',
    'privatsphäre-einstellungen',
    'privatsphaere-einstellungen',
    'datenschutz-einstellungen',
    'privacy center',
    'datenschutz center',
  ];

  return hasButtonPattern(htmlLower, settingsPatterns);
}

function detectContentBlocking(html: string): boolean {
  // Prüfe auf Overlay-Elemente die Content blockieren könnten
  const blockingPatterns = [
    'position:\\s*fixed',
    'position:\\s*absolute',
    'z-index:\\s*[0-9]{4,}',
    'overlay',
    'backdrop',
    'modal-backdrop',
  ];

  const hasOverlay = blockingPatterns.some((pattern) => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(html);
  });

  // Prüfe auf body-Klassen die auf Blocking hindeuten
  const blockingClasses = ['no-scroll', 'modal-open', 'overflow-hidden', 'body-locked'];
  const hasBlockingClass = blockingClasses.some((cls) => {
    const regex = new RegExp(`class=["'][^"']*${cls}[^"']*["']`, 'i');
    return regex.test(html);
  });

  return hasOverlay || hasBlockingClass;
}

function detectPrivacyPolicyLink(htmlLower: string, combinedLower: string): boolean {
  // Prüfe auf Links zu Datenschutzerklärung
  const privacyLinkPatterns = [
    'datenschutz',
    'privacy',
    'datenschutzerklärung',
    'privacy policy',
    'datenschutzhinweis',
    'datenschutzinformation',
  ];

  for (const pattern of privacyLinkPatterns) {
    // Prüfe ob es ein Link ist (href-Attribut)
    const linkRegex = new RegExp(`<a[^>]*href[^>]*[^>]*>.*?${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?</a>`, 'i');
    if (linkRegex.test(htmlLower)) {
      return true;
    }
    
    // Alternative: Prüfe auf href mit datenschutz/privacy im Link
    const hrefRegex = new RegExp(`href=["'][^"']*(?:datenschutz|privacy)[^"']*["']`, 'i');
    if (hrefRegex.test(htmlLower) || hrefRegex.test(combinedLower)) {
      return true;
    }
  }

  return false;
}

function hasButtonPattern(htmlLower: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const safePattern = escapeRegex(pattern);
    const buttonRegex = new RegExp(
      `<(button|a|div|span|input)[^>]*>[\\s\\S]*?${safePattern}[\\s\\S]*?</(button|a|div|span|input)>`,
      'i'
    );
    if (buttonRegex.test(htmlLower)) {
      return true;
    }

    const roleRegex = new RegExp(
      `<[^>]*role=["']button["'][^>]*>[\\s\\S]*?${safePattern}[\\s\\S]*?</[^>]+>`,
      'i'
    );
    if (roleRegex.test(htmlLower)) {
      return true;
    }

    const attrRegex = new RegExp(
      `(aria-label|title|value|data-testid|data-qa|data-action|data-consent)=["'][^"']*${safePattern}[^"']*["']`,
      'i'
    );
    if (attrRegex.test(htmlLower)) {
      return true;
    }
  }

  return false;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
