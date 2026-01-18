'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';

interface UsageData {
  usage: {
    analyses: {
      current: number;
      limit: number;
      today: number;
      dailyLimit: number;
      percentage: number;
    };
    projects: {
      current: number;
      limit: number;
      percentage: number;
    };
  };
  plan: 'free' | 'pro' | 'enterprise';
  features: {
    aiAnalysis: boolean;
    aiChat: boolean;
    exportPdf: boolean;
    deepScan: boolean;
    apiAccess: boolean;
  };
}

export function UsageIndicator() {
  const { data: session } = useSession();
  const router = useRouter();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/user/usage');
        if (response.ok) {
          const data = await response.json();
          setUsageData(data);
        }
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsage();
  }, [session]);

  if (!session?.user || isLoading || !usageData) {
    return null;
  }

  const { analyses, projects } = usageData.usage;
  const { plan } = usageData;
  const analysesRemaining = analyses.limit > 0 ? analyses.limit - analyses.current : Infinity;
  const isNearLimit = analyses.percentage >= 80;
  const isAtLimit = analyses.percentage >= 100;

  // Progress Bar Farben
  const progressColor = isAtLimit 
    ? 'bg-red-500' 
    : isNearLimit 
      ? 'bg-yellow-500' 
      : 'bg-indigo-500';

  const progressBgColor = isAtLimit
    ? 'bg-red-500/20'
    : isNearLimit
      ? 'bg-yellow-500/20'
      : 'bg-indigo-500/20';

  return (
    <div className="flex items-center gap-3">
      {/* Analysen Usage mit Progress Bar */}
      <button
        onClick={() => router.push('/dashboard')}
        className={`group flex flex-col gap-1 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-slate-800/70 min-w-[120px] ${
          isAtLimit
            ? 'bg-red-500/10 border border-red-500/30'
            : isNearLimit
              ? 'bg-yellow-500/10 border border-yellow-500/30'
              : 'bg-slate-800/50 border border-slate-700'
        }`}
        title={`${analyses.current}/${analyses.limit} Analysen verbraucht (${analysesRemaining} verbleibend)`}
      >
        {/* Text und Icon */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {isAtLimit ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            ) : isNearLimit ? (
              <TrendingUp className="h-3.5 w-3.5 text-yellow-400" />
            ) : (
              <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
            )}
            <span className={`font-medium ${
              isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-slate-300'
            }`}>
              {analyses.limit > 0 ? `${analysesRemaining} verbleibend` : '∞ verfügbar'}
            </span>
          </div>
          {analyses.limit > 0 && (
            <span className={`text-[10px] ${
              isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-slate-400'
            }`}>
              {analyses.current}/{analyses.limit}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {analyses.limit > 0 && (
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${progressBgColor}`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${Math.min(analyses.percentage, 100)}%` }}
            />
          </div>
        )}
      </button>

      {/* Plan Badge */}
      {plan !== 'enterprise' && (
        <button
          onClick={() => router.push('/dashboard')}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs rounded-lg hover:bg-indigo-600/30 transition-colors font-medium capitalize"
        >
          {plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : plan}
        </button>
      )}
    </div>
  );
}
