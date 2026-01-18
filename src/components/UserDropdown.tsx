'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Settings, 
  CreditCard, 
  FileText, 
  BarChart3, 
  LogOut, 
  ChevronDown,
  Mail,
  Bell
} from 'lucide-react';

export function UserDropdown() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Schließe Dropdown beim Klicken außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!session?.user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const menuItems = [
    {
      icon: <Settings className="w-4 h-4" />,
      label: 'Einstellungen',
      href: '/settings',
      section: 'account',
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      label: 'Rechnungsdaten',
      href: '/settings?section=billing',
      section: 'billing',
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: 'Rechnungen',
      href: '/settings?section=invoices',
      section: 'invoices',
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: 'Nutzungsdaten',
      href: '/settings?section=usage',
      section: 'usage',
    },
    {
      icon: <Mail className="w-4 h-4" />,
      label: 'Newsletter',
      href: '/settings?section=newsletter',
      section: 'newsletter',
    },
    {
      icon: <Bell className="w-4 h-4" />,
      label: 'Benachrichtigungen',
      href: '/settings?section=notifications',
      section: 'notifications',
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
        title="Account-Menü"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="h-5 w-5 rounded-full"
          />
        ) : (
          <User className="h-4 w-4 text-slate-400" />
        )}
        <span className="hidden md:inline text-xs text-slate-300 max-w-[120px] truncate">
          {session.user.name || session.user.email}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <p className="text-sm font-medium text-slate-200 truncate">
              {session.user.name || 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {session.user.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {menuItems.map((item) => (
              <button
                key={item.section}
                onClick={() => {
                  router.push(item.href);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <span className="text-slate-400">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Abmelden</span>
          </button>
        </div>
      )}
    </div>
  );
}
