'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Settings as SettingsIcon, 
  User, 
  CreditCard, 
  FileText, 
  BarChart3, 
  Mail, 
  Bell,
  ChevronRight,
  Save,
  Loader2
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type SettingsSection = 'account' | 'billing' | 'invoices' | 'usage' | 'newsletter' | 'notifications';

interface NewsletterStatus {
  subscribed: boolean;
  status: string;
  tags: string[];
}

function SettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [newsletterStatus, setNewsletterStatus] = useState<NewsletterStatus | null>(null);
  const [isLoadingNewsletter, setIsLoadingNewsletter] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  useEffect(() => {
    // Prüfe ob User eingeloggt ist
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/settings');
      return;
    }

    // Setze aktive Section aus URL params
    const sectionParam = searchParams.get('section') as SettingsSection | null;
    if (sectionParam && ['account', 'billing', 'invoices', 'usage', 'newsletter', 'notifications'].includes(sectionParam)) {
      setActiveSection(sectionParam);
    }

    // Lade Newsletter-Status
    if (session?.user) {
      loadNewsletterStatus();
    }
  }, [status, session, searchParams, router]);

  const loadNewsletterStatus = async () => {
    setIsLoadingNewsletter(true);
    try {
      const response = await fetch('/api/newsletter/subscribe');
      if (response.ok) {
        const data = await response.json();
        setNewsletterStatus(data);
        setNewsletterSubscribed(data.subscribed || false);
      }
    } catch (error) {
      console.error('Error loading newsletter status:', error);
    } finally {
      setIsLoadingNewsletter(false);
    }
  };

  const handleNewsletterToggle = async () => {
    const newStatus = !newsletterSubscribed;
    setIsLoadingNewsletter(true);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribe: newStatus, tags: ['user'] }),
      });

      if (response.ok) {
        setNewsletterSubscribed(newStatus);
        toast.showSuccess(
          newStatus ? 'Newsletter abonniert' : 'Newsletter abbestellt'
        );
        await loadNewsletterStatus();
      } else {
        toast.showError('Newsletter-Einstellung konnte nicht gespeichert werden.');
      }
    } catch (error) {
      console.error('Error updating newsletter:', error);
      toast.showError('Newsletter-Einstellung konnte nicht gespeichert werden.');
    } finally {
      setIsLoadingNewsletter(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-400">Lade Einstellungen...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user) {
    return null; // Redirect wird durch useEffect gehandhabt
  }

  const sections = [
    { id: 'account' as SettingsSection, label: 'Account', icon: <User className="w-5 h-5" /> },
    { id: 'billing' as SettingsSection, label: 'Rechnungsdaten', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'invoices' as SettingsSection, label: 'Rechnungen', icon: <FileText className="w-5 h-5" /> },
    { id: 'usage' as SettingsSection, label: 'Nutzungsdaten', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'newsletter' as SettingsSection, label: 'Newsletter', icon: <Mail className="w-5 h-5" /> },
    { id: 'notifications' as SettingsSection, label: 'Benachrichtigungen', icon: <Bell className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-6 h-6 text-indigo-400" />
              <h1 className="text-xl font-bold text-slate-200">Einstellungen</h1>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
            >
              Zurück zur Startseite
            </button>
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    router.push(`/settings?section=${section.id}`, { scroll: false });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {section.icon}
                  <span>{section.label}</span>
                  {activeSection === section.id && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 sm:p-8">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-2">Account-Einstellungen</h2>
                    <p className="text-sm text-slate-400">Verwalte deine Account-Informationen</p>
                  </div>

                  <div className="space-y-4">
                    {/* User Info */}
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-4 mb-4">
                        {session.user.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            className="h-16 w-16 rounded-full border-2 border-indigo-500/30"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center">
                            <User className="w-8 h-8 text-indigo-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-200">
                            {session.user.name || 'User'}
                          </h3>
                          <p className="text-sm text-slate-400">{session.user.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                      <p className="text-sm text-slate-300">
                        Dein Account wird über Google OAuth verwaltet. Um deine E-Mail oder deinen Namen zu ändern, 
                        aktualisiere dein Google-Konto.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Section */}
              {activeSection === 'billing' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-2">Rechnungsdaten</h2>
                    <p className="text-sm text-slate-400">Verwalte deine Zahlungsinformationen</p>
                  </div>

                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 mb-2">Rechnungsdaten-Verwaltung</p>
                    <p className="text-sm text-slate-500">
                      Die Rechnungsdaten-Verwaltung wird in Kürze verfügbar sein.
                    </p>
                  </div>
                </div>
              )}

              {/* Invoices Section */}
              {activeSection === 'invoices' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-2">Rechnungen</h2>
                    <p className="text-sm text-slate-400">Übersicht deiner Rechnungen</p>
                  </div>

                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 mb-2">Keine Rechnungen vorhanden</p>
                    <p className="text-sm text-slate-500">
                      Deine Rechnungen werden hier angezeigt, sobald du ein Upgrade durchführst.
                    </p>
                  </div>
                </div>
              )}

              {/* Usage Section */}
              {activeSection === 'usage' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-2">Nutzungsdaten</h2>
                    <p className="text-sm text-slate-400">Übersicht deiner Nutzung und Limits</p>
                  </div>

                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <p className="text-sm text-slate-300 mb-2">
                      Als eingeloggter User hast du unbegrenzte Analysen.
                    </p>
                    <p className="text-xs text-slate-400">
                      Alle Features sind für dich verfügbar.
                    </p>
                  </div>
                </div>
              )}

              {/* Newsletter Section */}
              {activeSection === 'newsletter' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-2">Newsletter</h2>
                    <p className="text-sm text-slate-400">Verwalte deine Newsletter-Einstellungen</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-indigo-400" />
                          <div>
                            <h3 className="text-sm font-medium text-slate-200">Newsletter abonnieren</h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Erhalte Neuigkeiten, Updates und Tipps per E-Mail
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newsletterSubscribed}
                            onChange={handleNewsletterToggle}
                            disabled={isLoadingNewsletter}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </label>
                      </div>
                    </div>

                    {newsletterStatus && (
                      <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <p className="text-xs text-slate-400">
                          Status: <span className="text-slate-300">{newsletterStatus.status}</span>
                        </p>
                        {newsletterStatus.tags.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            Tags: <span className="text-slate-300">{newsletterStatus.tags.join(', ')}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-2">Benachrichtigungen</h2>
                    <p className="text-sm text-slate-400">Verwalte deine Benachrichtigungseinstellungen</p>
                  </div>

                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 mb-2">Benachrichtigungseinstellungen</p>
                    <p className="text-sm text-slate-500">
                      Die Benachrichtigungseinstellungen werden in Kürze verfügbar sein.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
