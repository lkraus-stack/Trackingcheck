'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ExternalLink, 
  Server, 
  Shield, 
  BarChart3, 
  Target, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Star
} from 'lucide-react';

export function AgencySection() {
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

  const services = [
    {
      icon: <Server className="w-6 h-6" />,
      title: "Tracking Setup",
      description: "Server-Side GTM, Meta CAPI, GA4 und mehr – richtig implementiert.",
      features: ["Server-Side GTM", "Meta Conversions API", "GA4 E-Commerce", "Enhanced Conversions"],
      color: "indigo",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Consent Optimierung",
      description: "DSGVO & DMA-konformes Setup mit maximalem Consent-Rate.",
      features: ["Consent Mode v2", "CMP-Konfiguration", "Cookie-Banner UX", "Compliance-Audit"],
      color: "purple",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Performance Marketing",
      description: "Datengetriebene Kampagnen auf allen relevanten Plattformen.",
      features: ["Google Ads", "Meta Ads", "TikTok Ads", "LinkedIn Ads"],
      color: "cyan",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
      indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', icon: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-400' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-400' },
    };
    return colors[color] || colors.indigo;
  };

  return (
    <section 
      ref={sectionRef}
      id="agency-section"
      className="py-20 px-4 relative"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent" />
      
      <div className="max-w-6xl mx-auto relative">
        {/* Section Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>Deine Tracking & Ads Spezialisten</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
            <span className="gradient-text">Franco Consulting</span>
            <br />
            <span className="text-slate-300 text-2xl sm:text-3xl">Performance Marketing Agentur</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Wir sind ein Team aus Performance-Marketing-Spezialisten mit klarem Fokus: 
            Messbare Ergebnisse durch sauberes Tracking und datengetriebene Kampagnen.
          </p>
        </div>

        {/* Trust Bar */}
        <div className={`flex flex-wrap justify-center gap-6 mb-12 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center gap-2 text-slate-400">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <span className="text-sm">5.0 Google Bewertungen</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm">White-Label Partner</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Target className="w-4 h-4 text-indigo-400" />
            <span className="text-sm">DACH-Region</span>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {services.map((service, index) => {
            const colors = getColorClasses(service.color);
            return (
              <div
                key={service.title}
                className={`${colors.bg} ${colors.border} border rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${(index + 2) * 100}ms` }}
              >
                <div className={`p-3 ${colors.bg} rounded-lg w-fit ${colors.icon} mb-4`}>
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">{service.title}</h3>
                <p className="text-sm text-slate-400 mb-4">{service.description}</p>
                <div className="flex flex-wrap gap-2">
                  {service.features.map((feature) => (
                    <span 
                      key={feature}
                      className={`px-2 py-1 ${colors.badge} text-xs rounded-full`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Card */}
        <div className={`bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-8 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold text-slate-100 mb-2">
                Probleme gefunden? Wir lösen sie.
              </h3>
              <p className="text-slate-400 max-w-lg">
                Egal ob Consent Mode, Server-Side Tracking oder komplettes Ad-Management – 
                wir übernehmen das für dich. Kostenlose Erstberatung inklusive.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://www.franco-consulting.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2"
              >
                Preis kalkulieren
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://www.franco-consulting.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-semibold hover:bg-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Website besuchen
              </a>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className={`mt-12 flex flex-wrap justify-center gap-8 text-slate-500 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <a href="tel:082224183998" className="flex items-center gap-2 hover:text-slate-300 transition-colors">
            <Phone className="w-4 h-4" />
            <span className="text-sm">08222 4183998</span>
          </a>
          <a href="mailto:kontakt@franco-consulting.com" className="flex items-center gap-2 hover:text-slate-300 transition-colors">
            <Mail className="w-4 h-4" />
            <span className="text-sm">kontakt@franco-consulting.com</span>
          </a>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Burgau, Deutschland</span>
          </div>
        </div>
      </div>
    </section>
  );
}
