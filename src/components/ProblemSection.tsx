'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, TrendingDown, Ban, Clock, Target, DollarSign, ChevronRight } from 'lucide-react';

export function ProblemSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const problems = [
    {
      icon: <Ban className="w-6 h-6" />,
      title: "Falsches Consent Mode",
      stat: "40%",
      statLabel: "Datenverlust",
      description: "Ohne korrektes Consent Mode v2 verlierst du bis zu 40% deiner Conversion-Daten in Google Ads.",
      color: "red",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "ITP & Cookie-Limits",
      stat: "7 Tage",
      statLabel: "Attribution nur",
      description: "Safari-Nutzer (~25% in DACH) verlieren Attribution nach 7 Tagen. Server-Side Tracking löst das.",
      color: "orange",
    },
    {
      icon: <AlertTriangle className="w-6 h-6" />,
      title: "DSGVO-Verstöße",
      stat: "4%",
      statLabel: "vom Jahresumsatz",
      description: "Bußgelder können bis zu 4% des weltweiten Jahresumsatzes betragen. Prävention ist günstiger.",
      color: "yellow",
    },
    {
      icon: <TrendingDown className="w-6 h-6" />,
      title: "Adblocker-Verluste",
      stat: "30-40%",
      statLabel: "blockierte Conversions",
      description: "Ohne Server-Side Tracking gehen 30-40% der Conversions durch Adblocker verloren.",
      color: "purple",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Schlechte Event-Qualität",
      stat: "Höhere",
      statLabel: "CPAs",
      description: "Meta & Google können ohne saubere Daten nicht optimieren. Das Ergebnis: steigende Akquisekosten.",
      color: "blue",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Fehlende Wertübergabe",
      stat: "0%",
      statLabel: "ROAS-Optimierung",
      description: "Ohne Transaction-ID & Value kann kein Algorithmus auf Umsatz optimieren – Geld bleibt liegen.",
      color: "cyan",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-400' },
      orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-400' },
      yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-400' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'text-purple-400' },
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-400' },
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: 'text-cyan-400' },
    };
    return colors[color] || colors.red;
  };

  return (
    <section 
      ref={sectionRef}
      id="problems-section"
      className="py-20 px-4 relative"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/5 to-transparent" />
      
      <div className="max-w-6xl mx-auto relative">
        {/* Section Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm mb-6">
            <AlertTriangle className="w-4 h-4" />
            <span>Warum falsches Tracking teuer wird</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
            Die versteckten Kosten von <span className="text-red-400">schlechtem Tracking</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Viele Unternehmen verlieren täglich Geld und riskieren Bußgelder, 
            ohne es zu wissen. Diese Probleme sind weit verbreitet:
          </p>
        </div>

        {/* Problem Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {problems.map((problem, index) => {
            const colors = getColorClasses(problem.color);
            return (
              <div
                key={problem.title}
                className={`${colors.bg} ${colors.border} border rounded-xl p-5 hover:scale-[1.02] transition-all duration-300 ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 ${colors.bg} rounded-lg ${colors.icon}`}>
                    {problem.icon}
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${colors.text}`}>{problem.stat}</div>
                    <div className="text-xs text-slate-500">{problem.statLabel}</div>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-200 mb-2">{problem.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{problem.description}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className={`mt-12 text-center transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-slate-400 mb-4">
            Die gute Nachricht: All diese Probleme sind lösbar.
          </p>
          <button 
            onClick={() => document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Jetzt deine Website prüfen
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
