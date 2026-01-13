import {
  GDPRChecklistResult,
  GDPRCheck,
  DMACheckResult,
  DMACheck,
  CookieBannerResult,
  TCFResult,
  GoogleConsentModeResult,
  TrackingTagsResult,
  CookieResult,
  CookieConsentTestResult,
  ThirdPartyDomainsResult,
} from '@/types';

// DSGVO (GDPR) Checks
const GDPR_CHECKS: Omit<GDPRCheck, 'status' | 'details'>[] = [
  // Consent-bezogene Checks
  {
    id: 'consent_banner',
    category: 'consent',
    title: 'Cookie-Banner vorhanden',
    description: 'Ein Cookie-Banner muss vor dem Setzen nicht-essentieller Cookies angezeigt werden.',
    legalReference: 'Art. 6, Art. 7 DSGVO; § 25 TTDSG',
    recommendation: 'Implementieren Sie einen DSGVO-konformen Cookie-Banner.',
  },
  {
    id: 'consent_reject_option',
    category: 'consent',
    title: 'Gleichwertige Ablehnen-Option',
    description: 'Die Möglichkeit zur Ablehnung muss genauso einfach sein wie die Zustimmung.',
    legalReference: 'Art. 7 Abs. 3 DSGVO; EuGH Planet49',
    recommendation: 'Fügen Sie einen gleichwertigen "Alle ablehnen" Button hinzu.',
  },
  {
    id: 'consent_granular',
    category: 'consent',
    title: 'Granulare Einwilligung möglich',
    description: 'Nutzer sollten einzelne Cookie-Kategorien auswählen können.',
    legalReference: 'Art. 7 DSGVO; ErwGr. 32',
    recommendation: 'Ermöglichen Sie die separate Zustimmung für verschiedene Zwecke.',
  },
  {
    id: 'consent_no_preselection',
    category: 'consent',
    title: 'Keine vorausgewählten Checkboxen',
    description: 'Optionale Cookies dürfen nicht vorausgewählt sein.',
    legalReference: 'EuGH Planet49 (C-673/17)',
    recommendation: 'Stellen Sie sicher, dass Marketing-Cookies standardmäßig deaktiviert sind.',
  },
  {
    id: 'consent_before_tracking',
    category: 'consent',
    title: 'Keine Cookies vor Einwilligung',
    description: 'Marketing/Analytics-Cookies dürfen erst nach Einwilligung gesetzt werden.',
    legalReference: '§ 25 Abs. 1 TTDSG; Art. 5 Abs. 3 ePrivacy-RL',
    recommendation: 'Implementieren Sie Consent Mode und blockieren Sie Tracking bis zur Zustimmung.',
  },
  {
    id: 'consent_withdrawal',
    category: 'consent',
    title: 'Widerruf der Einwilligung möglich',
    description: 'Nutzer müssen ihre Einwilligung jederzeit widerrufen können.',
    legalReference: 'Art. 7 Abs. 3 DSGVO',
    recommendation: 'Bieten Sie einen dauerhaft zugänglichen Link zu Cookie-Einstellungen.',
  },

  // Transparenz-Checks
  {
    id: 'transparency_purpose',
    category: 'transparency',
    title: 'Zweck der Datenverarbeitung erklärt',
    description: 'Der Zweck jeder Datenverarbeitung muss klar kommuniziert werden.',
    legalReference: 'Art. 13, Art. 14 DSGVO',
    recommendation: 'Erklären Sie im Banner, wofür Cookies verwendet werden.',
  },
  {
    id: 'transparency_third_parties',
    category: 'transparency',
    title: 'Drittanbieter offengelegt',
    description: 'Alle Drittanbieter, die Daten erhalten, müssen genannt werden.',
    legalReference: 'Art. 13 Abs. 1 lit. e DSGVO',
    recommendation: 'Listen Sie alle Tracking-Dienste und deren Zweck auf.',
  },
  {
    id: 'transparency_data_transfer',
    category: 'transparency',
    title: 'Internationale Datentransfers transparent',
    description: 'Übermittlungen in Drittländer müssen offengelegt werden.',
    legalReference: 'Art. 13 Abs. 1 lit. f DSGVO; Kapitel V DSGVO',
    recommendation: 'Informieren Sie über US-Transfers und deren Rechtsgrundlage.',
  },

  // Datenminimierung
  {
    id: 'data_min_necessary',
    category: 'data_minimization',
    title: 'Nur notwendige Daten',
    description: 'Es sollten nur die für den Zweck erforderlichen Daten erhoben werden.',
    legalReference: 'Art. 5 Abs. 1 lit. c DSGVO',
    recommendation: 'Prüfen Sie, ob alle Tracking-Tags wirklich benötigt werden.',
  },
  {
    id: 'data_min_retention',
    category: 'data_minimization',
    title: 'Angemessene Speicherdauer',
    description: 'Cookie-Laufzeiten sollten nicht länger als notwendig sein.',
    legalReference: 'Art. 5 Abs. 1 lit. e DSGVO',
    recommendation: 'Reduzieren Sie Cookie-Laufzeiten auf maximal 13 Monate.',
  },

  // Sicherheit
  {
    id: 'security_https',
    category: 'security',
    title: 'Sichere Übertragung (HTTPS)',
    description: 'Cookies sollten nur über HTTPS übertragen werden.',
    legalReference: 'Art. 32 DSGVO',
    recommendation: 'Setzen Sie das Secure-Flag für alle Cookies.',
  },
  {
    id: 'security_same_site',
    category: 'security',
    title: 'SameSite-Attribut gesetzt',
    description: 'Cookies sollten SameSite-Attribut haben.',
    legalReference: 'Art. 32 DSGVO; Best Practice',
    recommendation: 'Setzen Sie SameSite=Strict oder SameSite=Lax.',
  },

  // Betroffenenrechte
  {
    id: 'rights_access',
    category: 'rights',
    title: 'Zugang zu Datenschutzinformationen',
    description: 'Datenschutzerklärung muss leicht zugänglich sein.',
    legalReference: 'Art. 12, Art. 13 DSGVO',
    recommendation: 'Verlinken Sie die Datenschutzerklärung im Cookie-Banner.',
  },
];

