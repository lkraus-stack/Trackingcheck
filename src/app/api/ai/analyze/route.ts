import { NextRequest, NextResponse } from 'next/server';
import { getVanteroClient } from '@/lib/ai';
import { AnalysisResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisResult } = body as { analysisResult: AnalysisResult };

    if (!analysisResult) {
      return NextResponse.json(
        { error: 'Analyse-Ergebnis ist erforderlich' },
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

    // KI-Analyse durchführen
    const aiAnalysis = await client.analyzeTrackingResults(analysisResult);

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
    });
  } catch (error) {
    console.error('KI-Analyse Fehler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

    return NextResponse.json(
      { error: 'KI-Analyse fehlgeschlagen', details: errorMessage },
      { status: 500 }
    );
  }
}
