import Link from 'next/link';
import { Shield, ExternalLink } from 'lucide-react';

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-grid-pattern hero-pattern">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full max-w-[1100px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/v1" className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-bold gradient-text truncate">
                  Tracking Checker
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                  by Franco Consulting
                </div>
              </div>
            </Link>

            <a
              href="https://www.franco-consulting.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Franco Consulting</span>
              <span className="sm:hidden">Website</span>
            </a>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-800 bg-slate-950 py-10 mt-10">
        <div className="max-w-[1100px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            © {new Date().getFullYear()} Franco Consulting GmbH. Alle Rechte vorbehalten.
          </div>
          <div className="flex items-center gap-4">
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
      </footer>
    </div>
  );
}

