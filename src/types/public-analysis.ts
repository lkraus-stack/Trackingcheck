export type PublicFindingSeverity = 'error' | 'warning' | 'info';
export type PublicFindingKind = 'compliance' | 'data_quality' | 'optimization' | 'technical';
export type PublicFindingConfidence = 'high' | 'medium' | 'low';

export interface PublicAnalysisFinding {
  id: string;
  severity: PublicFindingSeverity;
  kind: PublicFindingKind;
  confidence: PublicFindingConfidence;
  title: string;
  description: string;
  recommendation?: string;
  evidence: string[];
}

export interface PublicAnalysisSummary {
  cookieBannerDetected: boolean;
  cookieBannerHasRejectButton: boolean;
  consentModeDetected: boolean;
  consentModeVersion?: 'v1' | 'v2';
  trackingBeforeConsent?: boolean;
  serverSideTrackingDetected: boolean;
  ecommerceDetected: boolean;
  ecommerceHasTransactionValue: boolean;
  thirdPartyTotalCount?: number;
  detectedTrackers: string[];
}

export interface PublicAnalysisResult {
  url: string;
  timestamp: string;
  score: number;
  findings: PublicAnalysisFinding[];
  summary: PublicAnalysisSummary;
  fromCache?: boolean;
}

