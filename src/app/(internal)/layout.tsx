import Link from 'next/link';
import { Shield, ExternalLink } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { UsageIndicator } from '@/components/UsageIndicator';

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-grid-pattern hero-pattern">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/app" className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold gradient-text">Tracking Checker</h1>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  Intern ·{' '}
                  <a
                    href="https://www.franco-consulting.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-indigo-400 transition-colors"
                  >
                    Franco Consulting
                  </a>
                </p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Öffentliche Seite
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Dashboard
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <UsageIndicator />
              <AuthButton />
              <a
                href="https://www.franco-consulting.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Franco Consulting</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-8">{children}</main>
    </div>
  );
}

