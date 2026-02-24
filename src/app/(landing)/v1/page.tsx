'use client';

import { Shield, Sparkles, CheckCircle2, Lock, Zap, TrendingUp } from 'lucide-react';
import { LandingAnalyzer } from '@/components/landing/LandingAnalyzer';
import { ProblemSection } from '@/components/ProblemSection';
import { AgencySection } from '@/components/AgencySection';

export default function V1LandingPage() {
  return (
    <div className="px-4">
      <section className="relative max-w-[1100px] mx-auto py-14 sm:py-18">
        <div
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-full text-xs text-slate-300 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Kostenloser Kurz-Check (ohne Anmeldung)
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold mb-5 leading-tight">
            <span className="text-slate-100">Ist dein Tracking wirklich</span>
            <br />
            <span className="gradient-text">sauber & DSGVO-konform?</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 mb-10">
            Prüfe deine Website in ca. 60 Sekunden. Du bekommst eine kompakte Auswertung mit den
            größten Tracking-Potenzialen – und auf Wunsch eine kostenlose Experten-Einschätzung.
          </p>
        </div>

        <div id="analysis-section" className="max-w-4xl mx-auto">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
            <LandingAnalyzer autoFocus />
          </div>
        </div>

        <div
          className="mt-10 flex flex-wrap justify-center gap-6 sm:gap-8"
        >
          <TrustBadge icon={<CheckCircle2 className="w-4 h-4" />} text="100% kostenlos" />
          <TrustBadge icon={<Lock className="w-4 h-4" />} text="Keine Anmeldung nötig" />
          <TrustBadge icon={<Zap className="w-4 h-4" />} text="Ergebnis in ~60 Sek." />
          <TrustBadge icon={<TrendingUp className="w-4 h-4" />} text="Potenziale erkennen" />
        </div>

        <div className="mt-12 max-w-4xl mx-auto section-divider" />

        <section className="max-w-4xl mx-auto py-10 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoCard
              icon={<Shield className="w-5 h-5 text-indigo-400" />}
              title="Consent & Banner"
              description="Consent Mode, Ablehnen-Option, Tracking vor Consent."
            />
            <InfoCard
              icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
              title="Tracking-Setups"
              description="GA4, GTM, Meta & Co. – plus Server-Side Hinweise."
            />
            <InfoCard
              icon={<Sparkles className="w-5 h-5 text-indigo-400" />}
              title="Umsatz-Potenzial"
              description="Hinweise auf fehlende Wertübergaben & Optimierungschancen."
            />
          </div>
        </section>
      </section>

      <div className="section-divider max-w-4xl mx-auto" />

      {/* Warum falsches Tracking teuer wird */}
      <ProblemSection />

      <div className="section-divider max-w-4xl mx-auto" />

      {/* Franco Consulting / Leistungen / Kontakt */}
      <AgencySection />
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <span className="text-green-400">{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="shrink-0">{icon}</span>
        <h3 className="font-medium text-slate-200 text-sm">{title}</h3>
      </div>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

