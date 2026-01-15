'use client';

import { useState, useEffect } from 'react';
import { Shield, ChevronDown, CheckCircle2, Sparkles, Zap, TrendingUp, Lock } from 'lucide-react';

interface HeroSectionProps {
  onStartAnalysis: () => void;
}

export function HeroSection({ onStartAnalysis }: HeroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToAnalysis = () => {
    onStartAnalysis();
    const analysisSection = document.getElementById('analysis-section');
    if (analysisSection) {
      analysisSection.scrollIntoView({ behavior: 'smooth' });
    }
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
          onClick={scrollToAnalysis}
          className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-300"
        >
          <span className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            Jetzt kostenlos prüfen
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 blur-xl opacity-50 group-hover:opacity-70 transition-opacity -z-10" />
        </button>
      </div>

      {/* Trust Badges */}
      <div className={`mt-12 flex flex-wrap justify-center gap-6 sm:gap-8 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <TrustBadge icon={<CheckCircle2 className="w-4 h-4" />} text="100% Kostenlos" />
        <TrustBadge icon={<Lock className="w-4 h-4" />} text="Keine Daten gespeichert" />
        <TrustBadge icon={<Zap className="w-4 h-4" />} text="Ergebnis in 60 Sek." />
        <TrustBadge icon={<TrendingUp className="w-4 h-4" />} text="KI-Analyse" />
      </div>

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
          onClick={scrollToAnalysis}
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
