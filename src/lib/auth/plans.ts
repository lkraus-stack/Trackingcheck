export type PlanId = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
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

const PLAN_DEFAULTS: Record<PlanId, PlanLimits> = {
  free: {
    plan: 'free',
    maxAnalysesPerMonth: 10,
    maxProjects: 3,
    maxAnalysesPerDay: 5,
    aiAnalysisEnabled: false,
    aiChatEnabled: false,
    exportPdfEnabled: false,
    deepScanEnabled: false,
    apiAccessEnabled: false,
  },
  pro: {
    plan: 'pro',
    maxAnalysesPerMonth: 100,
    maxProjects: 50,
    maxAnalysesPerDay: 30,
    aiAnalysisEnabled: true,
    aiChatEnabled: true,
    exportPdfEnabled: true,
    deepScanEnabled: true,
    apiAccessEnabled: false,
  },
  enterprise: {
    plan: 'enterprise',
    maxAnalysesPerMonth: 0, // 0 = unlimited
    maxProjects: 0,
    maxAnalysesPerDay: 0,
    aiAnalysisEnabled: true,
    aiChatEnabled: true,
    exportPdfEnabled: true,
    deepScanEnabled: true,
    apiAccessEnabled: true,
  },
};

export function getPlanDefaults(plan: PlanId): PlanLimits {
  return PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.free;
}

export function normalizePlan(plan?: string | null): PlanId {
  if (plan === 'pro' || plan === 'enterprise') return plan;
  return 'free';
}
