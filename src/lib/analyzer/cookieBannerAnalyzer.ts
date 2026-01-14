import { CrawlResult } from './crawler';
import { CookieBannerResult } from '@/types';

// Bekannte CMP Provider und ihre Erkennungsmerkmale
const CMP_PROVIDERS = [
  { name: 'Cookiebot', patterns: ['cookiebot', 'Cookiebot', 'CookieConsent'] },
  { name: 'OneTrust', patterns: ['onetrust', 'OneTrust', 'optanon'] },
  { name: 'Usercentrics', patterns: ['usercentrics', 'Usercentrics', 'uc-'] },
  { name: 'CookieYes', patterns: ['cookieyes', 'CookieYes', 'cky-'] },
  { name: 'Quantcast', patterns: ['quantcast', 'Quantcast', 'qc-cmp'] },
  { name: 'TrustArc', patterns: ['trustarc', 'TrustArc', 'truste'] },
  { name: 'Didomi', patterns: ['didomi', 'Didomi'] },
  { name: 'Sourcepoint', patterns: ['sourcepoint', 'Sourcepoint', 'sp_'] },
  { name: 'Consentmanager', patterns: ['consentmanager', 'cmp.'] },
  { name: 'Borlabs Cookie', patterns: ['borlabs', 'BorlabsCookie'] },
  { name: 'Complianz', patterns: ['complianz', 'cmplz'] },
  { name: 'GDPR Cookie Consent', patterns: ['gdpr-cookie-consent', 'cli_'] },
  { name: 'Cookie Notice', patterns: ['cookie-notice', 'cn-'] },
  { name: 'Cookie Law Info', patterns: ['cookie-law-info', 'wplc'] },
];

// Keywords für Banner-Erkennung
const BANNER_KEYWORDS = [
  'cookie',
  'consent',
  'privacy',
  'datenschutz',
  'einwilligung',
  'akzeptieren',
  'accept',
  'ablehnen',
  'reject',
  'decline',
  'alle akzeptieren',
  'accept all',
  'alle ablehnen',
  'reject all',
  'einstellungen',
  'settings',
  'preferences',
];

export function analyzeCookieBanner(crawlResult: CrawlResult): CookieBannerResult {
  const { html, scripts } = crawlResult;
  const htmlLower = html.toLowerCase();
  const combinedContent = html + scripts.join(' ');
  const combinedLower = combinedContent.toLowerCase();

  // CMP Provider erkennen
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

  // Banner-Erkennung durch Keywords und Struktur
  const bannerDetected = detectBannerPresence(htmlLower, combinedLower);

  // Button-Analyse
  const hasAcceptButton = detectAcceptButton(htmlLower);
  const hasRejectButton = detectRejectButton(htmlLower);
  const hasSettingsOption = detectSettingsOption(htmlLower);
  const hasPrivacyPolicyLink = detectPrivacyPolicyLink(htmlLower, combinedLower);

  // Prüfen ob Banner Content blockiert
  const blocksContent = detectContentBlocking(html);

  return {
    detected: bannerDetected || !!detectedProvider,
    provider: detectedProvider,
    hasAcceptButton,
    hasRejectButton,
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
  ];

  for (const pattern of bannerPatterns) {
    if (htmlLower.includes(pattern) || combinedLower.includes(pattern)) {
      return true;
    }
  }

  // Prüfe auf Kombination von Keywords die auf einen Banner hindeuten
  let keywordCount = 0;
  for (const keyword of BANNER_KEYWORDS) {
    if (htmlLower.includes(keyword)) {
      keywordCount++;
    }
  }

  // Wenn mehrere Keywords gefunden wurden, ist wahrscheinlich ein Banner vorhanden
  return keywordCount >= 3;
}

function detectAcceptButton(htmlLower: string): boolean {
  const acceptPatterns = [
    'accept',
    'akzeptieren',
    'alle akzeptieren',
    'accept all',
    'zustimmen',
    'agree',
    'einverstanden',
    'ok',
    'verstanden',
    'got it',
    'allow',
    'erlauben',
  ];

  // Prüfe auf Button-ähnliche Elemente mit Accept-Text
  for (const pattern of acceptPatterns) {
    const buttonRegex = new RegExp(
      `<(button|a|div|span)[^>]*>([^<]*${pattern}[^<]*)</(button|a|div|span)>`,
      'i'
    );
    if (buttonRegex.test(htmlLower)) {
      return true;
    }
  }

  return false;
}

function detectRejectButton(htmlLower: string): boolean {
  const rejectPatterns = [
    'reject',
    'ablehnen',
    'alle ablehnen',
    'reject all',
    'decline',
    'deny',
    'refuse',
    'nur notwendige',
    'only necessary',
    'nur erforderliche',
    'essential only',
    'keine cookies',
    'no cookies',
  ];

  for (const pattern of rejectPatterns) {
    const buttonRegex = new RegExp(
      `<(button|a|div|span)[^>]*>([^<]*${pattern}[^<]*)</(button|a|div|span)>`,
      'i'
    );
    if (buttonRegex.test(htmlLower)) {
      return true;
    }
  }

  return false;
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
    'datenschutzeinstellungen',
  ];

  for (const pattern of settingsPatterns) {
    if (htmlLower.includes(pattern)) {
      return true;
    }
  }

  return false;
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
  const hasBlockingClass = blockingClasses.some((cls) => 
    html.toLowerCase().includes(`class="[^"]*${cls}`) || 
    html.toLowerCase().includes(`class='[^']*${cls}`)
  );

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
