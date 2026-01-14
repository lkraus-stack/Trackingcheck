// Tracking Checker Types

export interface AnalysisResult {
  url: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  
  // Cookie Banner / CMP
  cookieBanner: CookieBannerResult;
  
  // TCF (IAB Framework)
  tcf: TCFResult;
  
  // Google Consent Mode
  googleConsentMode: GoogleConsentModeResult;
  
  // Tracking Tags
  trackingTags: TrackingTagsResult;
  
  // Cookies
  cookies: CookieResult[];
  
  // Cookie Consent Test
  cookieConsentTest?: CookieConsentTestResult;
  
  // DataLayer & E-Commerce
  dataLayerAnalysis: DataLayerAnalysisResult;
  
  // Third-Party Domains
  thirdPartyDomains: ThirdPartyDomainsResult;
  
  // DSGVO Compliance Checklist
  gdprChecklist: GDPRChecklistResult;
  
  // DMA (Digital Markets Act) Check
  dmaCheck: DMACheckResult;
  
  // Overall Score
  score: number;
  issues: Issue[];
  
  // Analyse-Prozess Info (für UI)
  analysisSteps?: AnalysisStep[];
}

// Analyse-Schritte für KI-ähnliche Gedankengänge in der UI
export interface AnalysisStep {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message: string;
  details?: string;
  timestamp?: number;
}

export interface CookieBannerResult {
  detected: boolean;
  provider?: string;
  hasAcceptButton: boolean;
  hasRejectButton: boolean;
  hasEssentialSaveButton?: boolean; // "Speichern" Button der nur essentielle Cookies zulässt
  hasSettingsOption: boolean;
  blocksContent: boolean;
  hasPrivacyPolicyLink?: boolean;
}

export interface TCFResult {
  detected: boolean;
  version?: string;
  cmpId?: number;
  cmpName?: string;
  tcString?: string;
  validTcString: boolean;
  gdprApplies?: boolean;
}

export interface GoogleConsentModeResult {
  detected: boolean;
  version?: 'v1' | 'v2';
  defaultConsent?: ConsentSettings;
  // NEU: Update Consent Erkennung
  updateConsent?: {
    detected: boolean;
    triggeredAfterBanner: boolean;
    updateSettings?: ConsentSettings;
    updateTrigger?: 'banner_click' | 'tcf_api' | 'custom' | 'unknown';
  };
  parameters: {
    ad_storage: boolean;
    analytics_storage: boolean;
    ad_user_data: boolean;
    ad_personalization: boolean;
    functionality_storage: boolean;
    personalization_storage: boolean;
    security_storage: boolean;
  };
  // NEU: Regions-spezifische Einstellungen
  regionSettings?: {
    detected: boolean;
    regions: string[];
  };
  // NEU: Wait for Update
  waitForUpdate?: {
    detected: boolean;
    timeout?: number;
  };
}

export interface ConsentSettings {
  ad_storage?: 'granted' | 'denied';
  analytics_storage?: 'granted' | 'denied';
  ad_user_data?: 'granted' | 'denied';
  ad_personalization?: 'granted' | 'denied';
  functionality_storage?: 'granted' | 'denied';
  personalization_storage?: 'granted' | 'denied';
  security_storage?: 'granted' | 'denied';
}

// NEU: DataLayer & E-Commerce Analyse
export interface DataLayerAnalysisResult {
  hasDataLayer: boolean;
  events: DataLayerEvent[];
  ecommerce: EcommerceAnalysis;
  customDimensions: string[];
  userProperties: string[];
  // NEU: Roher DataLayer Inhalt für Anzeige
  rawDataLayer?: DataLayerEntry[];
}

// Einzelner DataLayer Eintrag
export interface DataLayerEntry {
  index: number;
  event?: string;
  timestamp?: string;
  data: Record<string, unknown>;
  type: 'gtm.js' | 'gtm.dom' | 'gtm.load' | 'consent' | 'ecommerce' | 'pageview' | 'custom' | 'config';
  hasEcommerce: boolean;
  hasConsent: boolean;
}

export interface DataLayerEvent {
  event: string;
  count: number;
  hasEcommerceData: boolean;
  parameters?: string[];
}

