import { DefaultSession } from 'next-auth';

type PlanId = 'free' | 'pro' | 'enterprise';
type UserRole = 'user' | 'admin';

interface SubscriptionInfo {
  plan: PlanId;
  status: string;
}

interface UsageLimitsInfo {
  plan: PlanId;
  maxAnalysesPerMonth: number;
  maxProjects: number;
  maxAnalysesPerDay: number;
  aiAnalysisEnabled: boolean;
  aiChatEnabled: boolean;
  exportPdfEnabled: boolean;
  deepScanEnabled: boolean;
  apiAccessEnabled: boolean;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      subscription?: SubscriptionInfo;
      usageLimits?: UsageLimitsInfo;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
  }
}
