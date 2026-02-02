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

    const fullAccess = true;
    const analysesLimit = fullAccess ? 0 : usageLimits.maxAnalysesPerMonth;
    const dailyLimit = fullAccess ? 0 : usageLimits.maxAnalysesPerDay;
    const projectLimit = fullAccess ? 0 : usageLimits.maxProjects;

    return NextResponse.json({
      usage: {
        analyses: {
          current: currentMonthUsage,
          limit: analysesLimit,
          today: todayUsage,
          dailyLimit: dailyLimit,
          percentage: analysesLimit > 0
            ? Math.round((currentMonthUsage / analysesLimit) * 100)
            : 0,
        },
        projects: {
          current: projectCount,
          limit: projectLimit,
          percentage: projectLimit > 0
            ? Math.round((projectCount / projectLimit) * 100)
            : 0,
        },
      },
      plan: usageLimits.plan,
      features: {
        aiAnalysis: true,
        aiChat: true,
        exportPdf: true,
        deepScan: true,
        apiAccess: true,
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
