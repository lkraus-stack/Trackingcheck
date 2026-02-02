import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

// GET: Alle Projekte des Users
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    // Konvertiere Prisma Projects zu Dashboard Project Format
    const formattedProjects = projects.map(project => ({
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
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Projekte' },
      { status: 500 }
    );
  }
}

// POST: Neues Projekt erstellen
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
    const { name, description, urls, color, notes, tags } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Projektname ist erforderlich' },
        { status: 400 }
      );
    }

    // Für eingeloggte User keine Projekt-Limits

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        urls: urls || [],
        color: color || '#6366f1',
        notes: notes || null,
        tags: tags || [],
        isFavorite: false,
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
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Projekts' },
      { status: 500 }
    );
  }
}
