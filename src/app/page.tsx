'use client';

import { useState, useRef } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { HeroSection } from '@/components/HeroSection';
import { ProblemSection } from '@/components/ProblemSection';
import { AgencySection } from '@/components/AgencySection';
import { 
  Shield, 
  Cookie, 
  BarChart3, 
  Zap, 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin,
  ChevronUp,
  Star
} from 'lucide-react';

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  const scrollToAnalysis = () => {
    analysisRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Show scroll-to-top button when scrolled down
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      setShowScrollTop(window.scrollY > 500);
    });
  }

  return (
    <div className="min-h-screen bg-grid-pattern hero-pattern">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold gradient-text">Tracking Checker</h1>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  by <a href="https://www.franco-consulting.com/" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">Franco Consulting</a>
                </p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#analysis-section" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Analyse
              </a>
              <a href="#problems-section" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Warum wichtig?
              </a>
              <a href="#agency-section" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Über uns
              </a>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="hidden lg:flex items-center gap-3">
                <FeatureBadge icon={<Cookie className="w-4 h-4" />} text="Cookie Banner" />
                <FeatureBadge icon={<Shield className="w-4 h-4" />} text="Consent Mode" />
                <FeatureBadge icon={<BarChart3 className="w-4 h-4" />} text="Tracking Tags" />
              </div>
              <a
                href="https://www.franco-consulting.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Franco Consulting
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable Sections */}
      <main>
        {/* Hero Section */}
        <HeroSection onStartAnalysis={scrollToAnalysis} />

        {/* Divider */}
        <div className="section-divider max-w-4xl mx-auto" />

        {/* Analysis Section */}
        <section 
          ref={analysisRef}
          id="analysis-section" 
          className="py-12 sm:py-16 px-4"
        >
          <div className="max-w-[1400px] mx-auto">
            {/* Section Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
                Website analysieren
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Gib deine URL ein und erhalte eine detaillierte Analyse deines Tracking-Setups.
              </p>
            </div>

            {/* Chat Interface */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
              <ChatInterface embedded autoFocus />
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="section-divider max-w-4xl mx-auto" />

        {/* Problem Section */}
        <ProblemSection />

        {/* Divider */}
        <div className="section-divider max-w-4xl mx-auto" />

        {/* Agency Section */}
        <AgencySection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 mt-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top Footer */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Tracking Checker</h3>
                  <p className="text-xs text-slate-500">Ein Produkt der Franco Consulting GmbH</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4 max-w-sm">
                Kostenlose Analyse für Cookie-Banner, Google Consent Mode v2, 
                Tracking-Tags und DSGVO-Compliance. Entwickelt von Performance-Marketing-Experten.
              </p>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
                <span className="text-sm text-slate-500 ml-2">5.0 Google Bewertungen</span>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-slate-200 mb-4">Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#analysis-section" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Analyse starten
                  </a>
                </li>
                <li>
                  <a href="#problems-section" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Warum Tracking wichtig ist
                  </a>
                </li>
                <li>
                  <a href="#agency-section" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Über uns
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.franco-consulting.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Franco Consulting →
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-slate-200 mb-4">Kontakt</h4>
              <ul className="space-y-3">
                <li>
                  <a href="tel:082224183998" className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    <Phone className="w-4 h-4" />
                    08222 4183998
                  </a>
                </li>
                <li>
                  <a href="mailto:kontakt@franco-consulting.com" className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    <Mail className="w-4 h-4" />
                    kontakt@franco-consulting.com
                  </a>
                </li>
                <li>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" />
                    Burgau, Deutschland
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} Franco Consulting GmbH. Alle Rechte vorbehalten.
              </p>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  Powered by Next.js
                </span>
                <span className="text-xs text-slate-500">
                  Keine Daten werden gespeichert
                </span>
                <a 
                  href="https://www.franco-consulting.com/impressum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Impressum
                </a>
                <a 
                  href="https://www.franco-consulting.com/datenschutz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Datenschutz
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/25 transition-all hover:scale-110 z-40"
          aria-label="Nach oben scrollen"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function FeatureBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
      <span className="text-indigo-400">{icon}</span>
      <span className="text-xs text-slate-400">{text}</span>
    </div>
  );
}
