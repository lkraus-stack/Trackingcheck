import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { auth } from '@/lib/auth/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

const offerSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  priceLabel: z.string().min(1).max(120),
  badge: z.string().max(80).optional(),
  setupTimeLabel: z.string().min(1).max(120),
  rationale: z.array(z.string().min(1).max(240)).max(6),
  includes: z.array(z.string().min(1).max(240)).max(8),
  bestFor: z.string().min(1).max(240),
});

const availableOfferSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  priceLabel: z.string().min(1).max(120),
  badge: z.string().max(80).optional(),
});

const addOnSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  priceLabel: z.string().min(1).max(120),
  reason: z.string().max(240).optional(),
});

const requestSchema = z.object({
  url: z.string().url(),
  scenario: z.enum(['foundation', 'leadgen', 'ecommerce', 'advanced']),
  selectedOffer: offerSchema,
  availableOffers: z.array(availableOfferSchema).min(1).max(3),
  selectedAddOns: z.array(addOnSchema).max(8).default([]),
  contact: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    company: z.string().max(120).optional().default(''),
    phone: z.string().max(60).optional().default(''),
  }),
  message: z.string().max(2000).optional().default(''),
  consent: z.literal(true),
  honeypot: z.string().max(120).optional().default(''),
  analysisSummary: z.object({
    overallScore: z.number().min(0).max(100),
    gdprScore: z.number().min(0).max(100),
    trackingScore: z.number().min(0).max(100),
    detectedPlatforms: z.array(z.string().min(1).max(60)).max(20),
    topIssues: z.array(z.string().min(1).max(180)).max(6),
    heading: z.string().min(1).max(180).optional(),
  }),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getHostLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return 'Keine';
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function formatScenarioLabel(
  scenario: 'foundation' | 'leadgen' | 'ecommerce' | 'advanced'
): string {
  if (scenario === 'foundation') return 'Basis / Aufsetzen';
  if (scenario === 'leadgen') return 'Lead / Funnel Tracking';
  if (scenario === 'ecommerce') return 'E-Commerce Tracking';
  return 'Erweitertes Tracking';
}

