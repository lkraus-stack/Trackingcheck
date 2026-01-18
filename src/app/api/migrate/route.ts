import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

// POST: Migrate IndexedDB data to database
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
    const { projects, analyses } = body;

    if (!projects || !analyses) {
      return NextResponse.json(
        { error: 'Projekte und Analysen sind erforderlich' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const migrated = {
      projects: 0,
      analyses: 0,
      skippedProjects: 0,
      skippedAnalyses: 0,
    };

    // Check existing projects and analyses to avoid duplicates
    const existingProjects = await prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true, urls: true },
    });

    const existingAnalyses = await prisma.analysis.findMany({
      where: { userId },
      select: { id: true, url: true, createdAt: true },
    });

    // Create URL to project ID mapping for analyses
    const urlToProjectId = new Map<string, string>();

    // Migrate projects
    for (const project of projects || []) {
      // Check for duplicates by name and URLs
      const isDuplicate = existingProjects.some(
        (existing) =>
          existing.name === project.name ||
          (project.urls.length > 0 &&
            existing.urls.some((url: string) => project.urls.includes(url)))
      );

      if (isDuplicate) {
        // If duplicate found, use existing project ID
        const existing = existingProjects.find(
          (p) =>
            p.name === project.name ||
            (project.urls.length > 0 &&
              p.urls.some((url: string) => project.urls.includes(url)))
        );
        if (existing) {
          // Map URLs to existing project ID
          project.urls.forEach((url: string) => {
            urlToProjectId.set(url, existing.id);
          });
        }
        migrated.skippedProjects++;
        continue;
      }

      try {
        const dbProject = await prisma.project.create({
          data: {
            userId,
            name: project.name,
            description: project.description || null,
            urls: project.urls || [],
            color: project.color || '#6366f1',
            isFavorite: project.isFavorite || false,
            notes: project.notes || null,
            tags: project.tags || [],
            lastAnalysis: project.lastAnalysis ? new Date(project.lastAnalysis) : null,
            avgScore: project.avgScore || null,
            createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
            updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date(),
          },
        });

        // Map URLs to project ID
        dbProject.urls.forEach((url: string) => {
          urlToProjectId.set(url, dbProject.id);
        });

        migrated.projects++;
      } catch (error) {
        console.error('Error migrating project:', error);
        migrated.skippedProjects++;
      }
    }

    // Migrate analyses
    for (const analysis of analyses || []) {
      // Check for duplicates by URL and creation date
      const isDuplicate = existingAnalyses.some(
        (existing) =>
          existing.url === analysis.url &&
          Math.abs(
            new Date(existing.createdAt).getTime() -
              new Date(analysis.createdAt).getTime()
          ) < 60000 // Within 1 minute = likely duplicate
      );

      if (isDuplicate) {
        migrated.skippedAnalyses++;
        continue;
      }

      // Find project ID for this analysis URL
      const projectId = analysis.projectId
        ? urlToProjectId.get(analysis.projectId) || null
        : urlToProjectId.get(analysis.url) || null;

      try {
        await prisma.analysis.create({
          data: {
            userId,
            url: analysis.url,
            result: analysis.result as any,
            projectId: projectId,
            notes: analysis.notes || null,
            tags: analysis.tags || [],
            createdAt: analysis.createdAt ? new Date(analysis.createdAt) : new Date(),
          },
        });

        migrated.analyses++;

        // Update project lastAnalysis and avgScore if projectId exists
        if (projectId) {
          const projectAnalyses = await prisma.analysis.findMany({
            where: { projectId },
          });

          const scores = projectAnalyses
            .map((a) => (a.result as any)?.score)
            .filter((s): s is number => typeof s === 'number');

          const avgScore =
            scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : null;

          const latestAnalysis = projectAnalyses.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          )[0];

          await prisma.project.update({
            where: { id: projectId },
            data: {
              lastAnalysis: latestAnalysis?.createdAt || null,
              avgScore: avgScore || null,
            },
          });
        }
      } catch (error) {
        console.error('Error migrating analysis:', error);
        migrated.skippedAnalyses++;
      }
    }

    return NextResponse.json({
      success: true,
      migrated,
      message: `Migration abgeschlossen: ${migrated.projects} Projekte, ${migrated.analyses} Analysen migriert.`,
    });
  } catch (error) {
    console.error('Error migrating data:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Migration', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
