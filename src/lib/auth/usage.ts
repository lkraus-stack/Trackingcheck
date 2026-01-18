import { prisma } from '@/lib/db/prisma'

export type UsageType = 'analyses' | 'aiRequests' | 'apiCalls'

export interface UsageCheckResult {
  allowed: boolean
  message?: string
  currentUsage?: number
  limit?: number
  resetDate?: Date
}

/**
 * Prüft ob User ein bestimmtes Limit erreicht hat
 */
export async function checkUsageLimits(
  userId: string,
  type: UsageType
): Promise<UsageCheckResult> {
  try {
    const limits = await prisma.usageLimits.findUnique({
      where: { userId },
    })

    if (!limits) {
      // Default free limits wenn nicht vorhanden
      return {
        allowed: true,
        currentUsage: 0,
        limit: getDefaultLimit(type, 'free'),
      }
    }

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    // Hole aktuelle Usage Stats für diesen Monat
    const monthlyStats = await prisma.usageStats.findMany({
      where: {
        userId,
        date: { gte: firstDayOfMonth },
      },
    })

    // Berechne aktuelle Usage
    const currentMonthUsage = monthlyStats.reduce((sum, stat) => {
      if (type === 'analyses') return sum + stat.analysesCount
      if (type === 'aiRequests') return sum + stat.aiRequests
      if (type === 'apiCalls') return sum + stat.apiCalls
      return sum
    }, 0)

    // Hole heutige Usage (für tägliche Limits)
    const todayStats = await prisma.usageStats.findFirst({
      where: {
        userId,
        date: { gte: new Date(now.setHours(0, 0, 0, 0)) },
      },
    })

    const todayUsage = todayStats
      ? type === 'analyses'
        ? todayStats.analysesCount
        : type === 'aiRequests'
          ? todayStats.aiRequests
          : todayStats.apiCalls
      : 0

    // Prüfe monatliche Limits
    if (type === 'analyses') {
      const monthlyLimit = limits.maxAnalysesPerMonth
      if (monthlyLimit > 0 && currentMonthUsage >= monthlyLimit) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        return {
          allowed: false,
          message: `Monatliches Analyse-Limit erreicht (${monthlyLimit}/${monthlyLimit}). Upgrade auf Pro für mehr Analysen.`,
          currentUsage: currentMonthUsage,
          limit: monthlyLimit,
          resetDate: nextMonth,
        }
      }

      // Prüfe tägliche Limits
      const dailyLimit = limits.maxAnalysesPerDay
      if (dailyLimit > 0 && todayUsage >= dailyLimit) {
        return {
          allowed: false,
          message: `Tägliches Analyse-Limit erreicht (${dailyLimit}/${dailyLimit}). Versuche es morgen erneut oder upgrade auf Pro.`,
          currentUsage: todayUsage,
          limit: dailyLimit,
          resetDate: tomorrow,
        }
      }
    }

    // Feature-Flags prüfen
    if (type === 'aiRequests' && !limits.aiChatEnabled) {
      return {
        allowed: false,
        message: 'KI-Chat ist nur für Pro- und Enterprise-User verfügbar.',
        currentUsage: 0,
        limit: 0,
      }
    }

    if (type === 'apiCalls' && !limits.apiAccessEnabled) {
      return {
        allowed: false,
        message: 'API-Zugriff ist nur für Enterprise-User verfügbar.',
        currentUsage: 0,
        limit: 0,
      }
    }

    return {
      allowed: true,
      currentUsage: type === 'analyses' ? currentMonthUsage : todayUsage,
      limit: type === 'analyses' ? limits.maxAnalysesPerMonth : limits.maxAnalysesPerDay,
    }
  } catch (error) {
    console.error('Error checking usage limits:', error)
    // Bei Fehler erlauben (fail-open)
    return { allowed: true }
  }
}

/**
 * Inkrementiert Usage Stats
 */
export async function incrementUsage(
  userId: string,
  type: UsageType,
  amount: number = 1
): Promise<void> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingStats = await prisma.usageStats.findFirst({
      where: {
        userId,
        date: { gte: today },
      },
    })

    if (existingStats) {
      // Update existing stats
      await prisma.usageStats.update({
        where: { id: existingStats.id },
        data: {
          analysesCount: type === 'analyses' ? existingStats.analysesCount + amount : existingStats.analysesCount,
          aiRequests: type === 'aiRequests' ? existingStats.aiRequests + amount : existingStats.aiRequests,
          apiCalls: type === 'apiCalls' ? existingStats.apiCalls + amount : existingStats.apiCalls,
        },
      })
    } else {
      // Create new stats for today
      await prisma.usageStats.create({
        data: {
          userId,
          date: today,
          analysesCount: type === 'analyses' ? amount : 0,
          aiRequests: type === 'aiRequests' ? amount : 0,
          apiCalls: type === 'apiCalls' ? amount : 0,
        },
      })
    }
  } catch (error) {
    console.error('Error incrementing usage:', error)
    // Fail silently - don't block user experience
  }
}

/**
 * Holt Default Limits für einen Plan
 */
function getDefaultLimit(type: UsageType, plan: string): number {
  const limits: Record<string, Record<UsageType, number>> = {
    free: {
      analyses: 10,
      aiRequests: 0,
      apiCalls: 0,
    },
    pro: {
      analyses: 100,
      aiRequests: 1000,
      apiCalls: 0,
    },
    enterprise: {
      analyses: 0, // unlimited
      aiRequests: 0, // unlimited
      apiCalls: 10000,
    },
  }

  return limits[plan]?.[type] ?? 0
}

/**
 * Prüft ob ein Feature für User verfügbar ist
 */
export async function checkFeatureAccess(
  userId: string,
  feature: 'aiAnalysis' | 'aiChat' | 'exportPdf' | 'deepScan' | 'apiAccess'
): Promise<boolean> {
  try {
    const limits = await prisma.usageLimits.findUnique({
      where: { userId },
    })

    if (!limits) return false

    switch (feature) {
      case 'aiAnalysis':
        return limits.aiAnalysisEnabled
      case 'aiChat':
        return limits.aiChatEnabled
      case 'exportPdf':
        return limits.exportPdfEnabled
      case 'deepScan':
        return limits.deepScanEnabled
      case 'apiAccess':
        return limits.apiAccessEnabled
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking feature access:', error)
    return false
  }
}
