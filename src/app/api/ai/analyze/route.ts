import { NextRequest, NextResponse } from 'next/server';
import { getVanteroClient } from '@/lib/ai';
import { AnalysisResult } from '@/types';
import { auth } from '@/lib/auth/config';
import { checkFeatureAccess, incrementUsage } from '@/lib/auth/usage';

// Vercel Serverless Konfiguration
// Vercel Pro: max 300 Sekunden, Hobby: max 60 Sekunden
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert', requiresLogin: true },
        { status: 401 }
      );
    }

    const hasFeature = await checkFeatureAccess(session.user.id, 'aiAnalysis');
    if (!hasFeature) {
      return NextResponse.json(
        { error: 'KI-Analyse ist nur im Pro-Plan verfügbar.', upgradeRequired: true },
        { status: 403 }
      );
    }

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

    // Debug: Log API-Konfiguration (ohne Key)
    console.log('Vantero API Config:', {
      url: process.env.VANTERO_API_URL,
      model: process.env.VANTERO_MODEL,
      hasKey: !!process.env.VANTERO_API_KEY,
    });

    // KI-Analyse durchführen
    const aiAnalysis = await client.analyzeTrackingResults(analysisResult);

    // Automatische Validierung und Überprüfung
    let validation = null;
    try {
      validation = await client.validateAndReviewAnalysis(analysisResult, aiAnalysis);
    } catch (validationError) {
      console.warn('Validierung fehlgeschlagen:', validationError);
      // Validierung ist optional, wir fahren auch ohne fort
    }

    await incrementUsage(session.user.id, 'aiRequests');

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      validation: validation, // Validierungsergebnis hinzufügen
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
