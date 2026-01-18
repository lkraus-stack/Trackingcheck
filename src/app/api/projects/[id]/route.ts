import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

// GET: Einzelnes Projekt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        urls: project.urls,
        color: project.color,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        lastAnalysis: project.lastAnalysis?.toISOString(),
        avgScore: project.avgScore || undefined,
        isFavorite: project.isFavorite,
        notes: project.notes || undefined,
        tags: project.tags,
      },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Projekts' },
      { status: 500 }
    );
  }
}

// PATCH: Projekt aktualisieren
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Prüfe ob Projekt dem User gehört
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description !== undefined ? body.description : null,
        urls: body.urls,
        color: body.color,
        notes: body.notes !== undefined ? body.notes : null,
        tags: body.tags,
        isFavorite: body.isFavorite,
      },
    });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        urls: project.urls,
        color: project.color,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        lastAnalysis: project.lastAnalysis?.toISOString(),
        avgScore: project.avgScore || undefined,
        isFavorite: project.isFavorite,
        notes: project.notes || undefined,
        tags: project.tags,
      },
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Projekts' },
      { status: 500 }
    );
  }
}

// DELETE: Projekt löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Prüfe ob Projekt dem User gehört
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      );
    }

    // Lösche Projekt (Analysen werden durch onDelete: Cascade automatisch gelöscht)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Projekts' },
      { status: 500 }
    );
  }
}