// DMA Gatekeeper und ihre Anforderungen
const DMA_GATEKEEPERS = {
  google: {
    name: 'Google/Alphabet',
    services: ['Google Ads', 'Google Analytics', 'YouTube', 'Google Tag Manager', 'DV360'],
  },
  meta: {
    name: 'Meta',
    services: ['Facebook Ads', 'Instagram', 'Meta Pixel', 'WhatsApp'],
  },
  amazon: {
    name: 'Amazon',
    services: ['Amazon Ads', 'Amazon Attribution'],
  },
  microsoft: {
    name: 'Microsoft',
    services: ['Bing Ads', 'LinkedIn Ads', 'Microsoft Clarity'],
  },
  apple: {
    name: 'Apple',
    services: ['Apple Search Ads', 'App Store'],
  },
  tiktok: {
    name: 'ByteDance',
    services: ['TikTok Ads', 'TikTok Pixel'],
  },
};

export function analyzeGDPRCompliance(
  cookieBanner: CookieBannerResult,
  tcf: TCFResult,
  googleConsentMode: GoogleConsentModeResult,
  trackingTags: TrackingTagsResult,
  cookies: CookieResult[],
  cookieConsentTest?: CookieConsentTestResult,
  thirdPartyDomains?: ThirdPartyDomainsResult
): GDPRChecklistResult {
  const checks: GDPRCheck[] = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  let notApplicable = 0;

  for (const check of GDPR_CHECKS) {
    const result = evaluateGDPRCheck(
      check,
      cookieBanner,
      tcf,
      googleConsentMode,
      trackingTags,
      cookies,
      cookieConsentTest,
      thirdPartyDomains
    );

    checks.push(result);

    switch (result.status) {
      case 'passed':
        passed++;
        break;
      case 'failed':
        failed++;
        break;
      case 'warning':
        warnings++;
        break;
      case 'not_applicable':
        notApplicable++;
        break;
    }
  }

  // Score berechnen (0-100)
  const applicableChecks = passed + failed + warnings;
  const score = applicableChecks > 0 
    ? Math.round((passed / applicableChecks) * 100)
    : 100;

  return {
    score,
    checks,
    summary: {
      passed,
      failed,
      warnings,
      notApplicable,
    },
  };
}

