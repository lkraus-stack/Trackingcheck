/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  UserPlus,
  Users,
  Activity,
  Sparkles,
  BarChart3,
  Search,
  Shield,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { getPlanDefaults, PlanId } from '@/lib/auth/plans';

type RoleId = 'user' | 'admin';

interface AdminStats {
  totals: {
    users: number;
    activeUsers: number;
    inactiveUsers: number;
    analyses: number;
    aiRequests: number;
    apiCalls: number;
  };
  lastPeriod: {
    days: number;
    analyses: number;
    aiRequests: number;
    apiCalls: number;
  };
  plans: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  role: RoleId;
  createdAt: string;
  subscription?: {
    plan: PlanId;
    status: string;
  } | null;
  usageLimits?: {
    plan: PlanId;
    maxAnalysesPerMonth: number;
    maxProjects: number;
    maxAnalysesPerDay: number;
    aiAnalysisEnabled: boolean;
    aiChatEnabled: boolean;
    exportPdfEnabled: boolean;
    deepScanEnabled: boolean;
    apiAccessEnabled: boolean;
  } | null;
  usage: {
    analysesTotal: number;
    analysesLast30Days: number;
    aiRequestsTotal: number;
    aiRequestsLast30Days: number;
    apiCallsTotal: number;
    lastActiveAt: string | null;
    isActive: boolean;
    analysesCount: number;
    projectsCount: number;
  };
}

interface UserFormState {
  email?: string;
  name?: string;
  role: RoleId;
  plan: PlanId;
  status: string;
  maxAnalysesPerMonth: number;
  maxAnalysesPerDay: number;
  maxProjects: number;
  aiAnalysisEnabled: boolean;
  aiChatEnabled: boolean;
  exportPdfEnabled: boolean;
  deepScanEnabled: boolean;
  apiAccessEnabled: boolean;
}

const planBadge: Record<PlanId, string> = {
  free: 'bg-slate-700 text-slate-200',
  pro: 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30',
  enterprise: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30',
};

