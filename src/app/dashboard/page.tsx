'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin?callbackUrl=/dashboard');
      return;
    }
    
    setIsLoading(false);
  }, [session, status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-400">Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will be redirected
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Dashboard onSelectUrl={() => {}} onClose={() => router.push('/')} />
    </div>
  );
}
