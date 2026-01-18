'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'Es gibt ein Problem mit der Server-Konfiguration. Bitte kontaktiere den Support.',
    AccessDenied: 'Du hast den Zugriff auf dein Konto verweigert.',
    Verification: 'Der Verifizierungs-Token ist abgelaufen oder wurde bereits verwendet.',
    Default: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.',
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Tracking Checker</h1>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-red-500/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-slate-100">Anmeldung fehlgeschlagen</h2>
          </div>

          <p className="text-slate-400 text-sm mb-6">{errorMessage}</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/auth/signin"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Erneut versuchen
            </Link>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
