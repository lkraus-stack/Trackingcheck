'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, ChevronDown, CheckCircle2, Sparkles, Zap, TrendingUp, Lock, LayoutDashboard, Save, History, FolderOpen, ArrowRight, LogIn, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export function HeroSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const isLoggedIn = !!session?.user;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSignIn = async () => {
    await signIn('google', { callbackUrl: '/' });
  };

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-transparent to-transparent" />
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
      
      {/* Franco Consulting Badge */}
      <div className={`mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <a 
          href="https://www.franco-consulting.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-full text-sm text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800 transition-all group"
        >
          <span className="text-indigo-400">⚡</span>
          <span>Ein Produkt der</span>
          <span className="font-semibold text-white group-hover:text-indigo-400 transition-colors">Franco Consulting GmbH</span>
        </a>
      </div>

      {/* Main Headline */}
      <div className={`text-center max-w-4xl mx-auto transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
          <span className="text-slate-100">Ist dein Tracking</span>
          <br />
          <span className="gradient-text">DSGVO-konform?</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
          Analysiere deine Website in Sekunden. Finde Probleme bei Consent Mode, Cookie-Banner, 
          Server-Side Tracking und mehr – bevor es teuer wird.
        </p>
      </div>

      {/* CTA Button */}
      <div className={`transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={() => {
            const el = document.getElementById('analysis-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group relative inline-flex px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-300"
        >
          <span className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            Jetzt kostenlos prüfen
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 blur-xl opacity-50 group-hover:opacity-70 transition-opacity -z-10" />
        </button>
      </div>

      {/* Trust Badges - Different für eingeloggte User */}
      <div className={`mt-12 flex flex-wrap justify-center gap-6 sm:gap-8 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {isLoggedIn ? (
          <>
            <TrustBadge icon={<Save className="w-4 h-4" />} text="Analysen speichern" />
            <TrustBadge icon={<LayoutDashboard className="w-4 h-4" />} text="Dashboard & Projekte" />
            <TrustBadge icon={<History className="w-4 h-4" />} text="Vollständige Historie" />
            <TrustBadge icon={<FolderOpen className="w-4 h-4" />} text="Projekte verwalten" />
          </>
        ) : (
          <>
            <TrustBadge icon={<CheckCircle2 className="w-4 h-4" />} text="100% Kostenlos" />
            <TrustBadge icon={<Lock className="w-4 h-4" />} text="Keine Daten gespeichert" />
            <TrustBadge icon={<Zap className="w-4 h-4" />} text="Ergebnis in 60 Sek." />
            <TrustBadge icon={<TrendingUp className="w-4 h-4" />} text="KI-Analyse" />
          </>
        )}
      </div>

      {/* Benefits Box für nicht-eingeloggte User */}
      {!isLoggedIn && (
        <div className={`mt-8 max-w-2xl mx-auto transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl backdrop-blur-sm shadow-lg shadow-indigo-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">Mehr Vorteile mit Konto</h3>
                <p className="text-xs text-slate-400">Melde dich kostenlos an und nutze alle Features</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Alle Analysen speichern</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Projekte für mehrere URLs verwalten</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Vergleich von Analysen über Zeit</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Zugriff von allen Geräten</span>
              </div>
            </div>
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              <LogIn className="w-4 h-4" />
              <span>Jetzt kostenlos mit Google anmelden</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Benefits für eingeloggte User */}
      {isLoggedIn && (
        <div className={`mt-8 max-w-2xl mx-auto transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-slate-200">Deine Vorteile mit Konto</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300 mb-4">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Alle Analysen werden gespeichert</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Projekte für mehrere URLs verwalten</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Vergleich von Analysen über Zeit</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Zugriff von allen Geräten</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors font-medium"
            >
              Zum Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Feature Grid */}
      <div className={`mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <FeatureCard 
          emoji="🍪" 
          title="Cookie Banner" 
          description="Akzeptieren & Ablehnen Test" 
        />
        <FeatureCard 
          emoji="🛡️" 
          title="Consent Mode v2" 
          description="Google DMA-Compliance" 
        />
        <FeatureCard 
          emoji="📊" 
          title="Tracking Tags" 
          description="GA4, Meta, TikTok & mehr" 
        />
        <FeatureCard 
          emoji="⚖️" 
          title="DSGVO-Check" 
          description="Vollständige Compliance" 
        />
      </div>

      {/* Scroll Indicator */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={() => {
            const el = document.getElementById('analysis-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <span className="text-xs">Zur Analyse</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </button>
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

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="p-4 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:border-slate-600 hover:bg-slate-800/60 transition-all group">
      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{emoji}</div>
      <h3 className="font-medium text-slate-200 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}
