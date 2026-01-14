import { NextRequest, NextResponse } from 'next/server';
import { getVanteroClient } from '@/lib/ai';
import { AnalysisResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionName, sectionData, fullAnalysis } = body as { 
      sectionName: string;
      sectionData: unknown;
      fullAnalysis: AnalysisResult;
    };

    if (!sectionName || !sectionData || !fullAnalysis) {
      return NextResponse.json(
        { error: 'Sektions-Name, Sektions-Daten und vollständige Analyse sind erforderlich' },
        { status: 400 }
      );
    }

    const client = getVanteroClient();

    if (!client.isConfigured()) {
      return NextResponse.json(
        { error: 'KI-API ist nicht konfiguriert', configured: false },
        { status: 503 }
      );
    }

    // KI-Erklärung für die Sektion generieren
    const explanation = await client.explainSection(sectionName, sectionData, fullAnalysis);

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (error) {
    console.error('KI-Sektions-Erklärung Fehler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

    return NextResponse.json(
      { error: 'KI-Erklärung fehlgeschlagen', details: errorMessage },
      { status: 500 }
    );
  }
}
