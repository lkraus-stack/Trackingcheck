'use client';

import { AlertTriangle, TrendingUp, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UpgradePromptProps {
  type: 'limit-reached' | 'near-limit' | 'feature-unavailable';
  message: string;
  currentUsage?: number;
  limit?: number;
  plan?: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export function UpgradePrompt({
  type,
  message,
  currentUsage,
  limit,
  plan = 'free',
  onDismiss,
  showDismiss = true,
}: UpgradePromptProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  const isLimitReached = type === 'limit-reached';
  const isNearLimit = type === 'near-limit';

  return (
    <div
      className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
        isLimitReached
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : isNearLimit
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isLimitReached ? (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          ) : isNearLimit ? (
            <TrendingUp className="h-5 w-5 text-yellow-400" />
          ) : (
            <Sparkles className="h-5 w-5 text-indigo-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">
            {isLimitReached
              ? 'Limit erreicht'
              : isNearLimit
                ? 'Limit fast erreicht'
                : 'Feature nicht verfügbar'}
          </h3>
          <p className="text-sm opacity-90 mb-3">{message}</p>

          {currentUsage !== undefined && limit !== undefined && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="opacity-75">
                  {currentUsage} / {limit} Analysen
                </span>
                <span className="font-medium">
                  {Math.round((currentUsage / limit) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isLimitReached
                      ? 'bg-red-500'
                      : isNearLimit
                        ? 'bg-yellow-500'
                        : 'bg-indigo-500'
                  }`}
                  style={{
                    width: `${Math.min((currentUsage / limit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLimitReached
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : isNearLimit
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {plan === 'free' ? 'Jetzt upgraden →' : 'Zum Dashboard →'}
          </button>
        </div>

        {showDismiss && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors opacity-75 hover:opacity-100"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
