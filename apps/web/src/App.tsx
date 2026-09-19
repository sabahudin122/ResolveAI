import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Cpu,
  Gauge,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { io } from 'socket.io-client';
import loginBackground from './assets/opspilot-login-cinematic.png';
import { api, apiUrl } from './lib/api';
import type {
  Category,
  DashboardAnalytics,
  Priority,
  RoleSlug,
  Ticket,
  TicketDraftSuggestion,
  TicketStatus,
  UserSession,
} from './types';

type View =
  | 'dashboard'
  | 'create'
  | 'tickets'
  | 'detail'
  | 'knowledge'
  | 'analytics'
  | 'admin'
  | 'audit'
  | 'profile';

const SESSION_KEY = 'opspilot.session';

const ticketExamples = [
  {
    label: 'Messy breach',
    categorySlug: 'security-incident',
    title: 'our sistem has been breeched',
    description:
      'i think our sistem has been breeched. unkown login happend last night and files was opened. plz check fast.',
  },
  {
    label: 'Breach',
    categorySlug: 'security-incident',
    title: 'Possible system breach reported by monitoring',
    description:
      'Our monitoring tool says a privileged account logged in from an unknown location and several files were accessed outside normal hours. Please investigate urgently.',
  },
  {
    label: 'API down',
    categorySlug: 'operational-request',
    title: 'api is not working',
    description:
      'The customer portal API is returning 500 errors and timeout messages. Several employees cannot load order data or complete the morning workflow.',
  },
  {
    label: 'VPN',
    categorySlug: 'network-access',
    title: 'Cannot connect to VPN after password change',
    description:
      'I changed my password this morning. Email works, but the company VPN keeps saying authentication failed and I cannot access internal applications.',
  },
  {
    label: 'Payroll',
    categorySlug: 'payroll-question',
    title: 'Payroll deduction looks incorrect',
    description:
      'My latest payslip includes a deduction I do not recognize. I need Finance to review it and confirm whether it can be corrected before the next payroll run.',
  },
  {
    label: 'HR',
    categorySlug: 'hr-policy',
    title: 'Benefits enrollment date question',
    description:
      'I missed the benefits enrollment reminder and need to know whether I can still update my coverage or submit a qualifying-life-event request.',
  },
  {
    label: 'Hardware',
    categorySlug: 'hardware-request',
    title: 'New hire laptop request for onboarding',
    description:
      'A new employee starts Monday and needs a laptop, dock, headset, and standard productivity access before the onboarding call.',
  },
  {
    label: 'Facilities',
    categorySlug: 'facilities-issue',
    title: 'Badge denied at side entrance',
    description:
      'My badge works at reception but not at the side entrance after 6 PM. I need after-hours access for this week.',
  },
  {
    label: 'Operations',
    categorySlug: 'operational-request',
    title: 'Workflow automation failed overnight',
    description:
      'The overnight operations workflow failed and several internal reports did not refresh this morning. We need a rerun or workaround.',
  },
  {
    label: 'Access',
    categorySlug: 'account-access',
    title: 'Need access to finance reporting folder',
    description:
      'My manager asked me to review quarter-end reporting, but the finance reporting folder says access denied.',
  },
] as const;

function loadStoredSession(): UserSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function canManage(role: RoleSlug) {
  return role === 'manager' || role === 'administrator';
}

function canSupport(role: RoleSlug) {
  return role === 'support_agent' || canManage(role);
}

