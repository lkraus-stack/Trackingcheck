'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogIn, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { UserDropdown } from './UserDropdown';

export function AuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {/* Dashboard Button - prominent für eingeloggte User */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors font-medium"
          title="Zum Dashboard"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        
        {/* User Dropdown */}
        <UserDropdown />
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <LogIn className="h-3.5 w-3.5" />
      <span>Anmelden</span>
    </button>
  );
}