export function AdminDashboard() {
  const { data: session, status } = useSession();
  const toast = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanId | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<RoleId | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormState>(() => {
    const defaults = getPlanDefaults('free');
    return {
      email: '',
      name: '',
      role: 'user',
      plan: 'free',
      status: 'active',
      maxAnalysesPerMonth: defaults.maxAnalysesPerMonth,
      maxAnalysesPerDay: defaults.maxAnalysesPerDay,
      maxProjects: defaults.maxProjects,
      aiAnalysisEnabled: defaults.aiAnalysisEnabled,
      aiChatEnabled: defaults.aiChatEnabled,
      exportPdfEnabled: defaults.exportPdfEnabled,
      deepScanEnabled: defaults.deepScanEnabled,
      apiAccessEnabled: defaults.apiAccessEnabled,
    };
  });
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UserFormState | null>(null);

  const isAdmin = (session?.user as any)?.role === 'admin';

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!isAdmin) {
      setError('Kein Admin-Zugriff.');
      return;
    }

    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, planFilter, roleFilter, page]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!isAdmin) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Statistiken konnten nicht geladen werden.');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Admin-Statistiken.');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) params.set('search', search);
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error('User konnten nicht geladen werden.');
      }
      const data = await response.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der User.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    const defaults = getPlanDefaults('free');
    setCreateForm({
      email: '',
      name: '',
      role: 'user',
      plan: 'free',
      status: 'active',
      maxAnalysesPerMonth: defaults.maxAnalysesPerMonth,
      maxAnalysesPerDay: defaults.maxAnalysesPerDay,
      maxProjects: defaults.maxProjects,
      aiAnalysisEnabled: defaults.aiAnalysisEnabled,
      aiChatEnabled: defaults.aiChatEnabled,
      exportPdfEnabled: defaults.exportPdfEnabled,
      deepScanEnabled: defaults.deepScanEnabled,
      apiAccessEnabled: defaults.apiAccessEnabled,
    });
    setShowCreate(true);
  };

  const openEdit = (user: AdminUser) => {
    const plan = user.subscription?.plan || user.usageLimits?.plan || 'free';
    const defaults = getPlanDefaults(plan);
    setEditUser(user);
    setEditForm({
      role: user.role,
      plan,
      status: user.subscription?.status || 'active',
      maxAnalysesPerMonth: user.usageLimits?.maxAnalysesPerMonth ?? defaults.maxAnalysesPerMonth,
      maxAnalysesPerDay: user.usageLimits?.maxAnalysesPerDay ?? defaults.maxAnalysesPerDay,
      maxProjects: user.usageLimits?.maxProjects ?? defaults.maxProjects,
      aiAnalysisEnabled: user.usageLimits?.aiAnalysisEnabled ?? defaults.aiAnalysisEnabled,
      aiChatEnabled: user.usageLimits?.aiChatEnabled ?? defaults.aiChatEnabled,
      exportPdfEnabled: user.usageLimits?.exportPdfEnabled ?? defaults.exportPdfEnabled,
      deepScanEnabled: user.usageLimits?.deepScanEnabled ?? defaults.deepScanEnabled,
      apiAccessEnabled: user.usageLimits?.apiAccessEnabled ?? defaults.apiAccessEnabled,
    });
    setShowEdit(true);
  };

  const applyDefaultsToForm = (plan: PlanId, setter: (value: UserFormState) => void, current: UserFormState) => {
    const defaults = getPlanDefaults(plan);
    setter({
      ...current,
      plan,
      maxAnalysesPerMonth: defaults.maxAnalysesPerMonth,
      maxAnalysesPerDay: defaults.maxAnalysesPerDay,
      maxProjects: defaults.maxProjects,
      aiAnalysisEnabled: defaults.aiAnalysisEnabled,
      aiChatEnabled: defaults.aiChatEnabled,
      exportPdfEnabled: defaults.exportPdfEnabled,
      deepScanEnabled: defaults.deepScanEnabled,
      apiAccessEnabled: defaults.apiAccessEnabled,
    });
  };

  const handleCreate = async () => {
    if (!createForm.email) {
      toast.showWarning('E-Mail ist erforderlich.');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          name: createForm.name,
          role: createForm.role,
          plan: createForm.plan,
          subscription: { status: createForm.status },
          usageLimits: {
            plan: createForm.plan,
            maxAnalysesPerMonth: createForm.maxAnalysesPerMonth,
            maxAnalysesPerDay: createForm.maxAnalysesPerDay,
            maxProjects: createForm.maxProjects,
            aiAnalysisEnabled: createForm.aiAnalysisEnabled,
            aiChatEnabled: createForm.aiChatEnabled,
            exportPdfEnabled: createForm.exportPdfEnabled,
            deepScanEnabled: createForm.deepScanEnabled,
            apiAccessEnabled: createForm.apiAccessEnabled,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'User konnte nicht erstellt werden.');
      }

      toast.showSuccess('User erfolgreich erstellt.');
      setShowCreate(false);
      await fetchUsers();
      await fetchStats();
    } catch (err) {
      console.error(err);
      toast.showError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Users.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser || !editForm) return;

    try {
      const response = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editForm.role,
          subscription: {
            plan: editForm.plan,
            status: editForm.status,
          },
          usageLimits: {
            plan: editForm.plan,
            maxAnalysesPerMonth: editForm.maxAnalysesPerMonth,
            maxAnalysesPerDay: editForm.maxAnalysesPerDay,
            maxProjects: editForm.maxProjects,
            aiAnalysisEnabled: editForm.aiAnalysisEnabled,
            aiChatEnabled: editForm.aiChatEnabled,
            exportPdfEnabled: editForm.exportPdfEnabled,
            deepScanEnabled: editForm.deepScanEnabled,
            apiAccessEnabled: editForm.apiAccessEnabled,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'User konnte nicht aktualisiert werden.');
      }

      toast.showSuccess('User aktualisiert.');
      setShowEdit(false);
      setEditUser(null);
      setEditForm(null);
      await fetchUsers();
      await fetchStats();
    } catch (err) {
      console.error(err);
      toast.showError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Users.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Shield className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin Panel</p>
            <h1 className="text-2xl font-semibold text-slate-100">User & Usage Kontrolle</h1>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            User hinzufügen
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {statsLoading || !stats ? (
            <div className="col-span-full flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Statistiken werden geladen...
            </div>
          ) : (
            <>
              <StatCard
                title="Gesamt User"
                value={stats.totals.users}
                subtitle={`${stats.totals.activeUsers} aktiv`}
                icon={<Users className="h-4 w-4 text-indigo-400" />}
              />
              <StatCard
                title={`Aktive User (${stats.lastPeriod.days}T)`}
                value={stats.totals.activeUsers}
                subtitle={`${stats.totals.inactiveUsers} inaktiv`}
                icon={<Activity className="h-4 w-4 text-emerald-400" />}
              />
              <StatCard
                title="Analysen gesamt"
                value={stats.totals.analyses}
                subtitle={`${stats.lastPeriod.analyses} im Zeitraum`}
                icon={<BarChart3 className="h-4 w-4 text-cyan-400" />}
              />
              <StatCard
                title="KI-Requests"
                value={stats.totals.aiRequests}
                subtitle={`${stats.lastPeriod.aiRequests} im Zeitraum`}
                icon={<Sparkles className="h-4 w-4 text-purple-400" />}
              />
            </>
          )}
        </section>

        {stats && (
          <section className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500 uppercase tracking-[0.2em]">Plan-Verteilung</span>
            <PlanPill label="Free" value={stats.plans.free} />
            <PlanPill label="Pro" value={stats.plans.pro} accent="indigo" />
            <PlanPill label="Enterprise" value={stats.plans.enterprise} accent="emerald" />
          </section>
        )}

        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Suche nach Name oder E-Mail"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
            <select
              value={planFilter}
              onChange={(event) => {
                setPlanFilter(event.target.value as PlanId | 'all');
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
            >
              <option value="all">Alle Pläne</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleId | 'all');
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
            >
              <option value="all">Alle Rollen</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Rolle</th>
                  <th className="px-4 py-3 font-medium">Analysen (30T)</th>
                  <th className="px-4 py-3 font-medium">KI-Requests (30T)</th>
                  <th className="px-4 py-3 font-medium">Aktiv</th>
                  <th className="px-4 py-3 font-medium text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                      User werden geladen...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      Keine User gefunden.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const plan = user.subscription?.plan || user.usageLimits?.plan || 'free';
                    return (
                      <tr key={user.id} className="border-t border-slate-800">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300">
                              {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-slate-200 font-medium">{user.name || 'Unbekannt'}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${planBadge[plan]}`}>
                            {plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-300 capitalize">{user.role}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {user.usage.analysesLast30Days}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {user.usage.aiRequestsLast30Days}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              user.usage.isActive
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {user.usage.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openEdit(user)}
                            className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Bearbeiten
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Seite {page} von {totalPages} · {total} User
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-2 py-1 rounded border border-slate-800 disabled:opacity-50"
              >
                Zurück
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border border-slate-800 disabled:opacity-50"
              >
                Weiter
              </button>
            </div>
          </div>
        </section>
      </div>

      {showCreate && (
        <Modal title="User hinzufügen" onClose={() => setShowCreate(false)}>
          <FormFields form={createForm} setForm={setCreateForm} allowEmail autoDefaultsOnPlanChange />
          <div className="flex items-center justify-between">
            <button
              onClick={() => applyDefaultsToForm(createForm.plan, setCreateForm, createForm)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Plan-Defaults anwenden
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
            >
              Speichern
            </button>
          </div>
        </Modal>
      )}

      {showEdit && editForm && editUser && (
        <Modal title="User bearbeiten" onClose={() => setShowEdit(false)}>
          <div className="mb-4 text-xs text-slate-500">
            {editUser.email}
          </div>
          <FormFields form={editForm} setForm={setEditForm} />
          <div className="flex items-center justify-between">
            <button
              onClick={() => applyDefaultsToForm(editForm.plan, setEditForm, editForm)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Plan-Defaults anwenden
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
            >
              Änderungen speichern
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-slate-100">{value}</div>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function PlanPill({ label, value, accent }: { label: string; value: number; accent?: 'indigo' | 'emerald' }) {
  const color =
    accent === 'indigo'
      ? 'bg-indigo-500/15 text-indigo-300'
      : accent === 'emerald'
      ? 'bg-emerald-500/15 text-emerald-300'
      : 'bg-slate-800 text-slate-300';

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${color}`}>
      {label}
      <span className="text-xs text-slate-400">{value}</span>
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormFields({
  form,
  setForm,
  allowEmail = false,
  autoDefaultsOnPlanChange = false,
}: {
  form: UserFormState;
  setForm: (value: UserFormState) => void;
  allowEmail?: boolean;
  autoDefaultsOnPlanChange?: boolean;
}) {
  return (
    <div className="space-y-3">
      {allowEmail && (
        <div>
          <label className="text-xs text-slate-400">E-Mail</label>
          <input
            value={form.email || ''}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
          />
        </div>
      )}
      {allowEmail && (
        <div>
          <label className="text-xs text-slate-400">Name</label>
          <input
            value={form.name || ''}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400">Rolle</label>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as RoleId })}
            className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Plan</label>
          <select
            value={form.plan}
            onChange={(event) => {
              const nextPlan = event.target.value as PlanId;
              if (autoDefaultsOnPlanChange) {
                const defaults = getPlanDefaults(nextPlan);
                setForm({
                  ...form,
                  plan: nextPlan,
                  maxAnalysesPerMonth: defaults.maxAnalysesPerMonth,
                  maxAnalysesPerDay: defaults.maxAnalysesPerDay,
                  maxProjects: defaults.maxProjects,
                  aiAnalysisEnabled: defaults.aiAnalysisEnabled,
                  aiChatEnabled: defaults.aiChatEnabled,
                  exportPdfEnabled: defaults.exportPdfEnabled,
                  deepScanEnabled: defaults.deepScanEnabled,
                  apiAccessEnabled: defaults.apiAccessEnabled,
                });
              } else {
                setForm({ ...form, plan: nextPlan });
              }
            }}
            className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400">Status</label>
        <select
          value={form.status}
          onChange={(event) => setForm({ ...form, status: event.target.value })}
          className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
        >
          <option value="active">Aktiv</option>
          <option value="canceled">Gekündigt</option>
          <option value="expired">Abgelaufen</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-400">Analysen/Monat</label>
          <input
            type="number"
            value={form.maxAnalysesPerMonth}
            onChange={(event) => setForm({ ...form, maxAnalysesPerMonth: Number(event.target.value) })}
            className="mt-1 w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Analysen/Tag</label>
          <input
            type="number"
            value={form.maxAnalysesPerDay}
            onChange={(event) => setForm({ ...form, maxAnalysesPerDay: Number(event.target.value) })}
            className="mt-1 w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Projekte</label>
          <input
            type="number"
            value={form.maxProjects}
            onChange={(event) => setForm({ ...form, maxProjects: Number(event.target.value) })}
            className="mt-1 w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.aiAnalysisEnabled}
            onChange={(event) => setForm({ ...form, aiAnalysisEnabled: event.target.checked })}
          />
          KI-Analyse
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.aiChatEnabled}
            onChange={(event) => setForm({ ...form, aiChatEnabled: event.target.checked })}
          />
          KI-Chat
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.exportPdfEnabled}
            onChange={(event) => setForm({ ...form, exportPdfEnabled: event.target.checked })}
          />
          PDF Export
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.deepScanEnabled}
            onChange={(event) => setForm({ ...form, deepScanEnabled: event.target.checked })}
          />
          Deep Scan
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.apiAccessEnabled}
            onChange={(event) => setForm({ ...form, apiAccessEnabled: event.target.checked })}
          />
          API Access
        </label>
      </div>
    </div>
  );
}
