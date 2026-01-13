import { NextRequest, NextResponse } from 'next/server';
import { getVanteroClient } from '@/lib/ai';
import { AnalysisResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, context } = body as { 
      question: string; 
      context: AnalysisResult;
    };

    if (!question) {
      return NextResponse.json(
        { error: 'Frage ist erforderlich' },
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

    // Frage beantworten
    const answer = await client.answerQuestion(question, context || {});

    return NextResponse.json({
      success: true,
      answer,
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
