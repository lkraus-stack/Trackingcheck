import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { backfillUserRoles, isAdminEmail } from '@/lib/auth/admin';
import { getPlanDefaults, normalizePlan, PlanId } from '@/lib/auth/plans';

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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

    await backfillUserRoles();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.max(5, Math.min(50, Number(searchParams.get('pageSize') || 20)));
    const search = searchParams.get('search')?.trim();
    const planFilter = searchParams.get('plan');
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleFilter && (roleFilter === 'admin' || roleFilter === 'user')) {
      where.role = roleFilter;
    }
    if (planFilter && (planFilter === 'free' || planFilter === 'pro' || planFilter === 'enterprise')) {
      where.subscription = { plan: planFilter };
    }
    if (statusFilter) {
      where.subscription = { ...(where.subscription || {}), status: statusFilter };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          subscription: true,
          usageLimits: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) {
      return NextResponse.json({
        users: [],
        page,
        pageSize,
        total,
      });
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);

    const [usageTotals, usageRecent, analysisCounts, projectCounts] = await Promise.all([
      prisma.usageStats.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _sum: { analysesCount: true, aiRequests: true, apiCalls: true },
        _max: { date: true },
      }),
      prisma.usageStats.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, date: { gte: since } },
        _sum: { analysesCount: true, aiRequests: true, apiCalls: true },
      }),
      prisma.analysis.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { _all: true },
      }),
      prisma.project.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { _all: true },
      }),
    ]);

    const usageTotalMap = new Map(usageTotals.map((row) => [row.userId, row]));
    const usageRecentMap = new Map(usageRecent.map((row) => [row.userId, row]));
    const analysisCountMap = new Map(analysisCounts.map((row) => [row.userId, row._count._all]));
    const projectCountMap = new Map(projectCounts.map((row) => [row.userId, row._count._all]));

    const usersWithUsage = users.map((user) => {
      const totals = usageTotalMap.get(user.id);
      const recent = usageRecentMap.get(user.id);
      const lastActiveAt = totals?._max?.date || null;
      const isActive = lastActiveAt ? lastActiveAt >= since : false;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        subscription: user.subscription,
        usageLimits: user.usageLimits,
        usage: {
          analysesTotal: totals?._sum.analysesCount || 0,
          analysesLast30Days: recent?._sum.analysesCount || 0,
          aiRequestsTotal: totals?._sum.aiRequests || 0,
          aiRequestsLast30Days: recent?._sum.aiRequests || 0,
          apiCallsTotal: totals?._sum.apiCalls || 0,
          lastActiveAt,
          isActive,
          analysesCount: analysisCountMap.get(user.id) || 0,
          projectsCount: projectCountMap.get(user.id) || 0,
        },
      };
    });

    return NextResponse.json({
      users: usersWithUsage,
      page,
      pageSize,
      total,
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der User' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const name = body.name ? String(body.name).trim() : null;
    const role = body.role === 'admin' ? 'admin' : 'user';
    const plan = normalizePlan(body.plan);

    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User existiert bereits' },
        { status: 409 }
      );
    }

    const defaults = getPlanDefaults(plan);
    const usageInput = body.usageLimits || {};
    const usageLimits = {
      plan: defaults.plan,
      maxAnalysesPerMonth: toNumber(usageInput.maxAnalysesPerMonth, defaults.maxAnalysesPerMonth),
      maxProjects: toNumber(usageInput.maxProjects, defaults.maxProjects),
      maxAnalysesPerDay: toNumber(usageInput.maxAnalysesPerDay, defaults.maxAnalysesPerDay),
      aiAnalysisEnabled: usageInput.aiAnalysisEnabled ?? defaults.aiAnalysisEnabled,
      aiChatEnabled: usageInput.aiChatEnabled ?? defaults.aiChatEnabled,
      exportPdfEnabled: usageInput.exportPdfEnabled ?? defaults.exportPdfEnabled,
      deepScanEnabled: usageInput.deepScanEnabled ?? defaults.deepScanEnabled,
      apiAccessEnabled: usageInput.apiAccessEnabled ?? defaults.apiAccessEnabled,
    };

    const subscription = {
      plan,
      status: body.subscription?.status || 'active',
    };

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        subscription: { create: subscription },
        usageLimits: { create: usageLimits },
      },
      include: {
        subscription: true,
        usageLimits: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Users' },
      { status: 500 }
    );
  }
}
