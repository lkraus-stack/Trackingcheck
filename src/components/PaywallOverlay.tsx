'use client';

import { useSession } from 'next-auth/react';
import { Lock, ArrowRight, Sparkles, X } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

interface PaywallOverlayProps {
  feature: string; // z.B. "Speichern", "KI-Analyse", "Export"
  message?: string;
  blurIntensity?: 'light' | 'medium' | 'heavy';
  onDismiss?: () => void;
  dismissible?: boolean;
}

export function PaywallOverlay({ 
  feature, 
  message,
  blurIntensity = 'medium',
  onDismiss,
  dismissible = false
}: PaywallOverlayProps) {
  const { data: session } = useSession();
  const [isDismissed, setIsDismissed] = useState(false);
  const isLoggedIn = !!session?.user;
  
  if (isLoggedIn || isDismissed) return null;
  
  const blurClass = {
    light: 'backdrop-blur-sm',
    medium: 'backdrop-blur-md',
    heavy: 'backdrop-blur-lg'
  }[blurIntensity];
  
  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };
  
  const handleSignIn = () => {
    signIn('google', { callbackUrl: window.location.href });
  };
  
  return (
    <div className={`absolute inset-0 bg-slate-900/90 ${blurClass} rounded-lg flex items-center justify-center z-20 transition-opacity`}>
      <div className="relative text-center p-6 sm:p-8 max-w-sm mx-4">
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 transition-colors p-1"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <div className="p-3 bg-indigo-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-indigo-500/30">
          <Lock className="w-8 h-8 text-indigo-400" />
        </div>
        
        <h3 className="text-lg sm:text-xl font-semibold text-slate-200 mb-2">
          {feature} erfordert Anmeldung
        </h3>
        
        <p className="text-sm text-slate-400 mb-6">
          {message || 'Melde dich kostenlos an, um diese Funktion zu nutzen.'}
        </p>
        
        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-indigo-500/20"
          >
            <Sparkles className="w-4 h-4" />
            Jetzt kostenlos anmelden
            <ArrowRight className="w-4 h-4" />
          </button>
          
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="w-full text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Später
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrapper Component für Feature-Gating
interface FeatureGateProps {
  requiresLogin?: boolean;
  feature?: string;
  message?: string;
  blurIntensity?: 'light' | 'medium' | 'heavy';
  dismissible?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FeatureGate({ 
  requiresLogin = false,
  feature,
  message,
  blurIntensity,
  dismissible = false,
  children,
  className = ''
}: FeatureGateProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  
  if (!requiresLogin) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <div className={`relative ${className}`}>
      {children}
      {!isLoggedIn && (
        <PaywallOverlay 
          feature={feature || 'Diese Funktion'} 
          message={message}
          blurIntensity={blurIntensity}
          dismissible={dismissible}
        />
      )}
    </div>
  );
}
