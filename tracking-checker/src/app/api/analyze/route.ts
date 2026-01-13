import { NextRequest, NextResponse } from 'next/server';
import { analyzeWebsite } from '@/lib/analyzer';
import { AnalysisRequest } from '@/types';

// Vercel Serverless Konfiguration
export const maxDuration = 60; // 60 Sekunden Timeout
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL ist erforderlich' },
        { status: 400 }
      );
    }

    // URL validieren
    let url = body.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Ungültige URL' },
        { status: 400 }
      );
    }

    // Analyse durchführen
    const result = await analyzeWebsite(url);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyse-Fehler:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    return NextResponse.json(
      { 
        error: 'Analyse fehlgeschlagen', 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Tracking Checker API - Verwenden Sie POST mit { url: "..." }' },
    { status: 200 }
  );
}
