import { CrawlResult } from './crawler';
import {
  EventQualityScoreResult,
  PlatformEventQuality,
  EventQualityParameter,
  EventQualityRecommendation,
  FunnelValidationResult,
  FunnelStep,
  CookieLifetimeAuditResult,
  CookieLifetimeImpact,
  CookieLifetimeRecommendation,
  UnusedPotentialResult,
  UnusedPotentialItem,
  MissingPlatform,
  ROASQualityResult,
  ROASValueTracking,
  ROASDataCompleteness,
  ROASParameter,
  ROASRecommendation,
  TrackingTagsResult,
  DataLayerAnalysisResult,
  CookieResult,
} from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Event Quality Score Analyzer
// ═══════════════════════════════════════════════════════════════════════════

export function analyzeEventQuality(
  crawlResult: CrawlResult,
  trackingTags: TrackingTagsResult,
  dataLayerAnalysis: DataLayerAnalysisResult
): EventQualityScoreResult {
  const platforms: EventQualityScoreResult['platforms'] = {};
  const recommendations: EventQualityRecommendation[] = [];

  // Meta/Facebook Event Quality
  if (trackingTags.metaPixel.detected) {
    platforms.meta = analyzeMetaEventQuality(crawlResult, trackingTags);
    
    // Recommendations für Meta
    if (!platforms.meta.hasServerSide) {
      recommendations.push({
        platform: 'Meta',
        priority: 'high',
        title: 'Conversions API implementieren',
        description: 'Server-Side Tracking verbessert die Match-Rate erheblich und ist robuster gegen Browser-Einschränkungen.',
        estimatedImpact: '+20-30% Event Match Quality',
      });
    }
    if (!platforms.meta.hasDedupe) {
      recommendations.push({
        platform: 'Meta',
        priority: 'medium',
        title: 'Event-Deduplizierung einrichten',
        description: 'Ohne event_id werden Events möglicherweise doppelt gezählt.',
        estimatedImpact: 'Genauere Conversion-Zahlen',
      });
    }
  }

  // Google Event Quality
  if (trackingTags.googleAnalytics.detected || trackingTags.googleAdsConversion.detected) {
    platforms.google = analyzeGoogleEventQuality(crawlResult, trackingTags, dataLayerAnalysis);
    
    if (!trackingTags.serverSideTracking.summary.hasServerSideGTM) {
      recommendations.push({
        platform: 'Google',
        priority: 'medium',
        title: 'Server-Side GTM einrichten',
        description: 'Verlängert Cookie-Lifetime und verbessert Datenqualität.',
        estimatedImpact: '+15-25% mehr Attribution',
      });
    }
  }

  // TikTok Event Quality
  if (trackingTags.tiktokPixel.detected) {
    platforms.tiktok = analyzeTikTokEventQuality(crawlResult, trackingTags);
  }

  // LinkedIn Event Quality
  if (trackingTags.linkedInInsight.detected) {
    platforms.linkedin = analyzeLinkedInEventQuality(crawlResult, trackingTags);
  }

  // Overall Score berechnen
  const scores = Object.values(platforms).map(p => p?.score || 0);
  const overallScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return {
    overallScore,
    platforms,
    recommendations: recommendations.sort((a, b) => 
      a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
    ),
  };
}