function evaluateGDPRCheck(
  check: Omit<GDPRCheck, 'status' | 'details'>,
  cookieBanner: CookieBannerResult,
  tcf: TCFResult,
  googleConsentMode: GoogleConsentModeResult,
  trackingTags: TrackingTagsResult,
  cookies: CookieResult[],
  cookieConsentTest?: CookieConsentTestResult,
  thirdPartyDomains?: ThirdPartyDomainsResult
): GDPRCheck {
  let status: GDPRCheck['status'] = 'not_applicable';
  let details = '';

  switch (check.id) {
    case 'consent_banner':
      if (cookieBanner.detected) {
        status = 'passed';
        details = `Cookie-Banner erkannt${cookieBanner.provider ? ` (${cookieBanner.provider})` : ''}.`;
      } else {
        // Prüfe ob Tracking vorhanden ist
        const hasTracking = trackingTags.googleAnalytics.detected || 
                           trackingTags.metaPixel.detected ||
                           cookies.some(c => c.category === 'marketing' || c.category === 'analytics');
        if (hasTracking) {
          status = 'failed';
          details = 'Tracking erkannt, aber kein Cookie-Banner gefunden.';
        } else {
          status = 'not_applicable';
          details = 'Kein Tracking erkannt, Banner möglicherweise nicht erforderlich.';
        }
      }
      break;

    case 'consent_reject_option':
      if (!cookieBanner.detected) {
        status = 'not_applicable';
        details = 'Kein Banner erkannt.';
      } else if (cookieBanner.hasRejectButton) {
        status = 'passed';
        details = 'Ablehnen-Option im Banner gefunden.';
      } else {
        status = 'failed';
        details = 'Keine gleichwertige Ablehnen-Option erkannt.';
      }
      break;

    case 'consent_granular':
      if (!cookieBanner.detected) {
        status = 'not_applicable';
        details = 'Kein Banner erkannt.';
      } else if (cookieBanner.hasSettingsOption) {
        status = 'passed';
        details = 'Einstellungen-Option für granulare Kontrolle vorhanden.';
      } else {
        status = 'warning';
        details = 'Keine granularen Einstellungen erkannt.';
      }
      break;

    case 'consent_no_preselection':
      if (!googleConsentMode.detected && !tcf.detected) {
        status = 'warning';
        details = 'Keine Consent-Signale erkannt - Vorauswahl nicht prüfbar.';
      } else if (googleConsentMode.defaultConsent) {
        const hasDefaultDenied = 
          googleConsentMode.defaultConsent.ad_storage === 'denied' ||
          googleConsentMode.defaultConsent.analytics_storage === 'denied';
        if (hasDefaultDenied) {
          status = 'passed';
          details = 'Default Consent auf "denied" gesetzt.';
        } else {
          status = 'failed';
          details = 'Default Consent nicht auf "denied" gesetzt.';
        }
      } else {
        status = 'warning';
        details = 'Default Consent-Einstellungen nicht erkannt.';
      }
      break;

    case 'consent_before_tracking':
      if (cookieConsentTest) {
        if (cookieConsentTest.analysis.trackingBeforeConsent) {
          status = 'failed';
          details = `Tracking-Cookies vor Einwilligung erkannt: ${cookieConsentTest.beforeConsent.cookieCount} Cookies.`;
        } else {
          status = 'passed';
          details = 'Keine Tracking-Cookies vor Einwilligung erkannt.';
        }
      } else {
        // Fallback: Prüfe ob Consent Mode korrekt implementiert
        if (googleConsentMode.detected && googleConsentMode.defaultConsent) {
          status = 'warning';
          details = 'Consent Mode erkannt, aber Cookies vor Consent nicht getestet.';
        } else {
          status = 'warning';
          details = 'Cookie-Verhalten vor Consent nicht vollständig prüfbar.';
        }
      }
      break;

    case 'consent_withdrawal':
      if (cookieBanner.hasSettingsOption) {
        status = 'passed';
        details = 'Einstellungen-Option ermöglicht Widerruf.';
      } else {
        status = 'warning';
        details = 'Keine offensichtliche Möglichkeit zum Widerruf erkannt.';
      }
      break;

    case 'transparency_purpose':
      if (cookieBanner.detected) {
        status = 'warning';
        details = 'Banner vorhanden - Zweckerklärung sollte manuell geprüft werden.';
      } else {
        status = 'not_applicable';
        details = 'Kein Banner erkannt.';
      }
      break;

    case 'transparency_third_parties':
      if (thirdPartyDomains) {
        const nonCdnDomains = thirdPartyDomains.domains.filter(d => d.category !== 'cdn');
        if (nonCdnDomains.length > 0) {
          status = 'warning';
          details = `${nonCdnDomains.length} Drittanbieter erkannt. Prüfen Sie die Offenlegung.`;
        } else {
          status = 'passed';
          details = 'Keine relevanten Drittanbieter erkannt.';
        }
      } else {
        status = 'warning';
        details = 'Drittanbieter-Analyse nicht verfügbar.';
      }
      break;

    case 'transparency_data_transfer':
      if (thirdPartyDomains) {
        const nonEU = thirdPartyDomains.domains.filter(d => d.isEUBased === false);
        if (nonEU.length > 0) {
          status = 'warning';
          details = `${nonEU.length} Nicht-EU-Dienste erkannt. Rechtsgrundlage prüfen.`;
        } else {
          status = 'passed';
          details = 'Keine Drittland-Transfers erkannt.';
        }
      } else {
        status = 'warning';
        details = 'Transfer-Analyse nicht verfügbar.';
      }
      break;

    case 'data_min_necessary':
      const trackingCount = [
        trackingTags.googleAnalytics.detected,
        trackingTags.metaPixel.detected,
        trackingTags.linkedInInsight.detected,
        trackingTags.tiktokPixel.detected,
        ...trackingTags.other.map(t => t.detected),
      ].filter(Boolean).length;

      if (trackingCount > 5) {
        status = 'warning';
        details = `${trackingCount} Tracking-Dienste erkannt. Prüfen Sie die Notwendigkeit.`;
      } else if (trackingCount > 0) {
        status = 'passed';
        details = `${trackingCount} Tracking-Dienst(e) erkannt.`;
      } else {
        status = 'passed';
        details = 'Keine Tracking-Dienste erkannt.';
      }
      break;

    case 'data_min_retention':
      const longLivedCookies = cookies.filter(c => c.isLongLived);
      if (longLivedCookies.length > 0) {
        status = 'warning';
        details = `${longLivedCookies.length} Cookie(s) mit Laufzeit > 400 Tage.`;
      } else {
        status = 'passed';
        details = 'Keine übermäßig langen Cookie-Laufzeiten erkannt.';
      }
      break;

    case 'security_https':
      const insecureCookies = cookies.filter(c => !c.secure && c.category !== 'necessary');
      if (insecureCookies.length > 0) {
        status = 'warning';
        details = `${insecureCookies.length} Cookie(s) ohne Secure-Flag.`;
      } else {
        status = 'passed';
        details = 'Alle relevanten Cookies haben Secure-Flag.';
      }
      break;

    case 'security_same_site':
      const noSameSite = cookies.filter(c => !c.sameSite || c.sameSite === 'None');
      if (noSameSite.length > 3) {
        status = 'warning';
        details = `${noSameSite.length} Cookie(s) ohne/mit SameSite=None.`;
      } else {
        status = 'passed';
        details = 'SameSite-Attribute korrekt gesetzt.';
      }
      break;

    case 'rights_access':
      if (cookieBanner.detected) {
        status = 'warning';
        details = 'Prüfen Sie, ob Datenschutzinfos im Banner verlinkt sind.';
      } else {
        status = 'not_applicable';
        details = 'Kein Banner erkannt.';
      }
      break;
  }

  return {
    ...check,
    status,
    details,
  };
}

