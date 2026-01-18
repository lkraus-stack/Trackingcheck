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
    // Wait for session to load
    if (status === 'loading') {
      return;
    }
    
    // If not authenticated, redirect to sign in
    if (!session) {
      router.push('/auth/signin?callbackUrl=/');
      return;
    }
    
    // If authenticated, show dashboard
    if (session) {
      setIsLoading(false);
    }
  }, [session, status, router]);

  // Show loading state while checking session
  if (status === 'loading' || isLoading || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-400">Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Dashboard onSelectUrl={() => {}} onClose={() => router.push('/')} />
    </div>
  );
}
