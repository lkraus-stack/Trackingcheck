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

    const hasFeature = await checkFeatureAccess(session.user.id, 'aiChat');
    if (!hasFeature) {
      return NextResponse.json(
        { error: 'KI-Chat ist nur im Pro-Plan verfügbar.', upgradeRequired: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { question, context, mode, history } = body as {
      question: string;
      context?: AnalysisResult | null;
      mode?: 'general' | 'analysis';
      history?: Array<{
        role: 'user' | 'assistant';
        content: string;
      }>;
    };

    if (!question?.trim()) {
      return NextResponse.json(
        { error: 'Frage ist erforderlich' },
        { status: 400 }
      );
    }

    const safeMode = mode === 'analysis' ? 'analysis' : 'general';
    const safeHistory = Array.isArray(history)
      ? history
          .filter((entry) =>
            entry &&
            (entry.role === 'user' || entry.role === 'assistant') &&
            typeof entry.content === 'string' &&
            entry.content.trim().length > 0
          )
          .slice(-6)
      : [];

    const client = getVanteroClient();

    if (!client.isConfigured()) {
      return NextResponse.json(
        { error: 'KI-API ist nicht konfiguriert', configured: false },
        { status: 503 }
      );
    }

    // Frage beantworten
    const answer = await client.answerQuestion({
      question: question.trim(),
      context: context || null,
      mode: safeMode,
      history: safeHistory,
    });

    await incrementUsage(session.user.id, 'aiRequests');

    return NextResponse.json({
      success: true,
      answer,
      mode: safeMode,
    });
  } catch (error) {
    console.error('KI-Chat Fehler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

    return NextResponse.json(
      { error: 'KI-Antwort fehlgeschlagen', details: errorMessage },
      { status: 500 }
    );
  }
}