export function analyzeDMACompliance(
  trackingTags: TrackingTagsResult,
  googleConsentMode: GoogleConsentModeResult,
  tcf: TCFResult,
  cookieBanner: CookieBannerResult
): DMACheckResult {
  const detectedGatekeepers: string[] = [];
  const checks: DMACheck[] = [];

  // Erkennung der Gatekeeper-Dienste
  if (trackingTags.googleAnalytics.detected || trackingTags.googleTagManager.detected) {
    detectedGatekeepers.push('Google');
  }
  if (trackingTags.metaPixel.detected) {
    detectedGatekeepers.push('Meta');
  }
  if (trackingTags.linkedInInsight.detected || trackingTags.bingAds?.detected) {
    detectedGatekeepers.push('Microsoft');
  }
  if (trackingTags.tiktokPixel.detected) {
    detectedGatekeepers.push('ByteDance/TikTok');
  }

  const uniqueGatekeepers = [...new Set(detectedGatekeepers)];

  // DMA Checks für jeden Gatekeeper
  for (const gatekeeper of uniqueGatekeepers) {
    // Check 1: Consent-Signale werden an Gatekeeper übermittelt
    checks.push(evaluateDMAConsentSignaling(gatekeeper, googleConsentMode, tcf, cookieBanner));

    // Check 2: Daten werden nicht ohne Consent kombiniert
    checks.push(evaluateDMADataCombination(gatekeeper, googleConsentMode, tcf));

    // Check 3: End-to-End Encryption (wo anwendbar)
    if (gatekeeper === 'Meta') {
      checks.push(evaluateDMAEncryption(gatekeeper, trackingTags));
    }
  }

  // Zusammenfassung
  let compliant = 0;
  let nonCompliant = 0;
  let requiresReview = 0;

  for (const check of checks) {
    switch (check.status) {
      case 'compliant':
        compliant++;
        break;
      case 'non_compliant':
        nonCompliant++;
        break;
      case 'requires_review':
        requiresReview++;
        break;
    }
  }

  return {
    applicable: uniqueGatekeepers.length > 0,
    gatekeepersDetected: uniqueGatekeepers,
    checks,
    summary: {
      compliant,
      nonCompliant,
      requiresReview,
    },
  };
}

