import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

// DELETE: Analyse löschen
export async function DELETE(
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

    // Prüfe ob Analyse dem User gehört
    const existingAnalysis = await prisma.analysis.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingAnalysis) {
      return NextResponse.json(
        { error: 'Analyse nicht gefunden' },
        { status: 404 }
      );
    }

    await prisma.analysis.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Analyse' },
      { status: 500 }
    );
  }
}
