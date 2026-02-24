import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';

import type { PublicAnalysisFinding, PublicAnalysisSummary } from '@/types/public-analysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PublicFindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  title: z.string(),
  description: z.string(),
  recommendation: z.string().optional(),
});

const PublicSummarySchema: z.ZodType<PublicAnalysisSummary> = z.object({
  cookieBannerDetected: z.boolean(),
  cookieBannerHasRejectButton: z.boolean(),
  consentModeDetected: z.boolean(),
  consentModeVersion: z.enum(['v1', 'v2']).optional(),
  trackingBeforeConsent: z.boolean().optional(),
  serverSideTrackingDetected: z.boolean(),
  ecommerceDetected: z.boolean(),
  ecommerceHasTransactionValue: z.boolean(),
  thirdPartyTotalCount: z.number().optional(),
});

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(5).max(40).optional(),
  domain: z.string().trim().min(3).max(200),
  analysis: z
    .object({
      url: z.string().trim().min(1).max(500),
      score: z.number().min(0).max(100),
      summary: PublicSummarySchema,
      findings: z.array(PublicFindingSchema).max(10),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const lead = LeadSchema.parse(payload);

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.LEADS_TO_EMAIL;
    const fromEmail = process.env.LEADS_FROM_EMAIL || 'onboarding@resend.dev';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'E-Mail Versand ist nicht konfiguriert (RESEND_API_KEY fehlt).' },
        { status: 500 }
      );
    }
    if (!toEmail) {
      return NextResponse.json(
        { error: 'E-Mail Empfänger ist nicht konfiguriert (LEADS_TO_EMAIL fehlt).' },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const subjectTeam = `Neue Tracking-Checker Anfrage: ${lead.domain}`;
    const subjectUser = `Dein Tracking-Check: Nächste Schritte (${lead.domain})`;

    const userNameLine = lead.name ? `${lead.name} · ` : '';
    const phoneLine = lead.phone ? `Telefon: ${lead.phone}` : 'Telefon: (nicht angegeben)';

    const findingsText = (lead.analysis?.findings || [])
      .map((f: PublicAnalysisFinding) => `- [${f.severity}] ${f.title}\n  ${f.description}${f.recommendation ? `\n  Empfehlung: ${f.recommendation}` : ''}`)
      .join('\n\n');

    const summary = lead.analysis?.summary;
    const summaryText = summary
      ? [
          `Score: ${lead.analysis?.score ?? ''}`,
          `Consent Mode: ${summary.consentModeDetected ? (summary.consentModeVersion ? `v${summary.consentModeVersion.slice(1)}` : 'erkannt') : 'nicht erkannt'}`,
          `Cookie-Banner: ${summary.cookieBannerDetected ? 'erkannt' : 'nicht erkannt'}`,
          `Ablehnen: ${summary.cookieBannerDetected ? (summary.cookieBannerHasRejectButton ? 'ja' : 'nein') : '-'}`,
          `Tracking vor Consent: ${typeof summary.trackingBeforeConsent === 'boolean' ? (summary.trackingBeforeConsent ? 'ja' : 'nein') : 'n/a'}`,
          `Server-Side: ${summary.serverSideTrackingDetected ? 'erkannt' : 'nicht erkannt'}`,
          `E-Commerce: ${summary.ecommerceDetected ? (summary.ecommerceHasTransactionValue ? 'Werte ok' : 'Werte fehlen') : 'nicht erkannt'}`,
        ].join('\n')
      : '';

    // 1) Team-Mail
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: lead.email,
      subject: subjectTeam,
      text: [
        `Neue Anfrage aus Tracking Checker Landing`,
        ``,
        `Kontakt: ${userNameLine}${lead.email}`,
        phoneLine,
        `Domain: ${lead.domain}`,
        lead.analysis?.url ? `Scan-URL: ${lead.analysis.url}` : undefined,
        summaryText ? `\n---\n${summaryText}` : undefined,
        findingsText ? `\n---\nTop-Findings:\n${findingsText}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    // 2) Bestätigung an Nutzer
    await resend.emails.send({
      from: fromEmail,
      to: lead.email,
      subject: subjectUser,
      text: [
        `Danke für deinen Tracking-Check (${lead.domain}).`,
        ``,
        `Wir melden uns zeitnah mit einer kurzen Einschätzung zu deinem Ergebnis und den wichtigsten Quick Wins.`,
        ``,
        `Wenn du Rückfragen hast, antworte einfach auf diese E-Mail.`,
      ].join('\n'),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingaben', details: err.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Fehler beim Senden der Anfrage' },
      { status: 500 }
    );
  }
}