function evaluateDMAConsentSignaling(
  gatekeeper: string,
  googleConsentMode: GoogleConsentModeResult,
  tcf: TCFResult,
  cookieBanner: CookieBannerResult
): DMACheck {
  let status: DMACheck['status'] = 'requires_review';
  let details = '';
  let recommendation: string | undefined;

  if (gatekeeper === 'Google') {
    if (googleConsentMode.detected && googleConsentMode.version === 'v2') {
      if (googleConsentMode.updateConsent?.detected) {
        status = 'compliant';
        details = 'Google Consent Mode v2 mit Update-Funktion implementiert.';
      } else {
        status = 'requires_review';
        details = 'Consent Mode v2 erkannt, aber Update-Funktion nicht bestätigt.';
        recommendation = 'Stellen Sie sicher, dass gtag("consent", "update", ...) nach Nutzerinteraktion aufgerufen wird.';
      }
    } else if (googleConsentMode.detected) {
      status = 'non_compliant';
      details = 'Veraltete Consent Mode Version erkannt.';
      recommendation = 'Aktualisieren Sie auf Google Consent Mode v2 (seit März 2024 erforderlich).';
    } else {
      status = 'non_compliant';
      details = 'Kein Google Consent Mode implementiert.';
      recommendation = 'Implementieren Sie Google Consent Mode v2 für DMA-Compliance.';
    }
  } else if (gatekeeper === 'Meta') {
    if (cookieBanner.detected) {
      status = 'requires_review';
      details = 'Cookie-Banner erkannt. Prüfen Sie die LDU-Integration.';
      recommendation = 'Implementieren Sie Meta Limited Data Use (LDU) für EU-Nutzer.';
    } else {
      status = 'non_compliant';
      details = 'Kein Consent-Management für Meta Pixel erkannt.';
      recommendation = 'Implementieren Sie ein CMP mit Meta LDU Integration.';
    }
  } else {
    if (tcf.detected || cookieBanner.detected) {
      status = 'requires_review';
      details = `Consent-Management erkannt. Prüfen Sie ${gatekeeper}-Integration.`;
    } else {
      status = 'non_compliant';
      details = 'Kein Consent-Management erkannt.';
      recommendation = 'Implementieren Sie ein DSGVO-konformes Consent-Management.';
    }
  }

  return {
    id: `dma_consent_${gatekeeper.toLowerCase().replace(/\//g, '_')}`,
    gatekeeper,
    requirement: 'Einwilligungssignale an Gatekeeper übermitteln (Art. 5 DMA)',
    status,
    details,
    recommendation,
  };
}

