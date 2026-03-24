'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { AnalysisResult } from '@/types';
import {
  createOfferRecommendationSet,
  OfferAccent,
  OfferAddOn,
  OfferCard,
} from '@/lib/offers/offerEngine';
import { useToast } from '@/contexts/ToastContext';

interface ExpertRecommendationProps {
  result: AnalysisResult;
}

interface OfferRequestFormState {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  consent: boolean;
}

interface SubmittedRequestState {
  offerTitle: string;
  email: string;
  deliveryConfigured: boolean;
}

const accentStyles: Record<
  OfferAccent,
  {
    border: string;
    badge: string;
    cardBg: string;
    iconBg: string;
    iconText: string;
    button: string;
    outline: string;
  }
> = {
  indigo: {
    border: 'border-indigo-500/30',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    cardBg: 'from-indigo-500/10 to-purple-500/10',
    iconBg: 'bg-indigo-500/15',
    iconText: 'text-indigo-300',
    button: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500',
    outline: 'hover:border-indigo-400/50',
  },
  emerald: {
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    cardBg: 'from-emerald-500/10 to-teal-500/10',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-300',
    button: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    outline: 'hover:border-emerald-400/50',
  },
  purple: {
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    cardBg: 'from-purple-500/10 to-pink-500/10',
    iconBg: 'bg-purple-500/15',
    iconText: 'text-purple-300',
    button: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
    outline: 'hover:border-purple-400/50',
  },
  amber: {
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    cardBg: 'from-amber-500/10 to-orange-500/10',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-300',
    button: 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500',
    outline: 'hover:border-amber-400/50',
  },
};

function defaultFormState(): OfferRequestFormState {
  return {
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    consent: false,
  };
}

