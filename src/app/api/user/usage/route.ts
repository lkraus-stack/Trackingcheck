import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Hole Usage Limits
    const usageLimits = await prisma.usageLimits.findUnique({
      where: { userId },
    });

    if (!usageLimits) {
      return NextResponse.json(
        { error: 'Usage Limits nicht gefunden' },
        { status: 404 }
      );
    }

    // Hole aktuelle Usage Stats (dieser Monat)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyStats = await prisma.usageStats.findMany({
      where: {
        userId,
        date: { gte: firstDayOfMonth },
      },
    });

    // Berechne aktuelle Usage
    const currentMonthUsage = monthlyStats.reduce((sum, stat) => sum + stat.analysesCount, 0);

    // Hole heutige Usage
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayStats = await prisma.usageStats.findFirst({
      where: {
        userId,
        date: { gte: todayStart },
      },
    });

    const todayUsage = todayStats?.analysesCount || 0;

    // Hole User-Projekte und Analysen
    const projectCount = await prisma.project.count({
      where: { userId },
    });

    const analysisCount = await prisma.analysis.count({
      where: { userId },
    });

    return NextResponse.json({
      usage: {
        analyses: {
          current: currentMonthUsage,
          limit: usageLimits.maxAnalysesPerMonth,
          today: todayUsage,
          dailyLimit: usageLimits.maxAnalysesPerDay,
          percentage: usageLimits.maxAnalysesPerMonth > 0
            ? Math.round((currentMonthUsage / usageLimits.maxAnalysesPerMonth) * 100)
            : 0,
        },
        projects: {
          current: projectCount,
          limit: usageLimits.maxProjects,
          percentage: usageLimits.maxProjects > 0
            ? Math.round((projectCount / usageLimits.maxProjects) * 100)
            : 0,
        },
      },
      plan: usageLimits.plan,
      features: {
        aiAnalysis: usageLimits.aiAnalysisEnabled,
        aiChat: usageLimits.aiChatEnabled,
        exportPdf: usageLimits.exportPdfEnabled,
        deepScan: usageLimits.deepScanEnabled,
        apiAccess: usageLimits.apiAccessEnabled,
      },
      stats: {
        totalProjects: projectCount,
        totalAnalyses: analysisCount,
      },
    });
  } catch (error) {
    console.error('Error fetching user usage:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Usage-Daten' },
      { status: 500 }
    );
  }
}