export interface EcommerceAnalysis {
  detected: boolean;
  platform?: 'ga4' | 'ua' | 'both' | 'unknown';
  events: EcommerceEvent[];
  // Wertübergabe-Analyse
  valueTracking: {
    hasTransactionValue: boolean;
    hasCurrency: boolean;
    hasItemData: boolean;
    hasUserData: boolean;
    valueParameters: string[];
    missingRecommended: string[];
  };
  issues: EcommerceIssue[];
}

export interface EcommerceEvent {
  name: string;
  detected: boolean;
  hasValue: boolean;
  hasCurrency: boolean;
  hasItems: boolean;
  sampleData?: Record<string, unknown>;
}

export interface EcommerceIssue {
  severity: 'error' | 'warning' | 'info';
  event: string;
  issue: string;
  recommendation: string;
}

// NEU: Third-Party Domain Analyse
export interface ThirdPartyDomainsResult {
  totalCount: number;
  domains: ThirdPartyDomain[];
  categories: {
    advertising: number;
    analytics: number;
    social: number;
    cdn: number;
    functional: number;
    unknown: number;
  };
  riskAssessment: {
    highRiskDomains: string[];
    crossBorderTransfers: string[];
    unknownDomains: string[];
  };
}

export interface ThirdPartyDomain {
  domain: string;
  category: 'advertising' | 'analytics' | 'social' | 'cdn' | 'functional' | 'unknown';
  requestCount: number;
  cookiesSet: number;
  dataTypes: string[];
  company?: string;
  country?: string;
  isEUBased?: boolean;
}

// NEU: DSGVO Checklist
export interface GDPRChecklistResult {
  score: number;
  checks: GDPRCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    notApplicable: number;
  };
}

export interface GDPRCheck {
  id: string;
  category: 'consent' | 'transparency' | 'data_minimization' | 'security' | 'rights';
  title: string;
  description: string;
  status: 'passed' | 'failed' | 'warning' | 'not_applicable';
  legalReference?: string;
  details?: string;
  recommendation?: string;
}

// NEU: DMA Check
export interface DMACheckResult {
  applicable: boolean;
  gatekeepersDetected: string[];
  checks: DMACheck[];
  summary: {
    compliant: number;
    nonCompliant: number;
    requiresReview: number;
  };
}

export interface DMACheck {
  id: string;
  gatekeeper: string;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'requires_review';
  details: string;
  recommendation?: string;
}

export interface TrackingTagsResult {
  googleAnalytics: {
    detected: boolean;
    version?: 'UA' | 'GA4';
    measurementId?: string;
    measurementIds: string[];
    hasMultipleMeasurementIds: boolean;
    hasLegacyUA: boolean;
    loadedViaGTM: boolean;
  };
  googleTagManager: {
    detected: boolean;
    containerId?: string;
    containerIds: string[];
    hasMultipleContainers: boolean;
    serverSideGTM?: ServerSideGTMResult;
  };
  googleAdsConversion: {
    detected: boolean;
    conversionId?: string;
    conversionIds: string[];
    hasRemarketing: boolean;
    loadedViaGTM: boolean;
  };
  metaPixel: {
    detected: boolean;
    pixelId?: string;
    pixelIds: string[];
    hasMultiplePixels: boolean;
    loadedViaGTM: boolean;
    detectionMethod: ('script' | 'network' | 'window' | 'dataLayer')[];
    serverSide?: MetaServerSideResult;
  };
  linkedInInsight: {
    detected: boolean;
    partnerId?: string;
    loadedViaGTM: boolean;
  };
  tiktokPixel: {
    detected: boolean;
    pixelId?: string;
    loadedViaGTM: boolean;
  };
  pinterestTag: {
    detected: boolean;
    tagId?: string;
    loadedViaGTM: boolean;
  };
  snapchatPixel: {
    detected: boolean;
    pixelId?: string;
    loadedViaGTM: boolean;
  };
  twitterPixel: {
    detected: boolean;
    pixelId?: string;
    loadedViaGTM: boolean;
  };
  redditPixel: {
    detected: boolean;
    pixelId?: string;
    loadedViaGTM: boolean;
  };
  bingAds: {
    detected: boolean;
    tagId?: string;
    loadedViaGTM: boolean;
  };
  criteo: {
    detected: boolean;
    accountId?: string;
    loadedViaGTM: boolean;
  };
  other: Array<{
    name: string;
    detected: boolean;
    identifier?: string;
    loadedViaGTM?: boolean;
  }>;
  marketingParameters: {
    gclid: boolean;
    dclid: boolean;
    wbraid: boolean;
    pbraid: boolean;
    fbclid: boolean;
    msclkid: boolean;
    ttclid: boolean;
    li_fat_id: boolean;
    utm: boolean;
    any: boolean;
  };
  serverSideTracking: ServerSideTrackingResult;
}

