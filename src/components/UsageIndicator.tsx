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

  const { analyses, projects, plan } = usageData.usage;
  const analysesRemaining = analyses.limit > 0 ? analyses.limit - analyses.current : Infinity;
  const isNearLimit = analyses.percentage >= 80;
  const isAtLimit = analyses.percentage >= 100;

  return (
    <div className="flex items-center gap-3">
      {/* Analysen Usage */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer hover:bg-slate-800/70 ${
          isAtLimit
            ? 'bg-red-500/20 border border-red-500/30 text-red-400'
            : isNearLimit
              ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
              : 'bg-slate-800/50 border border-slate-700 text-slate-300'
        }`}
        onClick={() => router.push('/dashboard')}
        title={`${analyses.current}/${analyses.limit} Analysen verbraucht (${analysesRemaining} verbleibend)`}
      >
        {isAtLimit ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : isNearLimit ? (
          <TrendingUp className="h-3.5 w-3.5" />
        ) : (
          <BarChart3 className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">
          {analyses.limit > 0 ? `${analysesRemaining}/${analyses.limit}` : '∞'} Analysen
        </span>
        <span className="sm:hidden">
          {analyses.limit > 0 ? `${analysesRemaining}` : '∞'}
        </span>
      </div>

      {/* Plan Badge */}
      {plan !== 'enterprise' && (
        <button
          onClick={() => router.push('/dashboard')}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs rounded-lg hover:bg-indigo-600/30 transition-colors"
        >
          <span className="font-medium capitalize">{plan}</span>
        </button>
      )}
    </div>
  );
}