function statusTone(status: TicketStatus) {
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return 'border-pine/25 bg-green-50 text-pine';
  }
  if (status === 'WAITING_FOR_EMPLOYEE' || status === 'REOPENED') {
    return 'border-marigold/25 bg-amber-50 text-marigold';
  }
  if (status === 'NEW') {
    return 'border-ocean/25 bg-blue-50 text-ocean';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function priorityTone(priority: Priority) {
  if (priority === 'CRITICAL') {
    return 'border-rosewood/25 bg-red-50 text-rosewood';
  }
  if (priority === 'HIGH') {
    return 'border-marigold/25 bg-amber-50 text-marigold';
  }
  if (priority === 'MEDIUM') {
    return 'border-ocean/25 bg-blue-50 text-ocean';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function StatusPill({ status }: { status: TicketStatus }) {
  return <span className={`status-pill ${statusTone(status)}`}>{status.replaceAll('_', ' ')}</span>;
}

function PriorityPill({ priority }: { priority: Priority }) {
  return <span className={`status-pill ${priorityTone(priority)}`}>{priority}</span>;
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = 'ocean',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'ocean' | 'green' | 'amber' | 'red' | 'violet';
}) {
  const tones = {
    ocean: 'bg-cyan-50 text-ocean',
    green: 'bg-emerald-50 text-pine',
    amber: 'bg-amber-50 text-marigold',
    red: 'bg-red-50 text-rosewood',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="dashboard-card panel p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon size={20} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function BarList({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: Array<{ name: string; value: number }>;
  compact?: boolean;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <section className="dashboard-card panel p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className={compact ? 'mt-4 space-y-2' : 'mt-4 space-y-3'}>
        {items.slice(0, 6).map((item) => (
          <div key={item.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{item.name.replaceAll('_', ' ')}</span>
              <span className="text-slate-500">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="chart-bar h-2 rounded-full bg-ocean"
                style={{ '--bar-width': `${Math.max(8, (item.value / max) * 100)}%` } as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Login({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const [email, setEmail] = useState('employee1@acme.test');
  const [password, setPassword] = useState('EmployeePass123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const demoAccounts = [
    { label: 'Employee', email: 'employee1@acme.test', password: 'EmployeePass123!' },
    { label: 'Agent', email: 'agent1@acme.test', password: 'AgentPass123!' },
    { label: 'Manager', email: 'manager@acme.test', password: 'ManagerPass123!' },
    { label: 'Admin', email: 'admin@acme.test', password: 'AdminPass123!' },
  ];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await api.login(email, password);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="login-cinema relative min-h-screen overflow-hidden bg-black text-white"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(2, 6, 15, 0.98) 0%, rgba(5, 13, 28, 0.88) 35%, rgba(6, 16, 32, 0.52) 72%, rgba(2, 6, 15, 0.92) 100%), url(${loginBackground})`,
      }}
    >
      <div className="login-scanline" aria-hidden />
      <div className="login-grid" aria-hidden />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_430px] lg:items-center lg:px-10">
        <section className="max-w-3xl py-10">
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
            <Sparkles size={16} aria-hidden />
            Live operations command
          </div>
          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-normal text-white sm:text-6xl lg:text-7xl">
            OpsPilot
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            Internal support, AI triage, knowledge search, SLA control, and approval workflows in one secure operations hub.
          </p>

          <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              { label: 'AI triage', value: 'ready', tone: 'text-cyan-200' },
              { label: 'SLA watch', value: 'active', tone: 'text-amber-200' },
              { label: 'Secure queue', value: 'online', tone: 'text-emerald-200' },
            ].map((item) => (
              <div
                key={item.label}
                className="login-signal rounded-lg border border-white/10 bg-black/35 p-4 backdrop-blur-md"
              >
                <p className="text-xs font-bold uppercase text-slate-400">{item.label}</p>
                <p className={`mt-2 text-lg font-bold ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <form
          onSubmit={submit}
          className="rounded-lg border border-white/15 bg-slate-950/78 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-cyan-200/30 bg-cyan-300/10 text-cyan-100">
              <ShieldCheck size={22} aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold">Secure sign in</h2>
              <p className="text-sm text-slate-400">OpsPilot workspace access</p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-md border border-red-400/30 bg-red-950/50 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <label className="mt-6 block text-sm font-semibold text-slate-200" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="mt-2 w-full rounded-md border border-white/15 bg-white/[0.08] px-3 py-3 text-white placeholder:text-slate-500"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />

          <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="mt-2 w-full rounded-md border border-white/15 bg-white/[0.08] px-3 py-3 text-white placeholder:text-slate-500"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            <Lock size={18} aria-hidden />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Demo access</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:border-cyan-200/40 hover:bg-cyan-300/10"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

function Sidebar({
  session,
  view,
  setView,
  onLogout,
}: {
  session: UserSession;
  view: View;
  setView: (view: View) => void;
  onLogout: () => void;
}) {
  const role = session.user.role;
  const items = [
    { view: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, show: true },
    { view: 'create' as const, label: 'Create ticket', icon: Plus, show: true },
    { view: 'tickets' as const, label: canSupport(role) ? 'All tickets' : 'My tickets', icon: ClipboardList, show: true },
    { view: 'knowledge' as const, label: 'Knowledge', icon: BookOpen, show: true },
    { view: 'analytics' as const, label: 'Analytics', icon: Gauge, show: canManage(role) },
    { view: 'admin' as const, label: 'Users and SLA', icon: Users, show: role === 'administrator' },
    { view: 'audit' as const, label: 'Audit logs', icon: ShieldCheck, show: role === 'administrator' },
    { view: 'profile' as const, label: 'Profile', icon: Settings, show: true },
  ].filter((item) => item.show);

  return (
    <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-4 lg:block">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold text-ink">
            <Activity className="text-ocean" size={26} aria-hidden />
            OpsPilot
          </div>
          <p className="mt-1 text-sm text-slate-500">{session.user.organizationName}</p>
        </div>
        <button className="icon-button lg:hidden" onClick={onLogout} title="Log out">
          <LogOut size={18} aria-hidden />
        </button>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto lg:block lg:space-y-1">
        {items.map(({ view: itemView, label, icon: Icon }) => (
          <button
            key={itemView}
            type="button"
            onClick={() => setView(itemView)}
            className={`inline-flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition lg:w-full ${
              view === itemView
                ? 'bg-ocean text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
            }`}
          >
            <Icon size={18} aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-8 hidden rounded-lg border border-slate-200 bg-mist p-4 lg:block">
        <p className="text-sm font-bold text-ink">{session.user.fullName}</p>
        <p className="mt-1 text-xs uppercase text-slate-500">{session.user.role.replaceAll('_', ' ')}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:text-ocean"
        >
          <LogOut size={16} aria-hidden />
          Log out
        </button>
      </div>
    </aside>
  );
}

function TicketList({
  tickets,
  selectedTicketId,
  onSelect,
  role,
}: {
  tickets: Ticket[];
  selectedTicketId: string | null;
  onSelect: (ticketId: string) => void;
  role: RoleSlug;
}) {
  const supportView = canSupport(role);
  const reporterCount = new Set(tickets.map((ticket) => ticket.reporter?.id).filter(Boolean)).size;
  const sectorCount = new Set(tickets.map((ticket) => ticket.department?.id).filter(Boolean)).size;

  if (!tickets.length) {
    return (
      <div className="panel p-8 text-center">
        <ClipboardList className="mx-auto text-slate-400" size={36} aria-hidden />
        <p className="mt-3 font-semibold text-ink">No tickets found</p>
        <p className="mt-1 text-sm text-slate-500">Create a request or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {supportView && (
        <div className="panel flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mist text-ocean">
              <ClipboardList size={20} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Organization queue</p>
              <p className="text-lg font-bold text-ink">{tickets.length} tickets</p>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-200" aria-hidden />
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Senders</p>
            <p className="text-sm font-semibold text-ink">{reporterCount} employees</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Sectors</p>
            <p className="text-sm font-semibold text-ink">{sectorCount} departments</p>
          </div>
        </div>
      )}
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          onClick={() => onSelect(ticket.id)}
          className={`panel w-full p-4 text-left transition hover:border-ocean ${
            selectedTicketId === ticket.id ? 'border-ocean' : ''
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">{ticket.number}</p>
              <h3 className="mt-1 font-bold text-ink">{ticket.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={ticket.status} />
              <PriorityPill priority={ticket.priority} />
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-slate-600">{ticket.description}</p>
          <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-5">
            {supportView && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <UserRound size={14} aria-hidden />
                <span className="truncate">Sent by: {ticket.reporter?.fullName ?? 'Unknown'}</span>
              </span>
            )}
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Building2 size={14} aria-hidden />
              <span className="truncate">Sector: {ticket.department?.name ?? 'Not assigned'}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Tags size={14} aria-hidden />
              <span className="truncate">Category: {ticket.category?.name ?? 'Uncategorized'}</span>
            </span>
            <span className="truncate">Owner: {ticket.assignedAgent?.fullName ?? 'Unassigned'}</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function CreateTicket({
  categories,
  onImprove,
  onCreate,
}: {
  categories: Category[];
  onImprove: (body: { title: string; description: string }) => Promise<TicketDraftSuggestion>;
  onCreate: (body: { title: string; description: string; categoryId?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState('I cannot connect to the company VPN after changing my password');
  const [description, setDescription] = useState(
    'I changed my password this morning. Email works, but the company VPN keeps saying authentication failed and I cannot access internal applications.',
  );
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [draftSuggestion, setDraftSuggestion] = useState<TicketDraftSuggestion | null>(null);
  const [draftError, setDraftError] = useState('');

  function applyExample(example: (typeof ticketExamples)[number]) {
    const category = categories.find((item) => item.slug === example.categorySlug);
    setTitle(example.title);
    setDescription(example.description);
    setCategoryId(category?.id ?? '');
    setDraftSuggestion(null);
    setDraftError('');
  }

  async function improveDraft() {
    setDraftError('');
    setImproving(true);
    try {
      const suggestion = await onImprove({ title, description });
      setTitle(suggestion.improvedTitle);
      setDescription(suggestion.improvedDescription);
      setCategoryId(suggestion.suggestedCategoryId ?? categoryId);
      setDraftSuggestion(suggestion);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'AI improvement failed');
    } finally {
      setImproving(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onCreate({
        title,
        description,
        ...(categoryId ? { categoryId } : {}),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="panel p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ocean text-white">
            <Plus size={20} aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Create ticket</h2>
            <p className="text-sm text-slate-500">AI triage will prepare recommendations for support review.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="ticket-title">
            Title
          </label>
          <button
            type="button"
            onClick={() => void improveDraft()}
            disabled={improving || !title.trim() || !description.trim()}
            className="inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-ocean transition hover:border-ocean hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={16} aria-hidden />
            {improving ? 'Improving...' : 'Improve with AI'}
          </button>
        </div>
        <input
          id="ticket-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3"
        />

        <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="ticket-category">
          Category
        </label>
        <select
          id="ticket-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3"
        >
          <option value="">Let support triage</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {draftError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-rosewood">
            {draftError}
          </div>
        )}

        {draftSuggestion && (
          <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">AI improved this draft</p>
                <p className="mt-1 text-xs text-slate-600">
                  {draftSuggestion.mock ? 'Mock AI' : 'OpenAI'} · {Math.round(draftSuggestion.confidence * 100)}% confidence
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="status-pill border-cyan-200 bg-white text-ocean">
                  {draftSuggestion.suggestedCategory}
                </span>
                <PriorityPill priority={draftSuggestion.suggestedPriority} />
              </div>
            </div>
            <ul className="mt-3 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
              {draftSuggestion.changes.map((change) => (
                <li key={change} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-pine" size={15} aria-hidden />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-700">Quick ticket examples</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ticketExamples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => applyExample(example)}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-ocean hover:bg-cyan-50 hover:text-ocean"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="ticket-description">
          Description
        </label>
        <textarea
          id="ticket-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={9}
          className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-3"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-ocean px-4 py-3 font-semibold text-white hover:bg-ink disabled:opacity-70"
        >
          <Send size={18} aria-hidden />
          {loading ? 'Creating...' : 'Create and triage'}
        </button>
      </form>

      <aside className="panel p-5">
        <Sparkles className="text-ocean" size={24} aria-hidden />
        <h3 className="mt-4 font-bold text-ink">AI guardrails</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p>AI can summarize, recommend a category, rank priority, find related tickets, and draft a response.</p>
          <p>It cannot close tickets, assign employees, change official priority, or send replies without approval.</p>
          <p>When no OpenAI key is configured, OpsPilot clearly uses the deterministic mock provider.</p>
        </div>
      </aside>
    </section>
  );
}

function TicketDetail({
  ticket,
  role,
  onComment,
  onStatus,
  onApproveAi,
}: {
  ticket: Ticket | null;
  role: RoleSlug;
  onComment: (body: string, visibility: 'PUBLIC' | 'INTERNAL') => Promise<void>;
  onStatus: (status: TicketStatus) => Promise<void>;
  onApproveAi: (suggestionId: string, body?: string) => Promise<void>;
}) {
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const latestAi = ticket?.aiSuggestions?.[0];

  useEffect(() => {
    setAiDraft(latestAi?.payload.suggestedResponse || latestAi?.recommendation || '');
  }, [latestAi?.id]);

  if (!ticket) {
    return (
      <div className="panel p-8 text-center">
        <MessageSquare className="mx-auto text-slate-400" size={36} aria-hidden />
        <p className="mt-3 font-semibold text-ink">Select a ticket</p>
      </div>
    );
  }

  const support = canSupport(role);

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-slate-500">{ticket.number}</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">{ticket.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={ticket.status} />
              <PriorityPill priority={ticket.priority} />
            </div>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-slate-700">{ticket.description}</p>
          <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <span>Reporter: {ticket.reporter?.fullName ?? 'Unknown'}</span>
            <span>Department: {ticket.department?.name ?? 'Not assigned'}</span>
            <span>SLA: {ticket.slaDeadlineAt ? new Date(ticket.slaDeadlineAt).toLocaleString() : 'Not set'}</span>
          </div>
        </div>

        <div className="panel p-6">
          <h3 className="font-bold text-ink">Conversation</h3>
          <div className="mt-4 space-y-4">
            {ticket.comments?.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{entry.author.fullName}</p>
                  <span className="text-xs text-slate-500">
                    {entry.visibility} - {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{entry.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-3"
              placeholder="Write a reply..."
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {support && (
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(event) => setInternal(event.target.checked)}
                  />
                  Internal note
                </label>
              )}
              <button
                type="button"
                onClick={async () => {
                  await onComment(comment, internal ? 'INTERNAL' : 'PUBLIC');
                  setComment('');
                  setInternal(false);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-ocean px-4 py-2 font-semibold text-white hover:bg-ink"
              >
                <Send size={16} aria-hidden />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <section className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-ink">AI assistant</h3>
            {latestAi?.mock && <span className="status-pill border-amber-200 bg-amber-50 text-marigold">Mock</span>}
          </div>
          {latestAi ? (
            <>
              <p className="mt-3 text-sm text-slate-600">{latestAi.reasoning}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Category:</strong> {latestAi.payload.category ?? 'Review needed'}
                </p>
                <p>
                  <strong>Priority:</strong> {latestAi.payload.priority ?? 'Review needed'}
                </p>
                <p>
                  <strong>Department:</strong> {latestAi.payload.department ?? 'Review needed'}
                </p>
              </div>
              <textarea
                value={aiDraft}
                onChange={(event) => setAiDraft(event.target.value)}
                rows={6}
                className="mt-4 w-full rounded-md border border-slate-300 px-3 py-3 text-sm"
              />
              {support && (
                <button
                  type="button"
                  onClick={() => void onApproveAi(latestAi.id, aiDraft)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                >
                  <CheckCircle2 size={16} aria-hidden />
                  Approve response
                </button>
              )}
              <div className="mt-5">
                <h4 className="text-sm font-bold text-ink">Sources</h4>
                <div className="mt-2 space-y-2">
                  {latestAi.references?.length ? (
                    latestAi.references.map((reference) => (
                      <div key={reference.knowledgeDocument.id} className="rounded-md bg-slate-50 p-3 text-sm">
                        <p className="font-semibold text-ink">{reference.knowledgeDocument.title}</p>
                        <p className="mt-1 text-slate-600">{reference.excerpt}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No knowledge sources attached.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No AI suggestion has been generated yet.</p>
          )}
        </section>

        <section className="panel p-5">
          <h3 className="font-bold text-ink">Related tickets</h3>
          <div className="mt-3 space-y-2">
            {ticket.relatedFrom?.length ? (
              ticket.relatedFrom.map((related) => (
                <div key={related.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-ink">{related.targetTicket.number}</p>
                  <p className="text-slate-600">{related.targetTicket.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Similarity {Math.round(Number(related.similarity) * 100)}%
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No related incidents yet.</p>
            )}
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="font-bold text-ink">Workflow</h3>
          <select
            value={ticket.status}
            onChange={(event) => void onStatus(event.target.value as TicketStatus)}
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_EMPLOYEE', 'RESOLVED', 'CLOSED', 'REOPENED'].map(
              (status) => (
                <option key={status} value={status}>
                  {status.replaceAll('_', ' ')}
                </option>
              ),
            )}
          </select>
          <div className="mt-4 space-y-3">
            {ticket.statusHistory?.map((entry) => (
              <div key={entry.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                <p className="font-semibold text-ink">{entry.newStatus.replaceAll('_', ' ')}</p>
                <p className="text-slate-500">
                  {entry.changedBy.fullName} - {new Date(entry.changedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}

function groupTickets(
  tickets: Ticket[],
  getName: (ticket: Ticket) => string,
): Array<{ name: string; value: number }> {
  const counts = new Map<string, number>();
  for (const ticket of tickets) {
    const name = getName(ticket);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((left, right) => right.value - left.value);
}

function DonutScore({ label, value }: { label: string; value: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <section className="dashboard-card panel p-5">
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}%</p>
          <p className="mt-1 text-sm text-slate-500">Target 90%+</p>
        </div>
        <svg viewBox="0 0 112 112" className="h-28 w-28 -rotate-90" aria-hidden>
          <circle cx="56" cy="56" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            className="ring-progress"
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="#164a6f"
            strokeLinecap="round"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
      </div>
    </section>
  );
}

function TrendChart({ items }: { items: Array<{ name: string; value: number }> }) {
  const chartItems = items.length ? items.slice(0, 6) : [{ name: 'No data', value: 1 }];
  const max = Math.max(1, ...chartItems.map((item) => item.value));
  const points = chartItems
    .map((item, index) => {
      const x = 18 + index * (264 / Math.max(1, chartItems.length - 1));
      const y = 104 - (item.value / max) * 72;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <section className="dashboard-card panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Recurring issues</h3>
          <p className="mt-1 text-sm text-slate-500">Top repeated themes</p>
        </div>
        <TrendingUp className="text-ocean" size={20} aria-hidden />
      </div>
      <svg viewBox="0 0 300 120" className="mt-4 h-36 w-full" role="img" aria-label="Recurring issue trend graph">
        <path d="M18 104 H286" stroke="#e2e8f0" strokeWidth="2" />
        <polyline className="trend-line" points={points} fill="none" stroke="#164a6f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {points.split(' ').map((point) => {
          const [x, y] = point.split(',');
          return <circle key={point} cx={x} cy={y} r="4" fill="#164a6f" />;
        })}
      </svg>
      <div className="mt-2 grid gap-2">
        {chartItems.slice(0, 3).map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-600">{item.name.replaceAll('_', ' ')}</span>
            <span className="font-bold text-ink">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmployeeDashboard({
  role,
  tickets,
  onCreate,
  onOpenTickets,
}: {
  role: RoleSlug;
  tickets: Ticket[];
  onCreate: () => void;
  onOpenTickets: () => void;
}) {
  const activeTickets = tickets.filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status));
  const waitingTickets = tickets.filter((ticket) => ticket.status === 'WAITING_FOR_EMPLOYEE' || ticket.status === 'REOPENED');
  const soonestTicket = activeTickets
    .filter((ticket) => ticket.slaDeadlineAt)
    .sort((left, right) => new Date(left.slaDeadlineAt!).getTime() - new Date(right.slaDeadlineAt!).getTime())[0];
  const title = canSupport(role) ? 'Support cockpit' : 'Employee cockpit';

  return (
    <section className="dashboard-shell space-y-6">
      <div className="dashboard-hero panel overflow-hidden p-6 text-white">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-cyan-100">{title}</p>
            <h2 className="mt-2 text-3xl font-bold">Tickets, AI triage, and SLA signals in one view.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              {canSupport(role)
                ? 'Review incoming work, watch urgent items, and jump straight into the queue.'
                : 'Create requests, follow progress, and see what needs your reply.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onCreate} className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950 hover:bg-white">
              Create ticket
            </button>
            <button type="button" onClick={onOpenTickets} className="rounded-md border border-white/20 px-4 py-2 font-bold text-white hover:bg-white/10">
              View tickets
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Active tickets" value={activeTickets.length} icon={ClipboardList} tone="ocean" />
        <Metric label="Need reply" value={waitingTickets.length} icon={MessageSquare} tone="amber" />
        <Metric
          label="Next SLA"
          value={soonestTicket?.slaDeadlineAt ? new Date(soonestTicket.slaDeadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Clear'}
          icon={Clock3}
          tone="green"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="dashboard-card panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Recent tickets</h3>
              <p className="mt-1 text-sm text-slate-500">{canSupport(role) ? 'Newest organization work' : 'Your latest requests'}</p>
            </div>
            <Sparkles className="text-ocean" size={20} aria-hidden />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {tickets.slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{ticket.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ticket.number} · {ticket.department?.name ?? 'No sector'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusPill status={ticket.status} />
                  <PriorityPill priority={ticket.priority} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <BarList title="By sector" items={groupTickets(tickets, (ticket) => ticket.department?.name ?? 'No sector')} compact />
      </div>
    </section>
  );
}

function AdminDashboard({
  analytics,
  tickets,
}: {
  analytics: DashboardAnalytics;
  tickets: Ticket[];
}) {
  const urgentTickets = tickets.filter(
    (ticket) => ['CRITICAL', 'HIGH'].includes(ticket.priority) && !['RESOLVED', 'CLOSED'].includes(ticket.status),
  );
  const sectorLoad = groupTickets(tickets, (ticket) => ticket.department?.name ?? 'No sector');

  return (
    <section className="dashboard-shell space-y-6">
      <div className="dashboard-hero panel overflow-hidden p-6 text-white">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-cyan-100">Admin command center</p>
            <h2 className="mt-2 text-3xl font-bold">Live overview of people, sectors, AI, and SLA risk.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              Track the full organization queue and see where work is building up across departments.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-bold uppercase text-cyan-100">Queue health</p>
              <p className="mt-2 text-2xl font-bold">{analytics.slaCompliancePercent}%</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-bold uppercase text-cyan-100">AI accepted</p>
              <p className="mt-2 text-2xl font-bold">{analytics.aiSuggestionAcceptanceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open tickets" value={analytics.openTickets} icon={ClipboardList} tone="ocean" />
        <Metric label="Unassigned" value={analytics.unassignedTickets} icon={Users} tone="violet" />
        <Metric label="At risk SLA" value={analytics.atRiskTickets} icon={Gauge} tone="amber" />
        <Metric label="Overdue" value={analytics.overdueTickets} icon={AlertTriangle} tone="red" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_340px]">
        <BarList title="Tickets by sector" items={sectorLoad} />
        <BarList title="Tickets by status" items={analytics.ticketsByStatus} />
        <DonutScore label="SLA compliance" value={analytics.slaCompliancePercent} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_360px]">
        <BarList title="Priority mix" items={analytics.ticketsByPriority} />
        <BarList title="Agent workload" items={analytics.agentWorkload} />
        <TrendChart items={analytics.recurringIssueTrends ?? analytics.ticketsByCategory} />
      </div>

      <section className="dashboard-card panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Urgent queue</h3>
            <p className="mt-1 text-sm text-slate-500">Critical and high-priority tickets still open</p>
          </div>
          <Cpu className="text-ocean" size={20} aria-hidden />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {urgentTickets.slice(0, 6).map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-slate-500">{ticket.number}</p>
                  <p className="mt-1 truncate font-bold text-ink">{ticket.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ticket.reporter?.fullName ?? 'Unknown'} · {ticket.department?.name ?? 'No sector'}
                  </p>
                </div>
                <PriorityPill priority={ticket.priority} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function Dashboard({
  analytics,
  role,
  tickets,
  onCreate,
  onOpenTickets,
}: {
  analytics: DashboardAnalytics | null;
  role: RoleSlug;
  tickets: Ticket[];
  onCreate: () => void;
  onOpenTickets: () => void;
}) {
  if (canManage(role) && analytics) {
    return <AdminDashboard analytics={analytics} tickets={tickets} />;
  }

  return <EmployeeDashboard role={role} tickets={tickets} onCreate={onCreate} onOpenTickets={onOpenTickets} />;
}

function Knowledge({ session }: { session: UserSession }) {
  const [query, setQuery] = useState('vpn password');
  const [results, setResults] = useState<Array<{ id: string; title: string; excerpt: string; score?: number }>>([]);

  useEffect(() => {
    void api.searchKnowledge(session.accessToken, query).then(setResults);
  }, []);

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Knowledge base</h2>
          <p className="text-sm text-slate-500">Search articles used by AI recommendations.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 rounded-md border border-slate-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={() => void api.searchKnowledge(session.accessToken, query).then(setResults)}
            className="icon-button"
            title="Search"
          >
            <Search size={18} aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {results.map((result) => (
          <article key={result.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold text-ink">{result.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{result.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminPanel({ session }: { session: UserSession }) {
  const [users, setUsers] = useState<
    Array<{
      id: string;
      fullName: string;
      email: string;
      title?: string | null;
      role: { name: string };
      department?: { id?: string; name: string } | null;
    }>
  >([]);
  const [audit, setAudit] = useState<Array<{ id: string; action: string; entityType: string; createdAt: string }>>([]);

  useEffect(() => {
    void api.users(session.accessToken).then(setUsers);
    void api.audit(session.accessToken).then(setAudit);
  }, [session.accessToken]);

  const departmentCounts = [...users.reduce((counts, user) => {
    const name = user.department?.name ?? 'No department';
    counts.set(name, (counts.get(name) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()].map(([name, value]) => ({ name, value }));

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="panel p-6">
        <h2 className="text-xl font-bold text-ink">User management</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {departmentCounts.map((item) => (
            <span key={item.name} className="status-pill border-slate-200 bg-slate-50 text-slate-600">
              {item.name}: {item.value}
            </span>
          ))}
        </div>
        <div className="mt-4 divide-y divide-slate-200">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-semibold text-ink">{user.fullName}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {user.title ?? 'No title'} · {user.department?.name ?? 'No department'}
                </p>
              </div>
              <span className="text-sm font-semibold text-ocean">{user.role.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel p-6">
        <h2 className="text-xl font-bold text-ink">Recent audit events</h2>
        <div className="mt-4 divide-y divide-slate-200">
          {audit.slice(0, 8).map((entry) => (
            <div key={entry.id} className="py-3 text-sm">
              <p className="font-semibold text-ink">{entry.action.replaceAll('_', ' ')}</p>
              <p className="text-slate-500">
                {entry.entityType} - {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [session, setSession] = useState<UserSession | null>(() => loadStoredSession());
  const [view, setView] = useState<View>('dashboard');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [error, setError] = useState('');

  const role = session?.user.role;

  const headerTitle = useMemo(() => {
    const labels: Record<View, string> = {
      dashboard: 'Operations dashboard',
      create: 'Create support ticket',
      tickets: role && canSupport(role) ? 'All tickets' : 'My tickets',
      detail: 'Ticket detail',
      knowledge: 'Knowledge base',
      analytics: 'Management analytics',
      admin: 'Administration',
      audit: 'Audit logs',
      profile: 'Profile and security',
    };
    return labels[view];
  }, [role, view]);

  async function reload() {
    if (!session) {
      return;
    }
    const [ticketPage, categoryPage] = await Promise.all([
      api.listTickets(session.accessToken),
      api.listCategories(session.accessToken),
    ]);
    setTickets(ticketPage.items);
    setCategories(categoryPage);
    if (canManage(session.user.role)) {
      setAnalytics(await api.analytics(session.accessToken));
    }
  }

  async function loadTicket(ticketId: string) {
    if (!session) {
      return;
    }
    setSelectedTicketId(ticketId);
    setSelectedTicket(await api.getTicket(session.accessToken, ticketId));
  }

  useEffect(() => {
    if (!session) {
      return;
    }
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Load failed'));

    const baseUrl = apiUrl.replace('/api/v1', '');
    const socket = io(baseUrl, {
      auth: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!selectedTicketId && tickets[0]) {
      void loadTicket(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  const activeSession = session;

  async function createNewTicket(body: { title: string; description: string; categoryId?: string }) {
    setError('');
    const ticket = await api.createTicket(activeSession.accessToken, body);
    await reload();
    await loadTicket(ticket.id);
    setView('detail');
  }

  async function logout() {
    try {
      await api.logout(activeSession.refreshToken);
    } finally {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[260px_1fr]">
      <Sidebar session={session} view={view} setView={setView} onLogout={() => void logout()} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-ocean">{session.user.role.replaceAll('_', ' ')}</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">{headerTitle}</h1>
          </div>
          <button className="icon-button" title="Notifications">
            <Bell size={18} aria-hidden />
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-rosewood">
            {error}
          </div>
        )}

        {view === 'dashboard' && (
          <Dashboard
            analytics={analytics}
            role={session.user.role}
            tickets={tickets}
            onCreate={() => setView('create')}
            onOpenTickets={() => setView('tickets')}
          />
        )}
        {view === 'create' && (
          <CreateTicket
            categories={categories}
            onImprove={(body) => api.improveTicketDraft(session.accessToken, body)}
            onCreate={createNewTicket}
          />
        )}
        {view === 'tickets' && (
          <TicketList
            tickets={tickets}
            selectedTicketId={selectedTicketId}
            role={session.user.role}
            onSelect={(ticketId) => {
              void loadTicket(ticketId);
              setView('detail');
            }}
          />
        )}
        {view === 'detail' && (
          <TicketDetail
            ticket={selectedTicket}
            role={session.user.role}
            onComment={async (body, visibility) => {
              if (!selectedTicket) {
                return;
              }
              await api.addComment(session.accessToken, selectedTicket.id, body, visibility);
              await loadTicket(selectedTicket.id);
            }}
            onStatus={async (status) => {
              if (!selectedTicket) {
                return;
              }
              await api.changeStatus(session.accessToken, selectedTicket.id, status, 'Updated from web dashboard');
              await loadTicket(selectedTicket.id);
              await reload();
            }}
            onApproveAi={async (suggestionId, body) => {
              if (!selectedTicket) {
                return;
              }
              await api.approveAiSuggestion(session.accessToken, selectedTicket.id, suggestionId, body);
              await loadTicket(selectedTicket.id);
            }}
          />
        )}
        {view === 'knowledge' && <Knowledge session={session} />}
        {view === 'analytics' && (
          <Dashboard
            analytics={analytics}
            role={session.user.role}
            tickets={tickets}
            onCreate={() => setView('create')}
            onOpenTickets={() => setView('tickets')}
          />
        )}
        {(view === 'admin' || view === 'audit') && <AdminPanel session={session} />}
        {view === 'profile' && (
          <section className="panel p-6">
            <h2 className="text-xl font-bold text-ink">Profile and security</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">Name</p>
                <p className="mt-1 font-bold text-ink">{session.user.fullName}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">Email</p>
                <p className="mt-1 font-bold text-ink">{session.user.email}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">Access token</p>
                <p className="mt-1 font-bold text-ink">Short-lived JWT</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">Refresh token</p>
                <p className="mt-1 font-bold text-ink">Rotating server-side token</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