export function ExpertRecommendation({ result }: ExpertRecommendationProps) {
  const { data: session } = useSession();
  const toast = useToast();
  const recommendationSet = useMemo(
    () => createOfferRecommendationSet(result),
    [result]
  );
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState(
    recommendationSet.cards[0]?.id ?? ''
  );
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>(
    recommendationSet.addOns.filter((addOn) => addOn.recommended).map((addOn) => addOn.id)
  );
  const [honeypot, setHoneypot] = useState('');
  const [submittedRequest, setSubmittedRequest] =
    useState<SubmittedRequestState | null>(null);
  const [formState, setFormState] = useState<OfferRequestFormState>(defaultFormState);

  useEffect(() => {
    setDismissed(false);
    setExpanded(true);
    setSelectedOfferId(recommendationSet.cards[0]?.id ?? '');
    setSelectedAddOnIds(
      recommendationSet.addOns
        .filter((addOn) => addOn.recommended)
        .map((addOn) => addOn.id)
    );
    setSubmittedRequest(null);
    setShowRequestModal(false);
    setHoneypot('');
    setFormState((prev) => ({
      ...defaultFormState(),
      name: prev.name || session?.user?.name || '',
      email: prev.email || session?.user?.email || '',
    }));
  }, [recommendationSet, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      name: prev.name || session?.user?.name || '',
      email: prev.email || session?.user?.email || '',
    }));
  }, [session?.user?.email, session?.user?.name]);

  const selectedOffer =
    recommendationSet.cards.find((card) => card.id === selectedOfferId) ??
    recommendationSet.cards[0];

  const selectedAddOns = recommendationSet.addOns.filter((addOn) =>
    selectedAddOnIds.includes(addOn.id)
  );

  const hostLabel = useMemo(() => {
    try {
      return new URL(result.url).hostname;
    } catch {
      return result.url;
    }
  }, [result.url]);

  if (dismissed || recommendationSet.cards.length === 0) {
    return null;
  }

  const openRequestModal = (offer: OfferCard) => {
    setSelectedOfferId(offer.id);
    setShowRequestModal(true);
  };

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(addOnId)
        ? prev.filter((entry) => entry !== addOnId)
        : [...prev, addOnId]
    );
  };

  const updateForm = <K extends keyof OfferRequestFormState>(
    key: K,
    value: OfferRequestFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOffer) {
      toast.showError('Es konnte kein Angebot ausgewählt werden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/offer-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: result.url,
          scenario: recommendationSet.scenario,
          selectedOffer: {
            id: selectedOffer.id,
            title: selectedOffer.title,
            priceLabel: selectedOffer.priceLabel,
            badge: selectedOffer.badge,
            setupTimeLabel: selectedOffer.setupTimeLabel,
            rationale: selectedOffer.rationale,
            includes: selectedOffer.includes,
            bestFor: selectedOffer.bestFor,
          },
          availableOffers: recommendationSet.cards.map((card) => ({
            id: card.id,
            title: card.title,
            priceLabel: card.priceLabel,
            badge: card.badge,
          })),
          selectedAddOns: selectedAddOns.map((addOn) => ({
            id: addOn.id,
            title: addOn.title,
            priceLabel: addOn.priceLabel,
            reason: addOn.reason,
          })),
          contact: {
            name: formState.name.trim(),
            email: formState.email.trim(),
            company: formState.company.trim(),
            phone: formState.phone.trim(),
          },
          message: formState.message.trim(),
          consent: formState.consent,
          honeypot,
          analysisSummary: {
            overallScore: result.scoreBreakdown?.overall ?? result.score,
            gdprScore:
              result.scoreBreakdown?.gdpr ?? result.gdprChecklist?.score ?? 0,
            trackingScore: result.scoreBreakdown?.tracking ?? 0,
            detectedPlatforms: recommendationSet.detectedPlatforms,
            topIssues: recommendationSet.topIssues,
            heading: recommendationSet.heading,
          },
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        details?: string;
        deliveryConfigured?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Anfrage konnte nicht versendet werden.');
      }

      setSubmittedRequest({
        offerTitle: selectedOffer.title,
        email: formState.email.trim(),
        deliveryConfigured: data.deliveryConfigured !== false,
      });
      setShowRequestModal(false);
      setFormState((prev) => ({
        ...defaultFormState(),
        name: prev.name,
        email: prev.email,
      }));
      setSelectedAddOnIds(
        recommendationSet.addOns
          .filter((addOn) => addOn.recommended)
          .map((addOn) => addOn.id)
      );
      setHoneypot('');
      if (data.deliveryConfigured === false) {
        toast.showInfo(
          data.message ||
            'Anfrage validiert. Der Versand wird aktiv, sobald Resend konfiguriert ist.'
        );
      } else {
        toast.showSuccess('Anfrage erfolgreich versendet. Wir melden uns zeitnah.');
      }
    } catch (error) {
      toast.showError(
        error instanceof Error
          ? error.message
          : 'Die Angebotsanfrage konnte nicht versendet werden.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-950/50 overflow-hidden">
        <div className="flex items-stretch border-b border-slate-800/80 bg-slate-900/70">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex-1 px-4 py-3 sm:px-5 sm:py-4 text-left hover:bg-white/5 transition-colors"
            aria-expanded={expanded}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20">
                  <ShieldCheck className="w-5 h-5 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-100">
                      {recommendationSet.heading}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-[11px] text-indigo-300">
                      Franco Consulting
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
                    {recommendationSet.subheading}
                  </p>
                </div>
              </div>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-4 text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            aria-label="Angebotssektion ausblenden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {expanded && (
          <div className="p-4 sm:p-5 space-y-5">
            {submittedRequest && (
              <div
                className={`rounded-xl border p-4 ${
                  submittedRequest.deliveryConfigured
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-amber-500/30 bg-amber-500/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      submittedRequest.deliveryConfigured
                        ? 'text-green-400'
                        : 'text-amber-300'
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        submittedRequest.deliveryConfigured
                          ? 'text-green-300'
                          : 'text-amber-200'
                      }`}
                    >
                      {submittedRequest.deliveryConfigured
                        ? 'Anfrage versendet'
                        : 'Anfrage vorbereitet'}
                    </p>
                    <p className="text-sm text-slate-300 mt-1">
                      {submittedRequest.deliveryConfigured ? (
                        <>
                          Die Anfrage für <span className="text-slate-100">{submittedRequest.offerTitle}</span>{' '}
                          zu <span className="text-slate-100">{hostLabel}</span> wurde versendet.
                          Eine Bestätigung ging an <span className="text-slate-100">{submittedRequest.email}</span>.
                        </>
                      ) : (
                        <>
                          Die Anfrage für <span className="text-slate-100">{submittedRequest.offerTitle}</span>{' '}
                          wurde validiert. Der Mailversand ist aktuell noch nicht konfiguriert,
                          daher wurde noch nichts an <span className="text-slate-100">{submittedRequest.email}</span> versendet.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {recommendationSet.highlightPills.map((pill) => (
                <span
                  key={pill}
                  className="px-2.5 py-1 rounded-full border border-slate-700 bg-slate-900/70 text-xs text-slate-300"
                >
                  {pill}
                </span>
              ))}
            </div>

            <div
              className={`grid gap-4 ${
                recommendationSet.cards.length >= 3
                  ? 'lg:grid-cols-3'
                  : 'lg:grid-cols-2'
              }`}
            >
              {recommendationSet.cards.map((card) => (
                <OfferCardView
                  key={card.id}
                  card={card}
                  onRequest={() => openRequestModal(card)}
                />
              ))}
            </div>

            {recommendationSet.addOns.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Sinnvolle Add-ons für dieses Setup
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Optional zubuchbar, wenn zusätzliche Plattformen oder Detail-Setups
                      mit aufgenommen werden sollen.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendationSet.addOns.map((addOn) => (
                    <AddOnCard
                      key={addOn.id}
                      addOn={addOn}
                      selected={selectedAddOnIds.includes(addOn.id)}
                      onToggle={() => toggleAddOn(addOn.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Auf Basis dieser Analyse ein unverbindliches Angebot anfordern
                  </p>
                  <p className="text-sm text-slate-300 mt-1">
                    Wir schicken eine erste Einschätzung für{' '}
                    <span className="text-slate-100">{hostLabel}</span> und melden uns
                    bei Rückfragen direkt.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => openRequestModal(recommendationSet.cards[0])}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:from-indigo-500 hover:to-purple-500 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Unverbindliches Angebot erhalten
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="https://www.franco-consulting.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/70 text-slate-200 font-medium text-sm hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Franco Consulting
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showRequestModal && selectedOffer && (
        <OfferRequestModal
          selectedOffer={selectedOffer}
          addOns={recommendationSet.addOns}
          selectedAddOnIds={selectedAddOnIds}
          formState={formState}
          isSubmitting={isSubmitting}
          honeypot={honeypot}
          onClose={() => setShowRequestModal(false)}
          onToggleAddOn={toggleAddOn}
          onFormChange={updateForm}
          onSubmit={handleSubmitRequest}
          onHoneypotChange={setHoneypot}
        />
      )}
    </>
  );
}

function OfferCardView({
  card,
  onRequest,
}: {
  card: OfferCard;
  onRequest: () => void;
}) {
  const accent = accentStyles[card.accent];

  return (
    <div
      className={`rounded-2xl border ${accent.border} ${accent.outline} bg-gradient-to-br ${accent.cardBg} bg-slate-900/70 p-4 sm:p-5 transition-all`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2 rounded-xl ${accent.iconBg}`}>
            <ShieldCheck className={`w-5 h-5 ${accent.iconText}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-base font-semibold text-slate-100">
                {card.title}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[11px] ${accent.badge}`}
              >
                {card.badge}
              </span>
            </div>
            <p className="text-sm text-slate-300">{card.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Ab Preis
          </div>
          <p className="text-sm font-semibold text-slate-100">{card.priceLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5" />
            Einrichtungszeit
          </div>
          <p className="text-sm font-semibold text-slate-100">{card.setupTimeLabel}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Warum es sich lohnt
          </p>
          <div className="space-y-2">
            {card.rationale.slice(0, 2).map((entry) => (
              <div key={entry} className="flex items-start gap-2">
                <CheckCircle2 className={`w-4 h-4 ${accent.iconText} shrink-0 mt-0.5`} />
                <span className="text-sm text-slate-300">{entry}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Enthalten
          </p>
          <div className="space-y-2">
            {card.includes.slice(0, 3).map((entry) => (
              <div key={entry} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-300">{entry}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs text-slate-500 mb-1">Sinnvoll wenn</p>
          <p className="text-sm text-slate-200">{card.bestFor}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRequest}
        className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${accent.button} text-white font-medium text-sm transition-all`}
      >
        <Send className="w-4 h-4" />
        Dieses Angebot anfragen
      </button>
    </div>
  );
}

function AddOnCard({
  addOn,
  selected,
  onToggle,
}: {
  addOn: OfferAddOn;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left rounded-xl border p-3 transition-colors ${
        selected
          ? 'border-indigo-500/40 bg-indigo-500/10'
          : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-100">{addOn.title}</span>
            {addOn.recommended && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-[10px] text-indigo-300 border border-indigo-500/30">
                Empfohlen
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300">{addOn.description}</p>
          <p className="text-xs text-slate-500 mt-2">{addOn.reason}</p>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center mb-2 ml-auto ${
              selected
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300'
                : 'border-slate-600 text-transparent'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-medium text-slate-200">{addOn.priceLabel}</p>
        </div>
      </div>
    </button>
  );
}

function OfferRequestModal({
  selectedOffer,
  addOns,
  selectedAddOnIds,
  formState,
  isSubmitting,
  honeypot,
  onClose,
  onToggleAddOn,
  onFormChange,
  onSubmit,
  onHoneypotChange,
}: {
  selectedOffer: OfferCard;
  addOns: OfferAddOn[];
  selectedAddOnIds: string[];
  formState: OfferRequestFormState;
  isSubmitting: boolean;
  honeypot: string;
  onClose: () => void;
  onToggleAddOn: (addOnId: string) => void;
  onFormChange: <K extends keyof OfferRequestFormState>(
    key: K,
    value: OfferRequestFormState[K]
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onHoneypotChange: (value: string) => void;
}) {
  const accent = accentStyles[selectedOffer.accent];

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />
      <div className="fixed inset-2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[92vw] sm:max-w-3xl sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Unverbindliches Angebot anfragen
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Franco Consulting meldet sich mit einer ersten Einschätzung.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            aria-label="Modal schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-auto">
          <div className="p-4 sm:p-5 space-y-5">
            <div
              className={`rounded-2xl border ${accent.border} bg-gradient-to-br ${accent.cardBg} p-4`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-slate-100">
                      {selectedOffer.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] ${accent.badge}`}>
                      {selectedOffer.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{selectedOffer.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 min-w-[240px]">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-xs text-slate-500 mb-1">Ab Preis</p>
                    <p className="text-sm font-semibold text-slate-100">
                      {selectedOffer.priceLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-xs text-slate-500 mb-1">Einrichtungszeit</p>
                    <p className="text-sm font-semibold text-slate-100">
                      {selectedOffer.setupTimeLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {addOns.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-3">
                  Optionale Add-ons mit aufnehmen
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {addOns.map((addOn) => (
                    <label
                      key={addOn.id}
                      className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                        selectedAddOnIds.includes(addOn.id)
                          ? 'border-indigo-500/40 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedAddOnIds.includes(addOn.id)}
                          onChange={() => onToggleAddOn(addOn.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-100">
                              {addOn.title}
                            </span>
                            {addOn.recommended && (
                              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] text-indigo-300">
                                Empfohlen
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300 mt-1">{addOn.description}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                            <span className="text-slate-500">{addOn.reason}</span>
                            <span className="text-slate-200 font-medium">
                              {addOn.priceLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Name *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(event) => onFormChange('name', event.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">E-Mail *</label>
                <input
                  type="email"
                  required
                  value={formState.email}
                  onChange={(event) => onFormChange('email', event.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="name@firma.de"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Firma
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formState.company}
                    onChange={(event) => onFormChange('company', event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Franco Consulting"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Telefon
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(event) => onFormChange('phone', event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="+49 ..."
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Zusätzliche Hinweise
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <textarea
                  rows={5}
                  value={formState.message}
                  onChange={(event) => onFormChange('message', event.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  placeholder="Gerne weitere Infos zu Shop-System, Zielplattformen oder Prioritäten ergänzen."
                />
              </div>
            </div>

            <div className="hidden" aria-hidden="true">
              <label htmlFor="fax-number">Fax</label>
              <input
                id="fax-number"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => onHoneypotChange(event.target.value)}
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.consent}
                onChange={(event) => onFormChange('consent', event.target.checked)}
                className="mt-1"
                required
              />
              <span className="text-sm text-slate-300">
                Ich stimme zu, dass Franco Consulting meine Angaben zur Bearbeitung
                der Angebotsanfrage per E-Mail verwenden darf. Die Anfrage ist
                unverbindlich.
              </span>
            </label>
          </div>

          <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Du erhältst eine Bestätigung per E-Mail. Danach meldet sich Franco Consulting
              mit einer unverbindlichen Ersteinschätzung.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${accent.button} text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-all`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wird versendet...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Angebot anfragen
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
