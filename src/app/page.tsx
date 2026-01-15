import { ChatInterface } from '@/components/ChatInterface';
import { Shield, Cookie, BarChart3, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 shrink-0">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold gradient-text">Tracking Checker</h1>
                <p className="text-[10px] sm:text-xs text-slate-500">Cookie & Consent Analyse</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 lg:gap-6">
              <FeatureBadge icon={<Cookie className="w-4 h-4" />} text="Cookie Banner" />
              <FeatureBadge icon={<Shield className="w-4 h-4" />} text="Consent Mode" />
              <FeatureBadge icon={<BarChart3 className="w-4 h-4" />} text="Tracking Tags" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        <ChatInterface />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/50 py-3 sm:py-4 shrink-0">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <p className="text-[10px] sm:text-xs text-slate-500">
              © {new Date().getFullYear()} Tracking Checker • Keine Daten werden gespeichert
            </p>
            <div className="flex items-center gap-4 text-[10px] sm:text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                Powered by Next.js
              </span>
            </div>
          </div>
        </div>
      </footer>
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
