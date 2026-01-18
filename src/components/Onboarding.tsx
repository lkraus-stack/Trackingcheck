'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles, Globe, LayoutDashboard, CheckCircle2, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const ONBOARDING_STORAGE_KEY = 'tracking-checker-onboarding-completed';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!session?.user);
  }, [session]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Willkommen beim Tracking Checker! 👋',
      description: 'Analysiere deine Website in Sekunden. Finde Probleme bei Consent Mode, Cookie-Banner, Server-Side Tracking und mehr - bevor es teuer wird.',
      icon: <Sparkles className="w-8 h-8 text-indigo-400" />,
      action: {
        label: 'Los geht\'s!',
        onClick: () => setCurrentStep(1),
      },
    },
    {
      id: 'analyze',
      title: '1. Website analysieren',
      description: 'Gib einfach eine URL ein und starte die Analyse. Der Tracking Checker prüft automatisch Cookie-Banner, Consent Mode, Tracking-Tags und DSGVO-Compliance.',
      icon: <Globe className="w-8 h-8 text-cyan-400" />,
      action: {
        label: 'Weiter',
        onClick: () => setCurrentStep(2),
      },
    },
    {
      id: 'dashboard',
      title: '2. Dashboard & Projekte',
      description: isLoggedIn
        ? 'Verwalte alle deine Analysen im Dashboard. Erstelle Projekte, vergleiche Ergebnisse und behalte den Überblick über deine Tracking-Konfiguration.'
        : 'Melde dich an, um deine Analysen zu speichern und Projekte zu verwalten. So behältst du den Überblick über alle deine Websites.',
      icon: <LayoutDashboard className="w-8 h-8 text-purple-400" />,
      action: {
        label: isLoggedIn ? 'Zum Dashboard' : 'Jetzt anmelden',
        onClick: () => {
          if (isLoggedIn) {
            router.push('/dashboard');
            onComplete();
          } else {
            router.push('/auth/signin');
            onComplete();
          }
        },
      },
    },
    {
      id: 'features',
      title: '3. Features nutzen',
      description: '✓ KI-Analyse für detaillierte Auswertungen\n✓ Vergleich von Analysen über Zeit\n✓ Export von Reports\n✓ Limit-Tracking für alle Pläne',
      icon: <CheckCircle2 className="w-8 h-8 text-green-400" />,
      action: {
        label: 'Fertig',
        onClick: () => {
          localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
          onComplete();
        },
      },
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (currentStepData.action) {
      currentStepData.action.onClick();
    } else {
      if (isLastStep) {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
        onComplete();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in-up animation-delay-2000">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200">Quick Start Guide</h2>
              <p className="text-xs text-slate-400">
                Schritt {currentStep + 1} von {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            title="Überspringen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icon */}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              {currentStepData.icon}
            </div>

            {/* Title */}
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-200">
              {currentStepData.title}
            </h3>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-400 max-w-md whitespace-pre-line">
              {currentStepData.description}
            </p>

            {/* Progress Dots */}
            <div className="flex items-center gap-2 pt-4">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-indigo-500'
                      : index < currentStep
                        ? 'w-2 bg-indigo-500/50'
                        : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/30">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isFirstStep
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-300 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
          >
            {currentStepData.action?.label || (isLastStep ? 'Fertig' : 'Weiter')}
            {!isLastStep && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  // KEIN automatisches Anzeigen mehr - nur manuell über openOnboarding()

  const completeOnboarding = () => {
    setShowOnboarding(false);
    // Speichere den Abschluss in LocalStorage
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  };

  const openOnboarding = () => {
    setShowOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    completeOnboarding,
    openOnboarding,
    resetOnboarding,
  };
}
