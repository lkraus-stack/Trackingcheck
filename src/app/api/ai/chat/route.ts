import { NextRequest, NextResponse } from 'next/server';
import { getVanteroClient } from '@/lib/ai';
import { AnalysisResult } from '@/types';
import { auth } from '@/lib/auth/config';
import { checkFeatureAccess, incrementUsage } from '@/lib/auth/usage';
import { buildCompanyChatResponse } from '@/lib/ai/companyKnowledge';
import { buildOfferCostResponse } from '@/lib/ai/offerChat';
import {
  StructuredChatResponse,
  classifyChatIntent,
  createPolicyResponseForIntent,
  sanitizeStructuredChatResponse,
} from '@/lib/ai/chatPolicy';

// Vercel Serverless Konfiguration
// Vercel Pro: max 300 Sekunden, Hobby: max 60 Sekunden
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const CHAT_HISTORY_LIMIT = 8;
const MAX_HISTORY_ENTRY_CHARS = 1500;

function buildLlmStructuredResponse(
  mode: 'general' | 'analysis',
  answer: string,
  context: AnalysisResult | null
): StructuredChatResponse {
  return {
    kind: mode === 'analysis' ? 'analysis' : 'general',
    title: mode === 'analysis' ? 'Antwort zur aktuellen Analyse' : 'Fachliche Einordnung',
    markdown: answer,
    chips: mode === 'analysis'
      ? ['Analyse', context?.url ?? 'Website-Kontext']
      : ['Allgemeine Fachfrage'],
    suggestedPrompts: mode === 'analysis'
      ? [
          'Welche 3 Maßnahmen sollte ich zuerst umsetzen?',
          'Was treibt hier Aufwand und Kosten am stärksten?',
        ]
      : [
          'Erkläre mir Consent Mode V2 in einfachen Worten.',
          'Wann brauche ich TCF 2.2?',
        ],
  };
}

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
          .map((entry) => ({
            role: entry.role,
            content: entry.content.trim().slice(0, MAX_HISTORY_ENTRY_CHARS),
          }))
          .slice(-CHAT_HISTORY_LIMIT)
      : [];

    const trimmedQuestion = question.trim();
    const safeContext = context || null;
    const intent = classifyChatIntent(trimmedQuestion, {
      hasAnalysisContext: Boolean(safeContext),
    });

    let responsePayload: StructuredChatResponse;

    if (intent === 'offer_cost') {
      responsePayload = buildOfferCostResponse(safeContext);
    } else if (intent === 'company_public') {
      responsePayload =
        buildCompanyChatResponse(trimmedQuestion) ??
        createPolicyResponseForIntent('company_unknown');
    } else if (
      intent === 'company_unknown' ||
      intent === 'off_topic' ||
      intent === 'unethical_tracking' ||
      intent === 'internal_or_secret' ||
      intent === 'competitor_claim' ||
      intent === 'guarantee_or_legal_sensitive' ||
      intent === 'needs_human'
    ) {
      responsePayload = createPolicyResponseForIntent(intent);
    } else {
      const client = getVanteroClient();

      if (!client.isConfigured()) {
        return NextResponse.json(
          { error: 'KI-API ist nicht konfiguriert', configured: false },
          { status: 503 }
        );
      }

      const answer = await client.answerQuestion({
        question: trimmedQuestion,
        context: safeContext,
        mode: safeMode,
        history: safeHistory,
      });

      responsePayload = buildLlmStructuredResponse(safeMode, answer, safeContext);
    }

    responsePayload = sanitizeStructuredChatResponse(responsePayload);

    await incrementUsage(session.user.id, 'aiRequests');

    return NextResponse.json({
      success: true,
      answer: responsePayload.markdown,
      response: responsePayload,
      mode: safeMode,
      intent,
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