function analyzeMetaEventQuality(
  crawlResult: CrawlResult,
  trackingTags: TrackingTagsResult
): PlatformEventQuality {
  const parameters: EventQualityParameter[] = [];
  let score = 50; // Basis-Score wenn Pixel vorhanden

  // Parameter-Checks
  const dataLayerStr = JSON.stringify(crawlResult.windowObjects.dataLayerContent || []);
  const scriptsStr = crawlResult.scripts.join(' ');
  const combinedContent = dataLayerStr + scriptsStr;

  // Email Check
  const hasEmail = /fbq\s*\(\s*['"]init['"].*?em['"]\s*:/i.test(combinedContent) ||
                   /user_data.*?em/i.test(combinedContent);
  parameters.push({
    name: 'em',
    displayName: 'Email (gehasht)',
    status: hasEmail ? 'hashed' : 'missing',
    importance: 'critical',
    impact: hasEmail ? 'Aktiv' : '+25% Match Rate',
  });
  if (hasEmail) score += 15;

  // Phone Check
  const hasPhone = /fbq\s*\(\s*['"]init['"].*?ph['"]\s*:/i.test(combinedContent) ||
                   /user_data.*?ph/i.test(combinedContent);
  parameters.push({
    name: 'ph',
    displayName: 'Telefon (gehasht)',
    status: hasPhone ? 'hashed' : 'missing',
    importance: 'high',
    impact: hasPhone ? 'Aktiv' : '+15% Match Rate',
  });
  if (hasPhone) score += 10;

  // External ID Check
  const hasExternalId = /external_id/i.test(combinedContent);
  parameters.push({
    name: 'external_id',
    displayName: 'External ID',
    status: hasExternalId ? 'present' : 'missing',
    importance: 'high',
    impact: hasExternalId ? 'Aktiv' : '+10% Match Rate',
  });
  if (hasExternalId) score += 10;

  // FBC/FBP Cookies
  const hasFbc = crawlResult.cookies.some(c => c.name === '_fbc');
  const hasFbp = crawlResult.cookies.some(c => c.name === '_fbp');
  parameters.push({
    name: 'fbc',
    displayName: 'Click ID Cookie (_fbc)',
    status: hasFbc ? 'present' : 'missing',
    importance: 'critical',
    impact: hasFbc ? 'Aktiv' : 'Wichtig für Attribution',
  });
  parameters.push({
    name: 'fbp',
    displayName: 'Browser ID Cookie (_fbp)',
    status: hasFbp ? 'present' : 'missing',
    importance: 'high',
    impact: hasFbp ? 'Aktiv' : 'Wichtig für Remarketing',
  });
  if (hasFbc) score += 5;
  if (hasFbp) score += 5;

  // Server-Side Check
  const hasServerSide = trackingTags.metaPixel.serverSide?.detected || false;
  if (hasServerSide) score += 15;

  // Dedupe Check
  const hasDedupe = trackingTags.metaPixel.serverSide?.hasDedupe || 
                    /event_id/i.test(combinedContent);

  return {
    platform: 'Meta',
    score: Math.min(100, score),
    parameters,
    hasServerSide,
    hasDedupe,
    estimatedMatchRate: Math.min(95, 40 + (hasEmail ? 25 : 0) + (hasPhone ? 15 : 0) + (hasExternalId ? 10 : 0) + (hasServerSide ? 20 : 0)),
  };
}

function analyzeGoogleEventQuality(
  crawlResult: CrawlResult,
  trackingTags: TrackingTagsResult,
  dataLayerAnalysis: DataLayerAnalysisResult
): PlatformEventQuality {
  const parameters: EventQualityParameter[] = [];
  let score = 50;

  const dataLayerStr = JSON.stringify(crawlResult.windowObjects.dataLayerContent || []);
  const scriptsStr = crawlResult.scripts.join(' ');

  // Enhanced Conversions Check
  const hasEnhancedConversions = /enhanced.*conversion/i.test(scriptsStr) ||
                                  /user_data/i.test(dataLayerStr);
  parameters.push({
    name: 'enhanced_conversions',
    displayName: 'Enhanced Conversions',
    status: hasEnhancedConversions ? 'present' : 'missing',
    importance: 'critical',
    impact: hasEnhancedConversions ? 'Aktiv' : '+15% Conversion Attribution',
  });
  if (hasEnhancedConversions) score += 15;

  // GCLID Check
  const hasGclid = trackingTags.marketingParameters.gclid ||
                   crawlResult.cookies.some(c => c.name.includes('gclid') || c.name === '_gcl_au');
  parameters.push({
    name: 'gclid',
    displayName: 'Google Click ID',
    status: hasGclid ? 'present' : 'missing',
    importance: 'critical',
    impact: hasGclid ? 'Aktiv' : 'Wichtig für Attribution',
  });
  if (hasGclid) score += 10;

  // User ID Check
  const hasUserId = /user_id/i.test(dataLayerStr);
  parameters.push({
    name: 'user_id',
    displayName: 'User ID',
    status: hasUserId ? 'present' : 'missing',
    importance: 'medium',
    impact: hasUserId ? 'Aktiv' : 'Cross-Device Tracking',
  });
  if (hasUserId) score += 5;

  // E-Commerce Data Quality
  if (dataLayerAnalysis.ecommerce.detected) {
    const hasItems = dataLayerAnalysis.ecommerce.valueTracking.hasItemData;
    parameters.push({
      name: 'items',
      displayName: 'Item-Daten',
      status: hasItems ? 'present' : 'missing',
      importance: 'high',
      impact: hasItems ? 'Aktiv' : 'Für Dynamic Remarketing',
    });
    if (hasItems) score += 10;
  }

  // Server-Side GTM
  const hasServerSide = trackingTags.serverSideTracking.summary.hasServerSideGTM;
  if (hasServerSide) score += 10;

  return {
    platform: 'Google',
    score: Math.min(100, score),
    parameters,
    hasServerSide,
    hasDedupe: true, // Google dedupliziert automatisch
    estimatedMatchRate: Math.min(95, 60 + (hasEnhancedConversions ? 15 : 0) + (hasGclid ? 10 : 0) + (hasServerSide ? 10 : 0)),
  };
}

function analyzeTikTokEventQuality(
  crawlResult: CrawlResult,
  trackingTags: TrackingTagsResult
): PlatformEventQuality {
  const parameters: EventQualityParameter[] = [];
  let score = 50;

  const scriptsStr = crawlResult.scripts.join(' ');
  const hasEventsApi = trackingTags.serverSideTracking.summary.hasTikTokEventsAPI;

  parameters.push({
    name: 'events_api',
    displayName: 'Events API',
    status: hasEventsApi ? 'present' : 'missing',
    importance: 'high',
    impact: hasEventsApi ? 'Aktiv' : '+20% Event-Qualität',
  });
  if (hasEventsApi) score += 20;

  // Email/Phone Parameter
  const hasUserData = /identify.*?email/i.test(scriptsStr);
  parameters.push({
    name: 'user_data',
    displayName: 'User-Daten',
    status: hasUserData ? 'present' : 'missing',
    importance: 'high',
    impact: hasUserData ? 'Aktiv' : '+15% Match Rate',
  });
  if (hasUserData) score += 15;

  return {
    platform: 'TikTok',
    score: Math.min(100, score),
    parameters,
    hasServerSide: hasEventsApi,
    hasDedupe: hasEventsApi,
    estimatedMatchRate: Math.min(90, 50 + (hasEventsApi ? 25 : 0) + (hasUserData ? 15 : 0)),
  };
}

function analyzeLinkedInEventQuality(
  crawlResult: CrawlResult,
  trackingTags: TrackingTagsResult
): PlatformEventQuality {
  const parameters: EventQualityParameter[] = [];
  let score = 50;

  const hasConversions = crawlResult.scripts.some(s => 
    /lintrk.*?track.*?conversion/i.test(s)
  );
  parameters.push({
    name: 'conversions',
    displayName: 'Conversion Tracking',
    status: hasConversions ? 'present' : 'missing',
    importance: 'critical',
    impact: hasConversions ? 'Aktiv' : 'Für Lead-Tracking',
  });
  if (hasConversions) score += 20;

  const hasCapi = trackingTags.serverSideTracking.summary.hasLinkedInCAPI;
  parameters.push({
    name: 'capi',
    displayName: 'Conversions API',
    status: hasCapi ? 'present' : 'missing',
    importance: 'high',
    impact: hasCapi ? 'Aktiv' : '+20% Attribution',
  });
  if (hasCapi) score += 20;

  return {
    platform: 'LinkedIn',
    score: Math.min(100, score),
    parameters,
    hasServerSide: hasCapi,
    hasDedupe: hasCapi,
    estimatedMatchRate: Math.min(85, 45 + (hasConversions ? 20 : 0) + (hasCapi ? 20 : 0)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Funnel Validation Analyzer
// ═══════════════════════════════════════════════════════════════════════════

export function analyzeFunnelValidation(
  crawlResult: CrawlResult,
  dataLayerAnalysis: DataLayerAnalysisResult
): FunnelValidationResult {
  const isEcommerce = dataLayerAnalysis.ecommerce.detected;
  
  // Plattform-Erkennung
  const platform = detectEcommercePlatform(crawlResult);

  // Standard E-Commerce Funnel Steps
  const funnelSteps: FunnelStep[] = [
    {
      name: 'Produktliste',
      event: 'view_item_list',
      detected: false,
      hasRequiredParams: false,
      missingParams: [],
      issues: [],
    },
    {
      name: 'Produktansicht',
      event: 'view_item',
      detected: false,
      hasRequiredParams: false,
      missingParams: [],
      issues: [],
    },
    {
      name: 'In den Warenkorb',
      event: 'add_to_cart',
      detected: false,
      hasRequiredParams: false,
      missingParams: [],
      issues: [],
    },
    {
      name: 'Warenkorb',
      event: 'view_cart',
      detected: false,
      hasRequiredParams: false,
      missingParams: [],
      issues: [],
    },
    {
      name: 'Checkout Start',
      event: 'begin_checkout',
      detected: false,
      hasRequiredParams: false,
      missingParams: [],
      issues: [],
    },
    {
      name: 'Versand-Info',
      event: 'add_shipping_info',
      detected: false,
      hasRequiredParams: false,
      missingParams: [],
      issues: [],
    },
    {
      name: 'Zahlungs-Info',
      event: 'add_payment_info',
      detected: false,
      hasRequiredParams: false,
      missingParams: [],
      issues: [],
    },
    {
      name: 'Kauf',
      event: 'purchase',
      detected: false,
      hasRequiredParams: false,
      missingParams: [],
      issues: [],
    },
  ];

  // Prüfe jeden Funnel-Step
  const requiredParams: Record<string, string[]> = {
    view_item_list: ['items'],
    view_item: ['currency', 'value', 'items'],
    add_to_cart: ['currency', 'value', 'items'],
    view_cart: ['currency', 'value', 'items'],
    begin_checkout: ['currency', 'value', 'items'],
    add_shipping_info: ['currency', 'value', 'items'],
    add_payment_info: ['currency', 'value', 'items'],
    purchase: ['transaction_id', 'currency', 'value', 'items'],
  };

  for (const step of funnelSteps) {
    const ecomEvent = dataLayerAnalysis.ecommerce.events.find(e => e.name === step.event);
    
    if (ecomEvent?.detected) {
      step.detected = true;
      step.sampleData = ecomEvent.sampleData;
      
      // Prüfe Parameter
      const required = requiredParams[step.event] || [];
      const missing: string[] = [];
      
      if (required.includes('currency') && !ecomEvent.hasCurrency) {
        missing.push('currency');
        step.issues.push('Währung fehlt');
      }
      if (required.includes('value') && !ecomEvent.hasValue) {
        missing.push('value');
        step.issues.push('Wert fehlt');
      }
      if (required.includes('items') && !ecomEvent.hasItems) {
        missing.push('items');
        step.issues.push('Items fehlen');
      }
      if (required.includes('transaction_id') && step.event === 'purchase') {
        const hasTxId = ecomEvent.sampleData?.transaction_id !== undefined;
        if (!hasTxId) {
          missing.push('transaction_id');
          step.issues.push('Transaction ID fehlt');
        }
      }
      
      step.missingParams = missing;
      step.hasRequiredParams = missing.length === 0;
    }
  }

  // Berechne Score und finde kritische Lücken
  const detectedSteps = funnelSteps.filter(s => s.detected);
  const criticalSteps = ['add_to_cart', 'purchase'];
  const criticalGaps = criticalSteps.filter(
    event => !funnelSteps.find(s => s.event === event)?.detected
  );

  const overallScore = Math.round(
    (detectedSteps.filter(s => s.hasRequiredParams).length / funnelSteps.length) * 100
  );

  const recommendations: string[] = [];
  if (criticalGaps.includes('purchase')) {
    recommendations.push('⚠️ KRITISCH: Purchase-Event fehlt! Kein Conversion-Tracking möglich.');
  }
  if (criticalGaps.includes('add_to_cart')) {
    recommendations.push('Add-to-Cart Event implementieren für bessere Funnel-Analyse.');
  }
  if (!funnelSteps.find(s => s.event === 'view_item')?.detected) {
    recommendations.push('View-Item Event für Dynamic Remarketing aktivieren.');
  }

  return {
    isEcommerce,
    platform,
    funnelSteps,
    overallScore,
    criticalGaps,
    recommendations,
  };
}

function detectEcommercePlatform(crawlResult: CrawlResult): FunnelValidationResult['platform'] {
  const html = crawlResult.html.toLowerCase();
  const scripts = crawlResult.scripts.join(' ').toLowerCase();
  
  if (html.includes('shopify') || scripts.includes('shopify')) return 'shopify';
  if (html.includes('woocommerce') || scripts.includes('woocommerce')) return 'woocommerce';
  if (html.includes('shopware') || scripts.includes('shopware')) return 'shopware';
  if (html.includes('magento') || scripts.includes('magento')) return 'magento';
  
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// Cookie Lifetime Audit
// ═══════════════════════════════════════════════════════════════════════════

export function analyzeCookieLifetime(
  cookies: CookieResult[],
  trackingTags: TrackingTagsResult
): CookieLifetimeAuditResult {
  // Bekannte Tracking-Cookies und ihre normalen Lifetimes
  const trackingCookies: Record<string, { service: string; normalLifetime: number; affectsAttribution: boolean; affectsRemarketing: boolean }> = {
    '_ga': { service: 'Google Analytics', normalLifetime: 730, affectsAttribution: true, affectsRemarketing: false },
    '_ga_': { service: 'Google Analytics 4', normalLifetime: 730, affectsAttribution: true, affectsRemarketing: false },
    '_gid': { service: 'Google Analytics', normalLifetime: 1, affectsAttribution: false, affectsRemarketing: false },
    '_gcl_au': { service: 'Google Ads', normalLifetime: 90, affectsAttribution: true, affectsRemarketing: true },
    '_gcl_aw': { service: 'Google Ads', normalLifetime: 90, affectsAttribution: true, affectsRemarketing: true },
    '_gac_': { service: 'Google Ads', normalLifetime: 90, affectsAttribution: true, affectsRemarketing: false },
    '_fbp': { service: 'Meta Pixel', normalLifetime: 90, affectsAttribution: true, affectsRemarketing: true },
    '_fbc': { service: 'Meta Click ID', normalLifetime: 90, affectsAttribution: true, affectsRemarketing: false },
    '_ttp': { service: 'TikTok Pixel', normalLifetime: 390, affectsAttribution: true, affectsRemarketing: true },
    '_ttclid': { service: 'TikTok Click ID', normalLifetime: 90, affectsAttribution: true, affectsRemarketing: false },
    'li_fat_id': { service: 'LinkedIn', normalLifetime: 30, affectsAttribution: true, affectsRemarketing: true },
    '_pinterest_sess': { service: 'Pinterest', normalLifetime: 365, affectsAttribution: true, affectsRemarketing: true },
  };

  const impactedCookies: CookieLifetimeImpact[] = [];
  const ITP_LIMIT = 7; // Safari/Firefox ITP Limit in Tagen

  for (const cookie of cookies) {
    // Finde passenden Tracking-Cookie
    let matchedCookieInfo = trackingCookies[cookie.name];
    
    // Prüfe auch Prefix-Matches (z.B. _ga_XXXXX)
    if (!matchedCookieInfo) {
      for (const [prefix, info] of Object.entries(trackingCookies)) {
        if (cookie.name.startsWith(prefix)) {
          matchedCookieInfo = info;
          break;
        }
      }
    }

    if (matchedCookieInfo && cookie.lifetimeDays && cookie.lifetimeDays > ITP_LIMIT) {
      const impact: CookieLifetimeImpact['impact'] = 
        matchedCookieInfo.affectsAttribution ? 'high' :
        matchedCookieInfo.affectsRemarketing ? 'medium' : 'low';

      impactedCookies.push({
        cookieName: cookie.name,
        service: matchedCookieInfo.service,
        originalLifetime: cookie.lifetimeDays,
        itpLifetime: ITP_LIMIT,
        impact,
        affectsAttribution: matchedCookieInfo.affectsAttribution,
        affectsRemarketing: matchedCookieInfo.affectsRemarketing,
      });
    }
  }

  // Geschätzter Safari/iOS Anteil (typischerweise 25-35% in DACH)
  const safariUserPercentage = 30;
  
  // Geschätzter Datenverlust
  const highImpactCookies = impactedCookies.filter(c => c.impact === 'high');
  const estimatedDataLoss = highImpactCookies.length > 0 
    ? Math.round(safariUserPercentage * 0.4) // ~40% der Safari-User betroffen
    : 0;

  const recommendations: CookieLifetimeRecommendation[] = [];
  
  // Server-Side Tracking Empfehlung
  if (impactedCookies.length > 0 && !trackingTags.serverSideTracking.summary.hasServerSideGTM) {
    recommendations.push({
      priority: 'high',
      title: 'Server-Side GTM implementieren',
      description: 'Server-seitig gesetzte Cookies werden nicht von ITP eingeschränkt und haben volle Lifetime.',
      solution: 'Server-Side GTM auf eigener Subdomain einrichten (z.B. sgtm.example.com)',
    });
  }

  // First-Party Cookies Empfehlung
  if (impactedCookies.some(c => c.service.includes('Meta') || c.service.includes('TikTok'))) {
    recommendations.push({
      priority: 'medium',
      title: 'Conversions API aktivieren',
      description: 'Server-Side APIs (Meta CAPI, TikTok Events API) sind von Browser-Einschränkungen nicht betroffen.',
      solution: 'CAPI über GTM Server-Side Container oder direkte Integration einrichten.',
    });
  }

  return {
    totalCookies: cookies.length,
    impactedCookies,
    safariUserPercentage,
    estimatedDataLoss,
    recommendations,
    serverSideWouldHelp: impactedCookies.length > 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Ungenutztes Potenzial Scanner
// ═══════════════════════════════════════════════════════════════════════════

export function analyzeUnusedPotential(
  crawlResult: CrawlResult,
  trackingTags: TrackingTagsResult,
  dataLayerAnalysis: DataLayerAnalysisResult
): UnusedPotentialResult {
  const totalPotential: UnusedPotentialItem[] = [];
  const missingPlatforms: MissingPlatform[] = [];

  // 1. Meta Pixel installiert aber ohne Conversions API
  if (trackingTags.metaPixel.detected && !trackingTags.metaPixel.serverSide?.detected) {
    totalPotential.push({
      type: 'incomplete_setup',
      platform: 'Meta',
      title: 'Meta Conversions API fehlt',
      description: 'Der Meta Pixel ist installiert, aber ohne Server-Side Integration.',
      currentState: 'Nur Browser-Pixel aktiv',
      recommendation: 'Meta CAPI implementieren für bessere Event-Qualität',
      estimatedImpact: '+20-30% Event Match Quality',
      difficulty: 'medium',
    });
  }

  // 2. Google Ads ohne Enhanced Conversions
  if (trackingTags.googleAdsConversion.detected) {
    const hasEnhanced = crawlResult.scripts.some(s => /enhanced.*conversion/i.test(s));
    if (!hasEnhanced) {
      totalPotential.push({
        type: 'incomplete_setup',
        platform: 'Google Ads',
        title: 'Enhanced Conversions nicht aktiv',
        description: 'Google Ads ist installiert, aber Enhanced Conversions fehlt.',
        currentState: 'Standard Conversion Tracking',
        recommendation: 'Enhanced Conversions für bessere Attribution aktivieren',
        estimatedImpact: '+15% messbare Conversions',
        difficulty: 'easy',
      });
    }
  }

  // 3. E-Commerce ohne vollständiges Tracking
  if (dataLayerAnalysis.ecommerce.detected) {
    const events = dataLayerAnalysis.ecommerce.events;
    const hasPurchase = events.some(e => e.name === 'purchase' && e.detected);
    const hasViewItem = events.some(e => e.name === 'view_item' && e.detected);
    
    if (hasPurchase && !hasViewItem) {
      totalPotential.push({
        type: 'missing_events',
        platform: 'E-Commerce',
        title: 'Dynamic Remarketing nicht möglich',
        description: 'Purchase-Tracking vorhanden, aber view_item fehlt.',
        currentState: 'Nur Conversion Tracking',
        recommendation: 'view_item Event für Dynamic Remarketing implementieren',
        estimatedImpact: '+30-50% Remarketing ROAS',
        difficulty: 'medium',
      });
    }
  }

  // 4. TikTok Pixel fehlt komplett
  if (!trackingTags.tiktokPixel.detected) {
    missingPlatforms.push({
      platform: 'TikTok',
      reason: 'Nicht installiert',
      audienceReach: '~25% der 18-34 Jährigen',
      recommendedFor: ['E-Commerce', 'D2C Brands', 'Junge Zielgruppen'],
    });
  }

  // 5. Pinterest fehlt
  if (!trackingTags.pinterestTag.detected && dataLayerAnalysis.ecommerce.detected) {
    missingPlatforms.push({
      platform: 'Pinterest',
      reason: 'Nicht installiert',
      audienceReach: '~15% kaufbereite Nutzer',
      recommendedFor: ['Mode', 'Home & Living', 'DIY', 'Food'],
    });
  }

  // 6. LinkedIn fehlt (für B2B)
  if (!trackingTags.linkedInInsight.detected) {
    missingPlatforms.push({
      platform: 'LinkedIn',
      reason: 'Nicht installiert',
      audienceReach: '~20% B2B Entscheider',
      recommendedFor: ['B2B', 'SaaS', 'Recruiting', 'High-Value Products'],
    });
  }

  // 7. Kein Server-Side Tracking
  if (!trackingTags.serverSideTracking.detected) {
    totalPotential.push({
      type: 'incomplete_setup',
      platform: 'Alle',
      title: 'Kein Server-Side Tracking',
      description: 'Alle Tracking-Daten werden nur browser-seitig erfasst.',
      currentState: 'Nur Client-Side Tracking',
      recommendation: 'Server-Side GTM für robusteres Tracking implementieren',
      estimatedImpact: '+15-25% Datenqualität',
      difficulty: 'hard',
    });
  }

  // Geschätzter monatlicher Wert (sehr grobe Schätzung)
  const estimatedMonthlyValue = 
    totalPotential.length * 500 + 
    missingPlatforms.length * 300;

  // Quick Wins (einfache Verbesserungen)
  const quickWins = totalPotential.filter(p => p.difficulty === 'easy');

  return {
    totalPotential,
    estimatedMonthlyValue,
    quickWins,
    missingPlatforms,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ROAS-Daten-Qualitäts-Check
// ═══════════════════════════════════════════════════════════════════════════

export function analyzeROASQuality(
  dataLayerAnalysis: DataLayerAnalysisResult
): ROASQualityResult {
  const valueTracking = dataLayerAnalysis.ecommerce.valueTracking;
  
  // Value Tracking Analyse
  const valueTrackingResult: ROASValueTracking = {
    hasTransactionId: false,
    transactionIdUnique: false,
    hasValue: valueTracking.hasTransactionValue,
    valueIncludesTax: null,
    hasCurrency: valueTracking.hasCurrency,
    currencyConsistent: true, // Annahme
    hasItems: valueTracking.hasItemData,
    itemsComplete: false,
  };

  // Prüfe purchase Event im Detail
  const purchaseEvent = dataLayerAnalysis.ecommerce.events.find(e => e.name === 'purchase');
  if (purchaseEvent?.sampleData) {
    valueTrackingResult.hasTransactionId = purchaseEvent.sampleData.transaction_id !== undefined;
    valueTrackingResult.transactionIdUnique = valueTrackingResult.hasTransactionId;
  }

  // Parameter Analyse
  const parameters: ROASParameter[] = [
    {
      name: 'transaction_id',
      displayName: 'Transaction ID',
      status: valueTrackingResult.hasTransactionId ? 'present' : 'missing',
      importance: 'critical',
      affects: ['ROAS', 'Deduplizierung', 'Reporting'],
    },
    {
      name: 'value',
      displayName: 'Bestellwert',
      status: valueTrackingResult.hasValue ? 'present' : 'missing',
      importance: 'critical',
      affects: ['ROAS', 'Wertbasiertes Bidding'],
    },
    {
      name: 'currency',
      displayName: 'Währung',
      status: valueTrackingResult.hasCurrency ? 'present' : 'missing',
      importance: 'critical',
      affects: ['ROAS', 'Multi-Market'],
    },
    {
      name: 'items',
      displayName: 'Produkt-Daten',
      status: valueTrackingResult.hasItems ? 'present' : 'missing',
      importance: 'recommended',
      affects: ['Dynamic Remarketing', 'Produkt-Reporting'],
    },
    {
      name: 'tax',
      displayName: 'Steuer',
      status: valueTracking.valueParameters.includes('tax') ? 'present' : 'missing',
      importance: 'recommended',
      affects: ['Genaues Reporting'],
    },
    {
      name: 'shipping',
      displayName: 'Versand',
      status: valueTracking.valueParameters.includes('shipping') ? 'present' : 'missing',
      importance: 'optional',
      affects: ['Genaues Reporting'],
    },
    {
      name: 'coupon',
      displayName: 'Gutschein-Code',
      status: valueTracking.valueParameters.includes('coupon') ? 'present' : 'missing',
      importance: 'optional',
      affects: ['Promotion Tracking'],
    },
  ];

  const missingCritical = parameters
    .filter(p => p.importance === 'critical' && p.status === 'missing')
    .map(p => p.name);
  
  const missingRecommended = parameters
    .filter(p => p.importance === 'recommended' && p.status === 'missing')
    .map(p => p.name);

  const dataCompleteness: ROASDataCompleteness = {
    parameters,
    missingCritical,
    missingRecommended,
  };

  // Geschätzter Datenverlust
  const estimatedDataLoss = 
    missingCritical.length * 15 + 
    missingRecommended.length * 5;

  // Score berechnen
  const criticalPresent = parameters.filter(p => p.importance === 'critical' && p.status === 'present').length;
  const criticalTotal = parameters.filter(p => p.importance === 'critical').length;
  const recommendedPresent = parameters.filter(p => p.importance === 'recommended' && p.status === 'present').length;
  const recommendedTotal = parameters.filter(p => p.importance === 'recommended').length;

  const overallScore = Math.round(
    (criticalPresent / criticalTotal) * 70 + 
    (recommendedPresent / recommendedTotal) * 30
  );

  // Empfehlungen
  const recommendations: ROASRecommendation[] = [];
  
  if (!valueTrackingResult.hasTransactionId) {
    recommendations.push({
      priority: 'critical',
      title: 'Transaction ID hinzufügen',
      description: 'Ohne eindeutige Transaction ID können Conversions nicht dedupliziert werden.',
      impact: 'Verhindert doppelte Conversions, ermöglicht genaues Reporting',
      implementation: 'Bestell-ID aus Shop-System im DataLayer übergeben',
    });
  }

  if (!valueTrackingResult.hasValue) {
    recommendations.push({
      priority: 'critical',
      title: 'Bestellwert übergeben',
      description: 'Ohne Wert ist kein ROAS-Tracking möglich.',
      impact: 'Ermöglicht wertbasiertes Bidding und ROAS-Optimierung',
      implementation: 'Order Total (inkl./exkl. MwSt) als value Parameter',
    });
  }

  if (!valueTrackingResult.hasItems) {
    recommendations.push({
      priority: 'high',
      title: 'Item-Daten hinzufügen',
      description: 'Produktdaten fehlen für Dynamic Remarketing.',
      impact: 'Ermöglicht personalisierte Anzeigen mit gekauften Produkten',
      implementation: 'items Array mit item_id, item_name, price, quantity',
    });
  }

  return {
    overallScore,
    valueTracking: valueTrackingResult,
    dataCompleteness,
    estimatedDataLoss: Math.min(50, estimatedDataLoss),
    recommendations,
  };
}
