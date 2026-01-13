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
  
  // Overall Score
  score: number;
  issues: Issue[];
}

export interface CookieBannerResult {
  detected: boolean;
  provider?: string;
  hasAcceptButton: boolean;
  hasRejectButton: boolean;
  hasSettingsOption: boolean;
  blocksContent: boolean;
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
  parameters: {
    ad_storage: boolean;
    analytics_storage: boolean;
    ad_user_data: boolean;
    ad_personalization: boolean;
    functionality_storage: boolean;
    personalization_storage: boolean;
    security_storage: boolean;
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
}

export interface MetaServerSideResult {
  detected: boolean;
  hasConversionsAPI: boolean;
  eventIds: string[];
  indicators: string[];
}

export interface ServerSideTrackingResult {
  detected: boolean;
  indicators: ServerSideIndicator[];
  firstPartyEndpoints: FirstPartyEndpoint[];
  summary: {
    hasServerSideGTM: boolean;
    hasMetaCAPI: boolean;
    hasFirstPartyProxy: boolean;
    hasTikTokEventsAPI: boolean;
    hasLinkedInCAPI: boolean;
  };
}

export interface ServerSideIndicator {
  type: 'sgtm' | 'meta_capi' | 'tiktok_events_api' | 'linkedin_capi' | 'first_party_proxy' | 'custom_endpoint';
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
}

export interface Issue {
  severity: 'error' | 'warning' | 'info';
  category: 'cookie-banner' | 'tcf' | 'consent-mode' | 'tracking' | 'cookies' | 'general';
  title: string;
  description: string;
  recommendation?: string;
}

export interface AnalysisRequest {
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  analysisResult?: AnalysisResult;
}