function evaluateDMADataCombination(
  gatekeeper: string,
  googleConsentMode: GoogleConsentModeResult,
  tcf: TCFResult
): DMACheck {
  let status: DMACheck['status'] = 'requires_review';
  let details = '';
  let recommendation: string | undefined;

  // Prüfung ob Consent für Datenkombination eingeholt wird
  const hasConsentMechanism = googleConsentMode.detected || tcf.detected;

  if (hasConsentMechanism) {
    // Prüfe auf spezifische Parameter für Datenkombination
    if (googleConsentMode.parameters?.ad_user_data && googleConsentMode.parameters?.ad_personalization) {
      status = 'compliant';
      details = 'Consent-Parameter für Datenkombination (ad_user_data, ad_personalization) implementiert.';
    } else {
      status = 'requires_review';
      details = 'Consent-Mechanismus vorhanden, aber Parameter für Datenkombination prüfen.';
      recommendation = 'Stellen Sie sicher, dass ad_user_data und ad_personalization Parameter gesetzt werden.';
    }
  } else {
    status = 'non_compliant';
    details = 'Kein Consent für Datenkombination erkennbar.';
    recommendation = 'Implementieren Sie Consent Mode v2 mit allen erforderlichen Parametern.';
  }

  return {
    id: `dma_data_combination_${gatekeeper.toLowerCase().replace(/\//g, '_')}`,
    gatekeeper,
    requirement: 'Keine Datenkombination ohne Einwilligung (Art. 5(2) DMA)',
    status,
    details,
    recommendation,
  };
}

function evaluateDMAEncryption(
  gatekeeper: string,
  trackingTags: TrackingTagsResult
): DMACheck {
  let status: DMACheck['status'] = 'requires_review';
  let details = '';
  let recommendation: string | undefined;

  if (gatekeeper === 'Meta') {
    if (trackingTags.metaPixel.serverSide?.hasConversionsAPI) {
      status = 'requires_review';
      details = 'Server-Side API erkannt. Prüfen Sie die Verschlüsselung der Nutzerdaten.';
      recommendation = 'Stellen Sie sicher, dass Nutzerdaten vor der Übermittlung gehasht werden.';
    } else {
      status = 'requires_review';
      details = 'Nur Client-Side Pixel erkannt.';
      recommendation = 'Erwägen Sie die Implementierung der Conversions API mit verschlüsselten Daten.';
    }
  }

  return {
    id: `dma_encryption_${gatekeeper.toLowerCase().replace(/\//g, '_')}`,
    gatekeeper,
    requirement: 'Verschlüsselung von Nutzerdaten (Best Practice)',
    status,
    details,
    recommendation,
  };
}
