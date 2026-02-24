'use client';

import { ChatInterface } from '@/components/ChatInterface';

export default function InternalAppPage() {
  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
          Tracking Checker (intern)
        </h2>
        <p className="text-slate-400 max-w-2xl">
          Vollständiger Checker für Mitarbeiter und Partner. Für die komplette Auswertung bitte
          anmelden.
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
        <ChatInterface embedded autoFocus />
      </div>
    </div>
  );
}

