import { NextRequest, NextResponse } from 'next/server';
import { analyzeWebsite, analyzeWebsiteQuick } from '@/lib/analyzer';
import { AnalysisRequest } from '@/types';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/cache/analysisCache';

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

    // Cache prüfen (wenn nicht explizit übersprungen)
    const skipCache = body.options?.skipCache === true;
    const quickScan = body.options?.quickScan === true;
    
    if (!skipCache) {
      const cachedResult = getCachedAnalysis(url);
      if (cachedResult) {
        return NextResponse.json({
          ...cachedResult,
          fromCache: true,
          cacheInfo: {
            cached: true,
            message: 'Ergebnis aus Cache (max. 24h alt)',
          },
        });
      }
    }

    // Analyse durchführen (Quick oder Full)
    const result = quickScan 
      ? await analyzeWebsiteQuick(url)
      : await analyzeWebsite(url);

    // Ergebnis cachen (nur bei Full-Scan)
    if (!quickScan) {
      setCachedAnalysis(url, result);
    }

    return NextResponse.json({
      ...result,
      fromCache: false,
      scanMode: quickScan ? 'quick' : 'full',
    });
  } catch (error) {
    console.error('Analyse-Fehler:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    // Detailliertere Fehlermeldungen
    let userFriendlyMessage = 'Analyse fehlgeschlagen';
    let details = errorMessage;
    
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      userFriendlyMessage = 'Zeitüberschreitung';
      details = 'Die Website hat zu lange zum Laden gebraucht. Bitte versuchen Sie es erneut.';
    } else if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
      userFriendlyMessage = 'Website nicht erreichbar';
      details = 'Die Domain konnte nicht aufgelöst werden. Prüfen Sie die URL.';
    } else if (errorMessage.includes('net::ERR_CONNECTION_REFUSED')) {
      userFriendlyMessage = 'Verbindung abgelehnt';
      details = 'Der Server hat die Verbindung abgelehnt.';
    } else if (errorMessage.includes('net::ERR_SSL') || errorMessage.includes('SSL')) {
      userFriendlyMessage = 'SSL-Fehler';
      details = 'Es gab ein Problem mit dem SSL-Zertifikat der Website.';
    } else if (errorMessage.includes('Navigation failed') || errorMessage.includes('ERR_ABORTED')) {
      userFriendlyMessage = 'Seite konnte nicht geladen werden';
      details = 'Die Navigation zur Seite ist fehlgeschlagen. Möglicherweise blockiert die Seite automatisierte Zugriffe.';
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyMessage, 
        details,
        technicalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Tracking Checker API',
      version: '2.0',
      endpoints: {
        POST: 'Analyse durchführen - Body: { url: "...", options?: { skipCache?: boolean } }',
      },
    },
    { status: 200 }
  );
}
