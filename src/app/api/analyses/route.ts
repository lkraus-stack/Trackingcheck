import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

// GET: Alle Analysen des Users
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const url = searchParams.get('url');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: any = { userId: session.user.id };
    if (projectId) where.projectId = projectId;
    if (url) where.url = url;

    const analyses = await prisma.analysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Konvertiere Prisma Analyses zu Dashboard Analysis Format
    const formattedAnalyses = analyses.map(analysis => ({
      id: analysis.id,
      url: analysis.url,
      projectId: analysis.projectId || undefined,
      result: analysis.result as any,
      notes: analysis.notes || undefined,
      tags: analysis.tags,
      createdAt: analysis.createdAt.toISOString(),
    }));

    return NextResponse.json({ analyses: formattedAnalyses });
  } catch (error) {
    console.error('Error fetching analyses:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Analysen' },
      { status: 500 }
    );
  }
}

// POST: Neue Analyse speichern
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, result, projectId, notes, tags } = body;

    if (!url || !result) {
      return NextResponse.json(
        { error: 'URL und Ergebnis sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Projekt dem User gehört (falls projectId angegeben)
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: session.user.id,
        },
      });

      if (!project) {
        return NextResponse.json(
          { error: 'Projekt nicht gefunden' },
          { status: 404 }
        );
      }
    }

    const analysis = await prisma.analysis.create({
      data: {
        userId: session.user.id,
        url,
        result: result as any,
        projectId: projectId || null,
        notes: notes || null,
        tags: tags || [],
      },
    });

    // Update project lastAnalysis und avgScore wenn projectId angegeben
    if (projectId) {
      const projectAnalyses = await prisma.analysis.findMany({
        where: { projectId },
      });

      const scores = projectAnalyses
        .map(a => (a.result as any)?.score)
        .filter((s): s is number => typeof s === 'number');

      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

      await prisma.project.update({
        where: { id: projectId },
        data: {
          lastAnalysis: analysis.createdAt,
          avgScore: avgScore || null,
        },
      });
    }

    return NextResponse.json({
      analysis: {
        id: analysis.id,
        url: analysis.url,
        projectId: analysis.projectId || undefined,
        result: analysis.result as any,
        notes: analysis.notes || undefined,
        tags: analysis.tags,
        createdAt: analysis.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error saving analysis:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Analyse' },
      { status: 500 }
    );
  }
}
