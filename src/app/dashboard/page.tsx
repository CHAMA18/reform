import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { AppShell, Icon } from '@/components/app-shell';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Dashboard | Reform',
  description:
    'Manage your forms, track submissions, and monitor performance from the Reform dashboard.',
};

/**
 * Format a relative time string (e.g. "2h ago", "just now", "3d ago").
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Format a large number with k/M suffixes.
 */
function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function StatCard({
  label,
  value,
  subtext,
  icon,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: string;
}) {
  return (
    <div className="glass-panel rounded-[20px] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rf-on-surface-variant">
            {label}
          </p>
          <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-rf-on-surface">
            {value}
          </h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rf-border-white-faint bg-rf-input-hollow-bg text-rf-primary">
          <Icon name={icon} className="text-[22px]" />
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-[21px] text-rf-on-surface-variant">
        {subtext}
      </p>
    </div>
  );
}

function FormCard({
  icon,
  title,
  status,
  description,
  submissions,
  updated,
  shareId,
}: {
  icon: string;
  title: string;
  status: 'Live' | 'Draft';
  description: string;
  submissions: number;
  updated: string;
  shareId: string;
}) {
  const statusClasses = status === 'Live' ? 'status-pill-live' : 'status-pill-draft';

  return (
    <Link
      href={`/f/${shareId}`}
      className="group glass-panel relative overflow-hidden rounded-[20px] p-5 transition-all duration-300 hover:border-white/20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-rf-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-rf-surface text-rf-on-surface">
            <Icon name={icon} className="text-[20px]" />
          </div>
          <span className={`${statusClasses} rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]`}>
            {status}
          </span>
        </div>
        <h4 className="mb-1 text-[18px] font-semibold tracking-[-0.02em] text-rf-on-surface">
          {title}
        </h4>
        <p className="mb-5 flex-1 text-[14px] leading-[24px] text-rf-on-surface-variant">
          {description || 'No description provided.'}
        </p>
        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3">
          <div className="flex items-center gap-1 text-rf-on-surface-variant">
            <Icon name="data_usage" className="text-[16px]" />
            <span className="text-[12px] font-mono">{formatCount(submissions)} sub</span>
          </div>
          <div className="text-[12px] font-mono text-rf-on-surface-variant/80">{updated}</div>
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  // Load real data from the database
  let activeFormsCount = 0;
  let totalSubmissions = 0;
  let formsWithCounts: Array<{
    id: string;
    shareId: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    submissionCount: number;
  }> = [];

  // Get the current logged-in user (real database auth) — used to
  // scope ALL data queries so each account only sees its own forms.
  let displayName = 'Engineer';
  let currentUserId: string | null = null;
  try {
    const user = await getCurrentUser();
    if (user) {
      currentUserId = user.id;
      displayName =
        user.fullName ||
        user.name ||
        user.email?.split('@')[0] ||
        'Engineer';
    }
  } catch {
    // Not logged in — use default
  }

  try {
    // Get all forms OWNED BY THE CURRENT USER with their submission counts.
    // If not signed in, return an empty list (the dashboard will show
    // the empty state instead of leaking other users' data).
    const forms = currentUserId
      ? await db.form.findMany({
          where: { ownerId: currentUserId },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            shareId: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { submissions: true } },
          },
        })
      : [];

    formsWithCounts = forms.map((f) => ({
      id: f.id,
      shareId: f.shareId,
      name: f.name,
      description: f.description,
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      submissionCount: f._count.submissions,
    }));

    activeFormsCount = forms.filter((f) => f.status === 'published').length;
    totalSubmissions = forms.reduce((sum, f) => sum + f._count.submissions, 0);
  } catch (error) {
    console.error('[DashboardPage] failed to load data:', error);
  }

  // Pick an icon for each form based on its name (simple heuristic)
  const iconForForm = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('kyc') || lower.includes('identity') || lower.includes('verification'))
      return 'how_to_reg';
    if (lower.includes('feedback') || lower.includes('survey') || lower.includes('nps'))
      return 'forum';
    if (lower.includes('event') || lower.includes('register') || lower.includes('registration'))
      return 'event';
    if (lower.includes('support') || lower.includes('ticket') || lower.includes('help'))
      return 'support_agent';
    if (lower.includes('job') || lower.includes('application') || lower.includes('career'))
      return 'work';
    if (lower.includes('contact') || lower.includes('email') || lower.includes('message'))
      return 'mail';
    if (lower.includes('legal') || lower.includes('disclosure') || lower.includes('compliance'))
      return 'gavel';
    if (lower.includes('enterprise') || lower.includes('request') || lower.includes('intake'))
      return 'assured_workload';
    return 'description';
  };

  return (
    <AppShell activePath="/dashboard" brandSubtitle={`Signed in as ${displayName}`}>
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 pt-20 min-[480px]:pt-8 sm:px-6">
        <div data-tour="dashboard-header" className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[30px] font-semibold tracking-[-0.03em] text-rf-on-surface sm:text-[34px] md:text-[48px] md:leading-[56px]">
              Dashboard
            </h2>
            <p className="mt-1 max-w-2xl text-[14px] leading-[24px] text-rf-on-surface-variant">
              Welcome back, <span className="font-semibold text-rf-on-surface">{displayName}</span>. Manage your forms, track submissions, and monitor performance.
            </p>
          </div>
          <Link
            href="/forms/new"
            data-tour="create-form-btn"
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-[16px] font-semibold transition-transform hover:-translate-y-[1px] sm:w-auto"
          >
            <Icon name="add" className="text-[20px]" />
            Create Form
          </Link>
        </div>

        <section data-tour="dashboard-stats" className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Forms"
            value={formatCount(formsWithCounts.length)}
            subtext={`${activeFormsCount} live, ${formsWithCounts.length - activeFormsCount} drafts.`}
            icon="dynamic_form"
          />
          <StatCard
            label="Total Submissions"
            value={formatCount(totalSubmissions)}
            subtext="Across all your forms. Real-time count."
            icon="trending_up"
          />
          <StatCard
            label="AI Features"
            value="10"
            subtext="Form generation, insights, routing, translation, voice, and more."
            icon="auto_awesome"
          />
          <StatCard
            label="Powered By"
            value="Xano"
            subtext="Backend, database, API, and audit trail all running on Xano."
            icon="database"
          />
        </section>

        <section data-tour="dashboard-form-library" className="glass-panel rounded-[24px] p-4 sm:p-5 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-rf-on-surface">
                Your Forms
              </h3>
              <p className="text-[12px] text-rf-on-surface-variant">
                {formsWithCounts.length} form{formsWithCounts.length !== 1 ? 's' : ''} in your workspace
              </p>
            </div>
            <Link
              href="/templates"
              className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-rf-primary transition-colors hover:text-rf-primary/80"
            >
              View All <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>

          {formsWithCounts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rf-primary/10 text-rf-primary">
                <Icon name="inbox" className="text-[28px]" />
              </div>
              <h4 className="mt-3 text-[15px] font-bold text-rf-on-surface">
                No forms yet
              </h4>
              <p className="mt-1 max-w-sm text-[12px] text-rf-on-surface-variant">
                Create your first form to see it appear here with live submission counts.
              </p>
              <Link
                href="/forms/new"
                className="btn-primary mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold"
              >
                <Icon name="add" className="text-[16px]" />
                Create Your First Form
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {formsWithCounts.slice(0, 6).map((form) => (
                <FormCard
                  key={form.id}
                  icon={iconForForm(form.name)}
                  title={form.name}
                  status={form.status === 'published' ? 'Live' : 'Draft'}
                  description={form.description ?? ''}
                  submissions={form.submissionCount}
                  updated={formatRelativeTime(form.updatedAt)}
                  shareId={form.shareId}
                />
              ))}
            </div>
          )}

          {formsWithCounts.length > 6 && (
            <div className="mt-4 text-center">
              <Link
                href="/templates"
                className="text-[12px] font-semibold text-rf-primary hover:underline"
              >
                View all {formsWithCounts.length} forms →
              </Link>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
