import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { isAdminEmail } from '@/lib/auth/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === 'admin' || isAdminEmail(session.user.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Nicht berechtigt' },
        { status: 403 }
      );
    }

    const daysParam = request.nextUrl.searchParams.get('days');
    const days = Math.max(1, Math.min(365, Number(daysParam) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalAnalyses,
      planCountsRaw,
      usageTotals,
      usageRecent,
      activeUsersRaw,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.analysis.count(),
      prisma.subscription.groupBy({
        by: ['plan'],
        _count: { _all: true },
      }),
      prisma.usageStats.aggregate({
        _sum: { analysesCount: true, aiRequests: true, apiCalls: true },
      }),
      prisma.usageStats.aggregate({
        where: { date: { gte: since } },
        _sum: { analysesCount: true, aiRequests: true, apiCalls: true },
      }),
      prisma.usageStats.groupBy({
        by: ['userId'],
        where: { date: { gte: since } },
      }),
    ]);

    const plans = { free: 0, pro: 0, enterprise: 0 };
    for (const item of planCountsRaw) {
      const plan = item.plan as keyof typeof plans;
      if (plans[plan] !== undefined) {
        plans[plan] = item._count._all;
      }
    }

    const activeUsers = activeUsersRaw.length;

    return NextResponse.json({
      totals: {
        users: totalUsers,
        activeUsers,
        inactiveUsers: Math.max(0, totalUsers - activeUsers),
        analyses: totalAnalyses,
        aiRequests: usageTotals._sum.aiRequests || 0,
        apiCalls: usageTotals._sum.apiCalls || 0,
      },
      lastPeriod: {
        days,
        analyses: usageRecent._sum.analysesCount || 0,
        aiRequests: usageRecent._sum.aiRequests || 0,
        apiCalls: usageRecent._sum.apiCalls || 0,
      },
      plans,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Admin-Statistiken' },
      { status: 500 }
    );
  }
}
