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
 * WICHTIG: Für eingeloggte User KEINE Limits - unbegrenzte Analysen
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
      // Fallback: keine Limits, wenn Limits fehlen
      return {
        allowed: true,
        currentUsage: 0,
        limit: 0, // 0 = unlimited
      }
    }

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Für aiRequests und apiCalls berechne Usage
    const monthlyStats = await prisma.usageStats.findMany({
      where: {
        userId,
        date: { gte: firstDayOfMonth },
      },
    })

    const currentMonthUsage = monthlyStats.reduce((sum, stat) => {
      if (type === 'aiRequests') return sum + stat.aiRequests
      if (type === 'apiCalls') return sum + stat.apiCalls
      return sum
    }, 0)

    // Hole heutige Usage (für Info)
    const todayStats = await prisma.usageStats.findFirst({
      where: {
        userId,
        date: { gte: new Date(now.setHours(0, 0, 0, 0)) },
      },
    })

    const todayUsage = todayStats
      ? type === 'aiRequests'
        ? todayStats.aiRequests
        : todayStats.apiCalls
      : 0

    if (type === 'analyses') {
      const currentMonthAnalyses = monthlyStats.reduce(
        (sum, stat) => sum + stat.analysesCount,
        0
      )

      const monthLimit = limits.maxAnalysesPerMonth
      const dayLimit = limits.maxAnalysesPerDay
      const todayAnalyses = todayStats?.analysesCount || 0

      if (monthLimit > 0 && currentMonthAnalyses >= monthLimit) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        return {
          allowed: false,
          message: `Monatslimit von ${monthLimit} Analysen erreicht.`,
          currentUsage: currentMonthAnalyses,
          limit: monthLimit,
          resetDate: nextMonth,
        }
      }

      if (dayLimit > 0 && todayAnalyses >= dayLimit) {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        return {
          allowed: false,
          message: `Tageslimit von ${dayLimit} Analysen erreicht.`,
          currentUsage: todayAnalyses,
          limit: dayLimit,
          resetDate: tomorrow,
        }
      }

      return {
        allowed: true,
        currentUsage: currentMonthAnalyses,
        limit: monthLimit,
        resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      }
    }

    // Feature-Flags prüfen (nur für aiRequests und apiCalls)
    if (type === 'aiRequests' && !limits.aiChatEnabled && !limits.aiAnalysisEnabled) {
      return {
        allowed: false,
        message: 'KI-Funktionen sind nur für Pro- und Enterprise-User verfügbar.',
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

    // Für eingeloggte User: keine Limits für aiRequests/apiCalls, nur Feature-Flags
    return {
      allowed: true,
      currentUsage: todayUsage,
      limit: 0, // 0 = unlimited
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
 * WICHTIG: Für eingeloggte User werden KEINE Limits verwendet (0 = unlimited)
 */
function getDefaultLimit(type: UsageType, plan: string): number {
  // Für alle eingeloggten User: 0 = unlimited
  return 0
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
