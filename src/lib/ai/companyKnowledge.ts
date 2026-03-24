import { StructuredChatResponse } from './chatPolicy';

const COMPANY_FACTS = {
  companyName: 'Franco Consulting GmbH',
  productName: 'Tracking Checker',
  website: 'https://www.franco-consulting.com/',
  email: 'kontakt@franco-consulting.com',
  phone: '08222 4183998',
  location: 'Burgau, Deutschland',
  services: [
    'Tracking Setup',
    'Consent Optimierung',
    'Performance Marketing',
  ],
  offerHint: 'Kostenlose Erstberatung inklusive und unverbindliche Angebotsanfrage direkt aus dem Produkt.',
};

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function buildCompanyChatResponse(question: string): StructuredChatResponse | null {
  const normalizedQuestion = question.toLowerCase();

  if (includesAny(normalizedQuestion, ['kontakt', 'email', 'e-mail', 'telefon', 'website', 'webseite'])) {
    return {
      kind: 'company',
      title: 'Öffentliche Kontaktinformationen',
      markdown: `Hier sind die öffentlich im Produkt hinterlegten Kontaktdaten von **${COMPANY_FACTS.companyName}**:\n\n- Website: ${COMPANY_FACTS.website}\n- E-Mail: ${COMPANY_FACTS.email}\n- Telefon: ${COMPANY_FACTS.phone}\n- Standort: ${COMPANY_FACTS.location}`,
      chips: ['Firma', 'Kontakt'],
      ctaLabel: 'Website öffnen',
      ctaHref: COMPANY_FACTS.website,
      suggestedPrompts: [
        'Welche Leistungen bietet Franco Consulting an?',
        'Wie läuft eine Angebotsanfrage ab?',
      ],
    };
  }

  if (includesAny(normalizedQuestion, ['leistung', 'leistungen', 'service', 'agentur', 'macht ihr', 'bietet ihr'])) {
    return {
      kind: 'company',
      title: 'Leistungsbereiche von Franco Consulting',
      markdown: `**${COMPANY_FACTS.companyName}** ist im Produkt als Anbieter von ${COMPANY_FACTS.productName} hinterlegt.\n\nÖffentlich sichtbar genannt werden vor allem diese Bereiche:\n\n- ${COMPANY_FACTS.services.join('\n- ')}\n\n${COMPANY_FACTS.offerHint}`,
      chips: ['Firma', 'Leistungen'],
      ctaLabel: 'Franco Consulting ansehen',
      ctaHref: COMPANY_FACTS.website,
      suggestedPrompts: [
        'Was kostet hier das Tracking?',
        'Wie läuft eine Angebotsanfrage ab?',
      ],
    };
  }

  if (includesAny(normalizedQuestion, ['erstberatung', 'angebot', 'angebotsanfrage', 'preis kalkulieren'])) {
    return {
      kind: 'company',
      title: 'Angebot und Erstberatung',
      markdown: `Im Produkt ist ein **unverbindlicher Angebots-Flow** hinterlegt.\n\nWas öffentlich daraus ableitbar ist:\n\n- Angebote können direkt auf Basis einer Analyse angefragt werden\n- Franco Consulting meldet sich mit einer ersten Einschätzung\n- eine kostenlose Erstberatung wird im Produkt erwähnt\n\nFür ein belastbares Angebot ist am sinnvollsten, zuerst die Website zu analysieren und danach die Angebotslogik zu nutzen.`,
      chips: ['Firma', 'Angebot'],
      ctaLabel: 'Kontakt per E-Mail',
      ctaHref: `mailto:${COMPANY_FACTS.email}`,
      suggestedPrompts: [
        'Was kostet hier das Tracking?',
        'Welche Pakete passen laut Analyse am besten?',
      ],
    };
  }

  return null;
}
