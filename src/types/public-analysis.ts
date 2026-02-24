export type PublicFindingSeverity = 'error' | 'warning' | 'info';

export interface PublicAnalysisFinding {
  id: string;
  severity: PublicFindingSeverity;
  title: string;
  description: string;
  recommendation?: string;
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
}

export interface PublicAnalysisResult {
  url: string;
  timestamp: string;
  score: number;
  findings: PublicAnalysisFinding[];
  summary: PublicAnalysisSummary;
  fromCache?: boolean;
}

