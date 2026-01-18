import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

// GET: Dashboard Statistiken
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

    // Hole alle Projekte und Analysen
    const [projects, analyses] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
      }),
      prisma.analysis.findMany({
        where: { userId },
      }),
    ]);

    // Berechne Statistiken
    const allUrls = new Set<string>();
    analyses.forEach(a => allUrls.add(a.url));

    const scores = analyses
      .map(a => (a.result as any)?.score)
      .filter((s): s is number => typeof s === 'number');

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Zähle Issues
    const issueCounts: Record<string, number> = {};
    analyses.forEach(a => {
      const issues = (a.result as any)?.issues || [];
      issues.forEach((issue: any) => {
        const key = issue.title || issue.category || 'Unknown';
        issueCounts[key] = (issueCounts[key] || 0) + 1;
      });
    });

    const topIssues = Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      totalProjects: projects.length,
      totalAnalyses: analyses.length,
      totalUrls: allUrls.size,
      avgScore,
      lastAnalysisDate: analyses[0]?.createdAt.toISOString(),
      topIssues,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Statistiken' },
      { status: 500 }
    );
  }
}
