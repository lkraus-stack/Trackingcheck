import { NextRequest, NextResponse } from 'next/server';
import { analyzeWebsite, analyzeWebsiteQuick } from '@/lib/analyzer';
import { AnalysisRequest } from '@/types';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/cache/analysisCache';
import { auth } from '@/lib/auth/config';
import { checkUsageLimits, incrementUsage } from '@/lib/auth/usage';

// Vercel Serverless Konfiguration
// Vercel Pro: max 300 Sekunden, Hobby: max 60 Sekunden
// Verwende 60 Sekunden als sicheres Limit (funktioniert auf allen Plänen)
// Bei Bedarf kann maxDuration auf 300 erhöht werden (nur Pro Plan)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body: AnalysisRequest = await request.json();
    
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL ist erforderlich' },
        { status: 400 }
      );
    }

    // Usage Check für eingeloggte User (Limits je Plan)
    if (session?.user?.id) {
      const usageCheck = await checkUsageLimits(session.user.id, 'analyses');
      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Analyse-Limit erreicht',
            details: usageCheck.message || 'Limit erreicht',
            upgradeRequired: true,
            currentUsage: usageCheck.currentUsage,
            limit: usageCheck.limit,
            resetDate: usageCheck.resetDate?.toISOString(),
          },
          { status: 429 }
        );
      }
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
    // Bei Full-Scan: Timeout-Schutz mit Fallback auf Quick-Scan
    let result;
    if (quickScan) {
      result = await analyzeWebsiteQuick(url);
    } else {
      try {
        // Timeout-Wrapper für Full-Scan (50 Sekunden, damit noch Zeit für Fallback bleibt)
        const timeoutWrapper = 50000; // 50 Sekunden
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT_PROTECTION')), timeoutWrapper)
        );
        
        result = await Promise.race([
          analyzeWebsite(url),
          timeoutPromise
        ]) as Awaited<ReturnType<typeof analyzeWebsite>>;
      } catch (error) {
        // Bei Timeout: Fallback auf Quick-Scan
        if (error instanceof Error && error.message === 'TIMEOUT_PROTECTION') {
          console.warn(`Full-Scan timeout für ${url}, fallback auf Quick-Scan`);
          result = await analyzeWebsiteQuick(url);
          // Markiere als Quick-Scan
          result.scanMode = 'quick';
          result.status = 'partial' as const;
        } else {
          throw error;
        }
      }
    }

    // Ergebnis cachen (nur bei Full-Scan)
    if (!quickScan) {
      setCachedAnalysis(url, result);
    }

    // Usage Stats für eingeloggte User inkrementieren
    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'analyses').catch((error) => {
        // Usage-Tracking ist nicht kritisch - nur loggen, nicht fehlschlagen lassen
        console.error('Error incrementing usage:', error);
      });
    }

    return NextResponse.json({
      ...result,
      fromCache: false,
      scanMode: quickScan || (result as any).scanMode === 'quick' ? 'quick' : 'full',
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
