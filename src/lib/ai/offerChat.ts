import { AnalysisResult } from '@/types';
import { createOfferRecommendationSet } from '@/lib/offers/offerEngine';
import { StructuredChatResponse } from './chatPolicy';

export function buildOfferCostResponse(
  result: AnalysisResult | null | undefined
): StructuredChatResponse {
  if (!result) {
    return {
      kind: 'offer',
      title: 'Für eine Kosteneinschätzung brauche ich zuerst eine Analyse',
      markdown: 'Wenn du nach den **Einrichtungskosten für dieses Tracking-Setup** fragst, brauche ich zuerst die Analyse der Website.\n\nErst danach kann ich die passenden Pakete und eine sinnvolle Kostenspanne aus dem bestehenden Angebotsmodell ableiten.',
      chips: ['Angebot', 'Analyse nötig'],
      suggestedPrompts: [
        'https://example.com',
        'Welche Kosten ergeben sich nach der Analyse?',
      ],
    };
  }

  const recommendationSet = createOfferRecommendationSet(result);
  const topCards = recommendationSet.cards.slice(0, 2);
  const recommendedCard = topCards[0];
  const addOns = recommendationSet.addOns.filter((addOn) => addOn.recommended).slice(0, 3);

  const markdownParts = [
    recommendedCard
      ? `Auf Basis der aktuellen Analyse passt am ehesten **${recommendedCard.title}** mit **${recommendedCard.priceLabel}** und einer Einrichtungszeit von **${recommendedCard.setupTimeLabel}**.`
      : 'Auf Basis der aktuellen Analyse kann ich eine erste Kosteneinschätzung aus den vorhandenen Angebotsbausteinen ableiten.',
    '',
    '### Warum dieses Angebot passt',
    ...(recommendedCard?.rationale?.length
      ? recommendedCard.rationale.map((entry) => `- ${entry}`)
      : ['- Die Analyse zeigt hier klaren Optimierungsbedarf im Tracking-Setup.']),
    '',
    '### Einordnung',
    `- Szenario: ${recommendationSet.heading}`,
    `- Grundlage: ${recommendationSet.subheading}`,
    ...(addOns.length > 0
      ? [
          '',
          '### Mögliche Add-ons',
          ...addOns.map((addOn) => `- **${addOn.title}** · ${addOn.priceLabel} - ${addOn.reason}`),
        ]
      : []),
    '',
    '### Nächster Schritt',
    'Wenn du willst, kann ich dir als Nächstes sagen, **welches Paket zuerst umgesetzt werden sollte** oder **welche Punkte den größten Einfluss auf Aufwand und Preis haben**.',
  ];

  return {
    kind: 'offer',
    title: 'Kosteneinschätzung auf Basis der Analyse',
    markdown: markdownParts.join('\n'),
    chips: ['Angebot', `Szenario: ${recommendationSet.scenario}`],
    cards: topCards.map((card) => ({
      title: card.title,
      badge: card.badge,
      description: card.description,
      priceLabel: card.priceLabel,
      setupTimeLabel: card.setupTimeLabel,
      bullets: card.includes.slice(0, 3),
    })),
    suggestedPrompts: [
      'Welches Paket sollte ich zuerst umsetzen?',
      'Welche Punkte treiben hier Aufwand und Preis am stärksten?',
    ],
    ctaLabel: 'Angebot anfragen',
    ctaHref: 'https://www.franco-consulting.com/',
  };
}