function buildInternalEmailHtml(
  payload: z.infer<typeof requestSchema>,
  meta: { host: string; submittedAt: string; sessionUserId?: string | null }
): string {
  const addOnHtml =
    payload.selectedAddOns.length > 0
      ? `<ul>${payload.selectedAddOns
          .map(
            (addOn) =>
              `<li><strong>${escapeHtml(addOn.title)}</strong> · ${escapeHtml(
                addOn.priceLabel
              )}${addOn.reason ? ` · ${escapeHtml(addOn.reason)}` : ''}</li>`
          )
          .join('')}</ul>`
      : '<p>Keine Add-ons ausgewählt.</p>';

  const offersHtml = `<ul>${payload.availableOffers
    .map(
      (offer) =>
        `<li><strong>${escapeHtml(offer.title)}</strong> · ${escapeHtml(
          offer.priceLabel
        )}${offer.badge ? ` · ${escapeHtml(offer.badge)}` : ''}</li>`
    )
    .join('')}</ul>`;

  const rationaleHtml = `<ul>${payload.selectedOffer.rationale
    .map((entry) => `<li>${escapeHtml(entry)}</li>`)
    .join('')}</ul>`;

  const includesHtml = `<ul>${payload.selectedOffer.includes
    .map((entry) => `<li>${escapeHtml(entry)}</li>`)
    .join('')}</ul>`;

  const issueHtml =
    payload.analysisSummary.topIssues.length > 0
      ? `<ul>${payload.analysisSummary.topIssues
          .map((issue) => `<li>${escapeHtml(issue)}</li>`)
          .join('')}</ul>`
      : '<p>Keine Top-Issues übergeben.</p>';

  const platformHtml =
    payload.analysisSummary.detectedPlatforms.length > 0
      ? `<p>${escapeHtml(payload.analysisSummary.detectedPlatforms.join(', '))}</p>`
      : '<p>Keine Plattformsignale erkannt.</p>';

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin:0 0 16px;">Neue Angebotsanfrage</h2>
      <p style="margin:0 0 20px;">
        <strong>Website:</strong> ${escapeHtml(payload.url)}<br />
        <strong>Host:</strong> ${escapeHtml(meta.host)}<br />
        <strong>Eingang:</strong> ${escapeHtml(meta.submittedAt)}<br />
        <strong>Szenario:</strong> ${escapeHtml(formatScenarioLabel(payload.scenario))}<br />
        <strong>Session User ID:</strong> ${escapeHtml(meta.sessionUserId || 'nicht eingeloggt')}
      </p>

      <h3>Kontakt</h3>
      <p>
        <strong>Name:</strong> ${escapeHtml(payload.contact.name)}<br />
        <strong>E-Mail:</strong> ${escapeHtml(payload.contact.email)}<br />
        <strong>Firma:</strong> ${escapeHtml(payload.contact.company || '-')}<br />
        <strong>Telefon:</strong> ${escapeHtml(payload.contact.phone || '-')}
      </p>

      <h3>Gewünschtes Angebot</h3>
      <p>
        <strong>${escapeHtml(payload.selectedOffer.title)}</strong><br />
        Ab Preis: ${escapeHtml(payload.selectedOffer.priceLabel)}<br />
        Einrichtungszeit: ${escapeHtml(payload.selectedOffer.setupTimeLabel)}<br />
        Badge: ${escapeHtml(payload.selectedOffer.badge || 'ohne Badge')}<br />
        Passend für: ${escapeHtml(payload.selectedOffer.bestFor)}
      </p>

      <h4>Warum empfohlen</h4>
      ${rationaleHtml}

      <h4>Leistungsumfang</h4>
      ${includesHtml}

      <h3>Ausgewählte Add-ons</h3>
      ${addOnHtml}

      <h3>Weitere empfohlene Pakete</h3>
      ${offersHtml}

      <h3>Analyse-Zusammenfassung</h3>
      <p>
        Gesamt-Score: <strong>${payload.analysisSummary.overallScore}/100</strong><br />
        DSGVO-Score: <strong>${payload.analysisSummary.gdprScore}/100</strong><br />
        Tracking-Score: <strong>${payload.analysisSummary.trackingScore}/100</strong>
      </p>

      <h4>Erkannte Plattformen</h4>
      ${platformHtml}

      <h4>Top-Issues</h4>
      ${issueHtml}

      <h3>Nachricht</h3>
      <p>${escapeHtml(payload.message || 'Keine zusätzliche Nachricht.')}</p>
    </div>
  `;
}

function buildInternalEmailText(
  payload: z.infer<typeof requestSchema>,
  meta: { host: string; submittedAt: string; sessionUserId?: string | null }
): string {
  return [
    'Neue Angebotsanfrage',
    '',
    `Website: ${payload.url}`,
    `Host: ${meta.host}`,
    `Eingang: ${meta.submittedAt}`,
    `Szenario: ${formatScenarioLabel(payload.scenario)}`,
    `Session User ID: ${meta.sessionUserId || 'nicht eingeloggt'}`,
    '',
    'Kontakt',
    `Name: ${payload.contact.name}`,
    `E-Mail: ${payload.contact.email}`,
    `Firma: ${payload.contact.company || '-'}`,
    `Telefon: ${payload.contact.phone || '-'}`,
    '',
    'Gewünschtes Angebot',
    `${payload.selectedOffer.title} (${payload.selectedOffer.priceLabel})`,
    `Einrichtungszeit: ${payload.selectedOffer.setupTimeLabel}`,
    `Badge: ${payload.selectedOffer.badge || 'ohne Badge'}`,
    `Passend für: ${payload.selectedOffer.bestFor}`,
    '',
    'Warum empfohlen',
    formatList(payload.selectedOffer.rationale),
    '',
    'Leistungsumfang',
    formatList(payload.selectedOffer.includes),
    '',
    'Ausgewählte Add-ons',
    formatList(
      payload.selectedAddOns.map(
        (addOn) => `${addOn.title} (${addOn.priceLabel})${addOn.reason ? ` - ${addOn.reason}` : ''}`
      )
    ),
    '',
    'Weitere empfohlene Pakete',
    formatList(
      payload.availableOffers.map(
        (offer) => `${offer.title} (${offer.priceLabel})${offer.badge ? ` - ${offer.badge}` : ''}`
      )
    ),
    '',
    'Analyse-Zusammenfassung',
    `Gesamt-Score: ${payload.analysisSummary.overallScore}/100`,
    `DSGVO-Score: ${payload.analysisSummary.gdprScore}/100`,
    `Tracking-Score: ${payload.analysisSummary.trackingScore}/100`,
    `Erkannte Plattformen: ${
      payload.analysisSummary.detectedPlatforms.join(', ') || 'keine'
    }`,
    '',
    'Top-Issues',
    formatList(payload.analysisSummary.topIssues),
    '',
    'Nachricht',
    payload.message || 'Keine zusätzliche Nachricht.',
  ].join('\n');
}

function buildConfirmationEmailHtml(
  payload: z.infer<typeof requestSchema>,
  meta: { host: string }
): string {
  const addOnHtml =
    payload.selectedAddOns.length > 0
      ? `<ul>${payload.selectedAddOns
          .map(
            (addOn) =>
              `<li>${escapeHtml(addOn.title)} · ${escapeHtml(addOn.priceLabel)}</li>`
          )
          .join('')}</ul>`
      : '<p>Keine zusätzlichen Add-ons ausgewählt.</p>';

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin:0 0 16px;">Danke für deine Angebotsanfrage</h2>
      <p>
        Wir haben deine unverbindliche Anfrage für <strong>${escapeHtml(
          meta.host
        )}</strong> erhalten und melden uns zeitnah mit einer ersten
        Einschätzung.
      </p>

      <h3>Dein gewünschtes Paket</h3>
      <p>
        <strong>${escapeHtml(payload.selectedOffer.title)}</strong><br />
        Ab Preis: ${escapeHtml(payload.selectedOffer.priceLabel)}<br />
        Einrichtungszeit: ${escapeHtml(payload.selectedOffer.setupTimeLabel)}<br />
        Passend für: ${escapeHtml(payload.selectedOffer.bestFor)}
      </p>

      <h4>Zusätzliche Punkte aus deiner Anfrage</h4>
      <p>${escapeHtml(payload.message || 'Keine zusätzlichen Hinweise übergeben.')}</p>

      <h4>Ausgewählte Add-ons</h4>
      ${addOnHtml}

      <h4>Analyse-Kontext</h4>
      <p>
        Gesamt-Score: ${payload.analysisSummary.overallScore}/100<br />
        DSGVO-Score: ${payload.analysisSummary.gdprScore}/100<br />
        Tracking-Score: ${payload.analysisSummary.trackingScore}/100
      </p>

      <p style="margin-top:24px;">
        Viele Grüße<br />
        <strong>Franco Consulting</strong>
      </p>
    </div>
  `;
}

