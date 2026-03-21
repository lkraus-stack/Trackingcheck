'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent('/dashboard')}`);
    }
  }, [router, status]);

  if (status !== 'authenticated' || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-400">
            {status === 'loading' ? 'Lade Dashboard...' : 'Warte auf Anmeldung...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Dashboard 
      embedded={true}
      onSelectUrl={(url) => {
        router.push(`/?url=${encodeURIComponent(url)}`);
      }} 
      onClose={() => router.push('/')} 
    />
  );
}
