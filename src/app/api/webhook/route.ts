import { NextRequest, NextResponse } from 'next/server';
import { analyzeWebsite } from '@/lib/analyzer';
import { AnalysisResult } from '@/types';

// Vercel Serverless Konfiguration
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// In-Memory Job Queue (für Produktionsumgebung würde man Redis/BullMQ verwenden)
const jobQueue: Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url: string;
  result?: AnalysisResult;
  error?: string;
  createdAt: string;
  completedAt?: string;
  webhookUrl?: string;
  webhookSent?: boolean;
}> = new Map();

// POST: Analyse starten (mit optionalem Webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, webhookUrl, projectId, async = false } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL ist erforderlich', code: 'MISSING_URL' },
        { status: 400 }
      );
    }

    // URL validieren
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Ungültige URL', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    // Job ID generieren
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Async-Modus: Job in Queue und sofort zurück
    if (async) {
      jobQueue.set(jobId, {
        status: 'pending',
        url: normalizedUrl,
        createdAt: new Date().toISOString(),
        webhookUrl,
      });

      // Analyse im Hintergrund starten
      processJob(jobId, normalizedUrl, webhookUrl).catch(console.error);

      return NextResponse.json({
        success: true,
        jobId,
        status: 'pending',
        message: 'Analyse gestartet',
        statusUrl: `/api/webhook/status/${jobId}`,
      }, { status: 202 });
    }

    // Sync-Modus: Direkt analysieren
    const result = await analyzeWebsite(normalizedUrl);

    // Webhook senden wenn angegeben
    if (webhookUrl) {
      try {
        await sendWebhook(webhookUrl, {
          event: 'analysis.completed',
          jobId,
          projectId,
          result,
        });
      } catch (webhookError) {
        console.error('Webhook failed:', webhookError);
      }
    }

    return NextResponse.json({
      success: true,
      jobId,
      result,
    });

  } catch (error) {
    console.error('Webhook API error:', error);
    return NextResponse.json(
      { 
        error: 'Analyse fehlgeschlagen',
        code: 'ANALYSIS_FAILED',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// GET: Job-Status abfragen oder API-Info
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  // Job-Status abfragen
  if (jobId) {
    const job = jobQueue.get(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job nicht gefunden', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId,
      status: job.status,
      url: job.url,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      result: job.status === 'completed' ? job.result : undefined,
      error: job.status === 'failed' ? job.error : undefined,
      webhookSent: job.webhookSent,
    });
  }

  // API-Info
  return NextResponse.json({
    name: 'Tracking Checker Webhook API',
    version: '1.0',
    endpoints: {
      'POST /api/webhook': {
        description: 'Analyse starten',
        body: {
          url: 'string (required) - URL der zu analysierenden Website',
          webhookUrl: 'string (optional) - URL für Webhook-Callback',
          projectId: 'string (optional) - Projekt-ID für Zuordnung',
          async: 'boolean (optional, default: false) - Asynchrone Ausführung',
        },
        response: {
          sync: 'Direktes Analyseergebnis',
          async: 'Job-ID und Status-URL',
        },
      },
      'GET /api/webhook?jobId={id}': {
        description: 'Job-Status abfragen',
        response: 'Job-Status und Ergebnis (wenn fertig)',
      },
    },
    webhookPayload: {
      event: 'analysis.completed | analysis.failed',
      jobId: 'string',
      projectId: 'string (wenn angegeben)',
      result: 'AnalysisResult (bei completed)',
      error: 'string (bei failed)',
    },
    rateLimits: {
      note: 'Aktuell keine Rate-Limits implementiert',
    },
  });
}

// Hintergrund-Job verarbeiten
async function processJob(jobId: string, url: string, webhookUrl?: string) {
  const job = jobQueue.get(jobId);
  if (!job) return;

  job.status = 'processing';
  jobQueue.set(jobId, job);

  try {
    const result = await analyzeWebsite(url);
    
    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date().toISOString();
    jobQueue.set(jobId, job);

    // Webhook senden
    if (webhookUrl) {
      try {
        await sendWebhook(webhookUrl, {
          event: 'analysis.completed',
          jobId,
          result,
        });
        job.webhookSent = true;
        jobQueue.set(jobId, job);
      } catch (webhookError) {
        console.error('Webhook failed:', webhookError);
        job.webhookSent = false;
        jobQueue.set(jobId, job);
      }
    }

    // Job nach 1 Stunde aus dem Speicher entfernen
    setTimeout(() => {
      jobQueue.delete(jobId);
    }, 60 * 60 * 1000);

  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unbekannter Fehler';
    job.completedAt = new Date().toISOString();
    jobQueue.set(jobId, job);

    // Webhook für Fehler senden
    if (webhookUrl) {
      try {
        await sendWebhook(webhookUrl, {
          event: 'analysis.failed',
          jobId,
          error: job.error,
        });
        job.webhookSent = true;
        jobQueue.set(jobId, job);
      } catch (webhookError) {
        console.error('Webhook failed:', webhookError);
      }
    }
  }
}

// Webhook senden
async function sendWebhook(url: string, payload: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'TrackingChecker-Webhook/1.0',
      'X-Webhook-Event': (payload as { event?: string })?.event || 'unknown',
    },
    body: JSON.stringify({
      ...payload as object,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
}
