'use client';

import { Shield, CheckCircle2, Sparkles, Zap, Lock } from 'lucide-react';

export function HeroSection() {
  const scrollToAnalysis = () => {
    const el = document.getElementById('analysis-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden px-4 pt-8 pb-6 sm:pt-10 sm:pb-8">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-transparent to-transparent" />
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
      
      <div className="relative text-center max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
          <span className="text-slate-100">Prüfe dein Tracking</span>
          <br className="hidden sm:block" />
          <span className="gradient-text">und frage direkt nach</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 mb-5 sm:mb-6 max-w-2xl mx-auto">
          Gib deine URL ein oder stelle direkt Fachfragen – in wenigen Sekunden bekommst du einen
          klaren Überblick zu Tracking und möglichen Risiken auf deiner Website.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={scrollToAnalysis}
            className="group relative inline-flex px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all duration-300"
          >
            <span className="flex items-center gap-3">
              <Shield className="w-5 h-5" />
              Jetzt Tracking prüfen
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 blur-xl opacity-50 group-hover:opacity-70 transition-opacity -z-10" />
          </button>

          <p className="text-sm text-slate-500">
            Ohne Anmeldung starten. Erste Ergebnisse in ca. 60 Sekunden.
          </p>
        </div>

        <div className="mt-5 sm:mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-6">
          <TrustBadge icon={<CheckCircle2 className="w-4 h-4" />} text="Kostenlos starten" />
          <TrustBadge icon={<Lock className="w-4 h-4" />} text="Keine Anmeldung nötig" />
          <TrustBadge icon={<Zap className="w-4 h-4" />} text="Schneller Website-Check" />
          <TrustBadge icon={<Shield className="w-4 h-4" />} text="DSGVO-Fokus" />
        </div>
      </div>
    </section>
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

