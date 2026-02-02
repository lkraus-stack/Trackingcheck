import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { isAdminEmail } from '@/lib/auth/admin';
import { getPlanDefaults, normalizePlan } from '@/lib/auth/plans';

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;
    const body = await request.json();

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true, usageLimits: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'User nicht gefunden' },
        { status: 404 }
      );
    }

    if (body.role && (body.role === 'admin' || body.role === 'user')) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: body.role },
      });
    }

    const nextPlan = normalizePlan(
      body.usageLimits?.plan || body.subscription?.plan || existing.subscription?.plan || existing.usageLimits?.plan
    );

    if (body.subscription) {
      const subscriptionData = {
        plan: normalizePlan(body.subscription.plan || nextPlan),
        status: body.subscription.status || existing.subscription?.status || 'active',
      };

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          ...subscriptionData,
        },
        update: subscriptionData,
      });
    }

    if (body.usageLimits) {
      const defaults = getPlanDefaults(nextPlan);
      const usageLimitsData = {
        plan: defaults.plan,
        maxAnalysesPerMonth: toNumber(body.usageLimits.maxAnalysesPerMonth, defaults.maxAnalysesPerMonth),
        maxProjects: toNumber(body.usageLimits.maxProjects, defaults.maxProjects),
        maxAnalysesPerDay: toNumber(body.usageLimits.maxAnalysesPerDay, defaults.maxAnalysesPerDay),
        aiAnalysisEnabled: body.usageLimits.aiAnalysisEnabled ?? defaults.aiAnalysisEnabled,
        aiChatEnabled: body.usageLimits.aiChatEnabled ?? defaults.aiChatEnabled,
        exportPdfEnabled: body.usageLimits.exportPdfEnabled ?? defaults.exportPdfEnabled,
        deepScanEnabled: body.usageLimits.deepScanEnabled ?? defaults.deepScanEnabled,
        apiAccessEnabled: body.usageLimits.apiAccessEnabled ?? defaults.apiAccessEnabled,
      };

      await prisma.usageLimits.upsert({
        where: { userId },
        create: {
          userId,
          ...usageLimitsData,
        },
        update: usageLimitsData,
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true, usageLimits: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Users' },
      { status: 500 }
    );
  }
}