function buildConfirmationEmailText(
  payload: z.infer<typeof requestSchema>,
  meta: { host: string }
): string {
  return [
    'Danke fuer deine Angebotsanfrage.',
    '',
    `Website: ${meta.host}`,
    `Gewaehltes Paket: ${payload.selectedOffer.title} (${payload.selectedOffer.priceLabel})`,
    `Einrichtungszeit: ${payload.selectedOffer.setupTimeLabel}`,
    `Passend fuer: ${payload.selectedOffer.bestFor}`,
    '',
    'Ausgewaehlte Add-ons',
    formatList(payload.selectedAddOns.map((addOn) => `${addOn.title} (${addOn.priceLabel})`)),
    '',
    'Analyse-Kontext',
    `Gesamt-Score: ${payload.analysisSummary.overallScore}/100`,
    `DSGVO-Score: ${payload.analysisSummary.gdprScore}/100`,
    `Tracking-Score: ${payload.analysisSummary.trackingScore}/100`,
    '',
    'Wir melden uns zeitnah mit einer unverbindlichen Ersteinschaetzung.',
    '',
    'Franco Consulting',
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const [session, rawBody] = await Promise.all([auth(), request.json()]);
    const payload = requestSchema.parse(rawBody);

    if (payload.honeypot && payload.honeypot.trim().length > 0) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const leadsToEmail = process.env.LEADS_TO_EMAIL;
    const leadsFromEmail = process.env.LEADS_FROM_EMAIL;
    const host = getHostLabel(payload.url);
    const submittedAt = new Date().toLocaleString('de-DE');

    if (!resendApiKey || !leadsToEmail || !leadsFromEmail) {
      console.info('Offer request received without mail delivery configuration.', {
        host,
        scenario: payload.scenario,
        selectedOffer: payload.selectedOffer.title,
        sessionUserId: session?.user?.id ?? null,
        contactEmail: payload.contact.email,
      });

      return NextResponse.json(
        {
          success: true,
          deliveryConfigured: false,
          message:
            'Anfrage wurde validiert, aber noch nicht versendet. Bitte Resend spaeter konfigurieren.',
        },
        { status: 200 }
      );
    }

    const resend = new Resend(resendApiKey);
    const recipients = leadsToEmail
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    await resend.emails.send({
      from: leadsFromEmail,
      to: recipients,
      replyTo: payload.contact.email,
      subject: `Neue Angebotsanfrage: ${payload.selectedOffer.title} · ${host}`,
      html: buildInternalEmailHtml(payload, {
        host,
        submittedAt,
        sessionUserId: session?.user?.id ?? null,
      }),
      text: buildInternalEmailText(payload, {
        host,
        submittedAt,
        sessionUserId: session?.user?.id ?? null,
      }),
    });

    try {
      await resend.emails.send({
        from: leadsFromEmail,
        to: payload.contact.email,
        subject: `Deine unverbindliche Angebotsanfrage fuer ${host}`,
        html: buildConfirmationEmailHtml(payload, { host }),
        text: buildConfirmationEmailText(payload, { host }),
      });
    } catch (confirmationError) {
      console.error('Confirmation email failed:', confirmationError);
    }

    return NextResponse.json({ success: true, deliveryConfigured: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Ungueltige Anfrage',
          details: error.issues.map((issue) => issue.message).join(' | '),
        },
        { status: 400 }
      );
    }

    console.error('Offer request error:', error);

    return NextResponse.json(
      {
        error: 'Versand fehlgeschlagen',
        details:
          error instanceof Error
            ? error.message
            : 'Unbekannter Fehler beim Versand der Angebotsanfrage.',
      },
      { status: 500 }
    );
  }
}
