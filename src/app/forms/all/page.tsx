import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
import { AppShell, Icon } from '@/components/app-shell';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { FormsTable } from '@/components/forms-table';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Forms | Reform',
  description: 'Manage all your forms, track status, and control subscriptions.',
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/* -------------------------------------------------------------------------- */
/*  Subscription plans                                                          */
/* -------------------------------------------------------------------------- */

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    features: ['5 forms', '100 submissions/mo', '3 AI features', 'Basic analytics', 'Email support'],
    cta: 'Current Plan',
    current: true,
    color: 'zinc',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    features: ['Unlimited forms', '10k submissions/mo', 'All 10 AI features', 'Smart routing', 'Priority support', 'Custom branding'],
    cta: 'Upgrade to Pro',
    current: false,
    color: 'amber',
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/mo',
    features: ['Everything in Pro', 'Unlimited submissions', 'Whitelabel', 'SSO & SAML', 'SLA guarantee', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact Sales',
    current: false,
    color: 'primary',
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function FormsAllPage() {
  let allForms: Array<{
    id: string;
    shareId: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    submissionCount: number;
  }> = [];
  let displayName = 'Guest';
  let currentUserId: string | null = null;

  try {
    const user = await getCurrentUser();
    if (user) {
      currentUserId = user.id;
      displayName = user.fullName || user.name || user.email?.split('@')[0] || 'Guest';
    }
  } catch {
    // Not logged in
  }

  try {
    if (currentUserId) {
      const forms = await db.form.findMany({
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
        } as any,
      });

      allForms = forms.map((f: any) => ({
        id: f.id,
        shareId: f.shareId,
        name: f.name,
        description: f.description,
        status: f.status,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        submissionCount: f._count?.submissions ?? 0,
      }));
    }
  } catch (error) {
    console.error('[FormsAllPage] failed to load forms:', error);
  }

  const activeCount = allForms.filter((f) => f.status === 'published').length;
  const draftCount = allForms.filter((f) => f.status === 'draft').length;
  const archivedCount = allForms.filter((f) => f.status === 'archived').length;
  const totalSubmissions = allForms.reduce((sum, f) => sum + f.submissionCount, 0);

  // Serialize dates for the client component
  const serializedForms = allForms.map((f) => ({
    ...f,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));

  return (
    <AppShell activePath="/forms/all" brandSubtitle={`Signed in as ${displayName}`}>
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-20 min-[480px]:pt-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-rf-primary">
              <Icon name="dynamic_form" className="text-[15px]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                Form Management
              </span>
            </div>
            <h1 className="mt-1 text-[28px] font-bold tracking-tight text-rf-on-surface sm:text-[36px]">
              All Forms
            </h1>
            <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-rf-on-surface-variant">
              Manage, organize, and control all your forms in one place. Create new forms, edit existing ones, or update their status.
            </p>
          </div>
          <Link
            href="/forms/new"
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-[14px] font-semibold transition-transform hover:-translate-y-[1px] sm:w-auto"
          >
            <Icon name="add" className="text-[18px]" />
            New Form
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 text-rf-on-surface-variant">
              <Icon name="dynamic_form" className="text-[16px] text-rf-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Total</span>
            </div>
            <div className="mt-1 text-[24px] font-bold text-rf-on-surface">{allForms.length}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 text-rf-on-surface-variant">
              <Icon name="check_circle" className="text-[16px] text-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Active</span>
            </div>
            <div className="mt-1 text-[24px] font-bold text-emerald-400">{activeCount}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 text-rf-on-surface-variant">
              <Icon name="edit" className="text-[16px] text-amber-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Drafts</span>
            </div>
            <div className="mt-1 text-[24px] font-bold text-amber-400">{draftCount}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 text-rf-on-surface-variant">
              <Icon name="inbox" className="text-[16px] text-sky-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Submissions</span>
            </div>
            <div className="mt-1 text-[24px] font-bold text-sky-400">{formatCount(totalSubmissions)}</div>
          </div>
        </div>

        {/* Interactive forms table */}
        <FormsTable initialForms={serializedForms} />

        {/* ---------------------------------------------------------------- */}
        {/* Subscription Management Section                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-12">
          <div className="flex items-center gap-2 text-rf-primary mb-4">
            <Icon name="workspace" className="text-[15px]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Subscription & Billing
            </span>
          </div>
          <h2 className="text-[24px] font-bold tracking-tight text-rf-on-surface sm:text-[28px]">
            Manage Your Plan
          </h2>
          <p className="mt-1 max-w-2xl text-[14px] text-rf-on-surface-variant">
            Choose the plan that fits your needs. Upgrade anytime as your team grows.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`glass-panel relative rounded-[20px] p-6 transition-all ${
                  plan.current ? 'border-amber-500/30 bg-amber-500/[0.03]' : 'hover:border-white/20'
                }`}
              >
                {plan.current && (
                  <div className="absolute -top-2.5 left-6 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                    Current Plan
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-[18px] font-bold text-rf-on-surface">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-[36px] font-bold tracking-tight text-rf-on-surface">{plan.price}</span>
                    <span className="text-[14px] text-rf-on-surface-variant">{plan.period}</span>
                  </div>
                </div>

                <ul className="mb-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[13px] text-rf-on-surface-variant">
                      <Icon name="check" className={`mt-0.5 text-[14px] shrink-0 ${
                        plan.color === 'amber' ? 'text-amber-400' :
                        plan.color === 'primary' ? 'text-rf-primary' : 'text-zinc-400'
                      }`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full rounded-lg py-2.5 text-[13px] font-semibold transition-all ${
                    plan.current
                      ? 'border border-white/10 bg-rf-surface text-rf-on-surface-variant cursor-default'
                      : plan.color === 'amber'
                        ? 'bg-amber-500 text-black hover:bg-amber-400'
                        : 'bg-rf-primary text-black hover:bg-rf-primary/80'
                  }`}
                  disabled={plan.current}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Usage bar */}
          <div className="mt-6 glass-panel rounded-[20px] p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-semibold text-rf-on-surface">Current Usage</h4>
              <span className="text-[11px] text-rf-on-surface-variant">Free Plan Limits</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[12px] text-rf-on-surface-variant mb-1">
                  <span>Forms</span>
                  <span>{allForms.length} / 5</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${allForms.length >= 5 ? 'bg-red-400' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min((allForms.length / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[12px] text-rf-on-surface-variant mb-1">
                  <span>Submissions this month</span>
                  <span>{totalSubmissions} / 100</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${totalSubmissions >= 100 ? 'bg-red-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((totalSubmissions / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[12px] text-rf-on-surface-variant mb-1">
                  <span>AI Features</span>
                  <span>3 / 3</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full w-full rounded-full bg-amber-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