export interface ServerSideGTMResult {
  detected: boolean;
  endpoint?: string;
  isFirstParty: boolean;
  domain?: string;
  // NEU: Erweiterte Server-Side Infos
  transportUrl?: string;
  firstPartyCookies?: string[];
}

export interface MetaServerSideResult {
  detected: boolean;
  hasConversionsAPI: boolean;
  eventIds: string[];
  indicators: string[];
  // NEU: Deduplizierung
  hasDedupe: boolean;
  dedupeMethod?: 'event_id' | 'external_id' | 'both';
}

export interface ServerSideTrackingResult {
  detected: boolean;
  indicators: ServerSideIndicator[];
  firstPartyEndpoints: FirstPartyEndpoint[];
  // NEU: Erweiterte Analyse
  cookieBridging: {
    detected: boolean;
    cookies: string[];
    indicators: string[];
  };
  summary: {
    hasServerSideGTM: boolean;
    hasMetaCAPI: boolean;
    hasFirstPartyProxy: boolean;
    hasTikTokEventsAPI: boolean;
    hasLinkedInCAPI: boolean;
    hasCookieBridging: boolean;
  };
}

export interface ServerSideIndicator {
  type: 'sgtm' | 'meta_capi' | 'tiktok_events_api' | 'linkedin_capi' | 'first_party_proxy' | 'custom_endpoint' | 'cookie_bridging';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  evidence: string[];
}

export interface FirstPartyEndpoint {
  url: string;
  type: 'gtm' | 'analytics' | 'pixel' | 'unknown';
  originalService?: string;
}

export interface CookieResult {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
  category?: 'necessary' | 'functional' | 'analytics' | 'marketing' | 'unknown';
  lifetimeDays?: number;
  isLongLived?: boolean;
  // NEU: Erweiterte Cookie-Infos
  isThirdParty?: boolean;
  service?: string;
  purpose?: string;
}

// Cookie Consent Test Ergebnisse
export interface CookieConsentTestResult {
  // Cookies vor jeder Interaktion
  beforeConsent: {
    cookies: CookieResult[];
    cookieCount: number;
    trackingCookiesFound: boolean;
  };
  // Cookies nach "Akzeptieren"
  afterAccept: {
    cookies: CookieResult[];
    cookieCount: number;
    newCookies: CookieResult[];
    clickSuccessful: boolean;
    buttonFound: boolean;
  };
  // Cookies nach "Ablehnen" (separater Test)
  afterReject: {
    cookies: CookieResult[];
    cookieCount: number;
    newCookies: CookieResult[];
    clickSuccessful: boolean;
    buttonFound: boolean;
  };
  // Analyse/Bewertung
  analysis: {
    consentWorksProperly: boolean;
    rejectWorksProperly: boolean;
    trackingBeforeConsent: boolean;
    issues: CookieConsentIssue[];
  };
}

export interface CookieConsentIssue {
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface Issue {
  severity: 'error' | 'warning' | 'info';
  category: 'cookie-banner' | 'tcf' | 'consent-mode' | 'tracking' | 'cookies' | 'general' | 'gdpr' | 'dma' | 'ecommerce';
  title: string;
  description: string;
  recommendation?: string;
}

export interface AnalysisRequest {
  url: string;
  options?: {
    skipCache?: boolean;
    deepScan?: boolean;
    quickScan?: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  analysisResult?: AnalysisResult;
}

// NEU: Analyse-Historie
export interface AnalysisHistoryItem {
  id: string;
  url: string;
  timestamp: string;
  score: number;
  status: 'success' | 'error';
  summary: {
    cookieBannerDetected: boolean;
    consentModeVersion?: string;
    trackingTagsCount: number;
    issuesCount: number;
    gdprScore: number;
  };
}

// NEU: Cache-Eintrag
export interface CachedAnalysis {
  result: AnalysisResult;
  timestamp: number;
  expiresAt: number;
}
