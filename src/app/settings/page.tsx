import type { Metadata } from 'next';
import { AppShell, Icon } from '@/components/app-shell';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ReactNode } from 'react';
import { StartTourButtonClient } from '@/components/start-tour-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings | Reform',
  description:
    'Manage your account, view API usage, and configure Reform.',
};

function SettingsCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-panel rounded-[20px] p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-[18px] font-semibold tracking-[-0.02em] text-rf-on-surface">
            {title}
          </h4>
          <p className="mt-1 text-[13px] leading-[21px] text-rf-on-surface-variant">
            {description}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rf-border-white-faint bg-rf-input-hollow-bg text-rf-on-surface-variant">
          <Icon name={icon} className="text-[20px]" />
        </div>
      </div>
      {children}
    </div>
  );
}

export default async function SettingsPage() {
  // Load real data
  let user: { id: string; email: string; name: string | null; fullName: string | null; orgName: string | null; createdAt: Date } | null = null;
  let formCount = 0;
  let submissionCount = 0;
  let apiKeyCount = 0;
  let activeApiKeyCount = 0;

  try {
    user = await getCurrentUser();
    if (user) {
      // Scope ALL counts to the current user — each account's stats are
      // independent and invisible to other accounts.
      formCount = await db.form.count({ where: { ownerId: user.id } });
      // Count submissions only for forms owned by this user.
      submissionCount = await db.submission.count({
        where: { form: { ownerId: user.id } },
      });
      apiKeyCount = await db.apiKey.count({ where: { ownerId: user.id } });
      activeApiKeyCount = await db.apiKey.count({
        where: { ownerId: user.id, status: 'active' },
      });
    }
  } catch {
    // DB not available — show defaults
  }

  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'Guest';

  return (
    <AppShell activePath="/settings" brandSubtitle={`Signed in as ${displayName}`}>
      <div className="relative z-10 mx-auto w-full max-w-[1200px] space-y-8 px-4 pb-12 pt-20 min-[480px]:pt-8 sm:px-6">
        {/* Header */}
        <header data-tour="settings-header" className="space-y-2">
          <div className="flex items-center gap-2 text-rf-primary-container">
            <Icon name="settings" className="text-[15px]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Account & Configuration
            </span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-rf-on-surface sm:text-[36px]">
            Settings
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-rf-on-surface-variant">
            Manage your account, view usage stats, and configure Reform.
          </p>
        </header>

        {/* Account Profile */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-rf-primary">
            <Icon name="person" className="text-[18px]" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Account Profile
            </h3>
          </div>

          <SettingsCard
            title="Your Account"
            description="Your account information and registration details."
            icon="account_circle"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">
                  Email Address
                </label>
                <div className="rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg px-3 py-2.5 text-[13px] text-rf-on-surface">
                  {user?.email || 'Not logged in'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">
                  Full Name
                </label>
                <div className="rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg px-3 py-2.5 text-[13px] text-rf-on-surface">
                  {user?.fullName || user?.name || 'Not set'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">
                  Organization
                </label>
                <div className="rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg px-3 py-2.5 text-[13px] text-rf-on-surface">
                  {user?.orgName || 'Not set'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">
                  Member Since
                </label>
                <div className="rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg px-3 py-2.5 text-[13px] text-rf-on-surface">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Unknown'}
                </div>
              </div>
            </div>

            {!user && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <Icon name="info" className="text-[18px] text-amber-400" />
                <p className="text-[12px] text-amber-300">
                  You&apos;re not logged in.{' '}
                  <a href="/signin" className="font-semibold underline">
                    Sign in
                  </a>{' '}
                  or{' '}
                  <a href="/signup" className="font-semibold underline">
                    create an account
                  </a>{' '}
                  to save your forms and data.
                </p>
              </div>
            )}
          </SettingsCard>
        </section>

        {/* Usage Stats */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-rf-primary">
            <Icon name="analytics" className="text-[18px]" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Usage Statistics
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 text-rf-on-surface-variant">
                <Icon name="dynamic_form" className="text-[18px] text-rf-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Forms</span>
              </div>
              <div className="mt-1 text-[28px] font-bold text-rf-on-surface">{formCount}</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 text-rf-on-surface-variant">
                <Icon name="inbox" className="text-[18px] text-emerald-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Submissions</span>
              </div>
              <div className="mt-1 text-[28px] font-bold text-emerald-400">{submissionCount}</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 text-rf-on-surface-variant">
                <Icon name="vpn_key" className="text-[18px] text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">API Keys</span>
              </div>
              <div className="mt-1 text-[28px] font-bold text-amber-400">{apiKeyCount}</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 text-rf-on-surface-variant">
                <Icon name="check_circle" className="text-[18px] text-rf-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Active Keys</span>
              </div>
              <div className="mt-1 text-[28px] font-bold text-rf-primary">{activeApiKeyCount}</div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-rf-primary">
            <Icon name="link" className="text-[18px]" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Quick Links
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/forms/new"
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-rf-surface/50 p-4 transition-all hover:border-rf-primary/30 hover:bg-rf-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rf-primary/10 text-rf-primary">
                <Icon name="add_circle" className="text-[20px]" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-rf-on-surface">Create a Form</div>
                <div className="text-[12px] text-rf-on-surface-variant">Open the flowchart builder</div>
              </div>
              <Icon name="arrow_forward" className="ml-auto text-[16px] text-rf-on-surface-variant transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="/templates"
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-rf-surface/50 p-4 transition-all hover:border-rf-primary/30 hover:bg-rf-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rf-primary/10 text-rf-primary">
                <Icon name="auto_awesome" className="text-[20px]" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-rf-on-surface">Browse Templates</div>
                <div className="text-[12px] text-rf-on-surface-variant">Start from a pre-built form</div>
              </div>
              <Icon name="arrow_forward" className="ml-auto text-[16px] text-rf-on-surface-variant transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="/api-keys"
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-rf-surface/50 p-4 transition-all hover:border-rf-primary/30 hover:bg-rf-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rf-primary/10 text-rf-primary">
                <Icon name="api" className="text-[20px]" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-rf-on-surface">Manage API Keys</div>
                <div className="text-[12px] text-rf-on-surface-variant">Create or rotate keys</div>
              </div>
              <Icon name="arrow_forward" className="ml-auto text-[16px] text-rf-on-surface-variant transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="/submissions"
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-rf-surface/50 p-4 transition-all hover:border-rf-primary/30 hover:bg-rf-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rf-primary/10 text-rf-primary">
                <Icon name="inbox" className="text-[20px]" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-rf-on-surface">View Submissions</div>
                <div className="text-[12px] text-rf-on-surface-variant">Check form responses</div>
              </div>
              <Icon name="arrow_forward" className="ml-auto text-[16px] text-rf-on-surface-variant transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="/docs/api"
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-rf-surface/50 p-4 transition-all hover:border-rf-primary/30 hover:bg-rf-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rf-primary/10 text-rf-primary">
                <Icon name="menu_book" className="text-[20px]" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-rf-on-surface">API Documentation</div>
                <div className="text-[12px] text-rf-on-surface-variant">REST API reference</div>
              </div>
              <Icon name="arrow_forward" className="ml-auto text-[16px] text-rf-on-surface-variant transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="/dashboard"
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-rf-surface/50 p-4 transition-all hover:border-rf-primary/30 hover:bg-rf-surface"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rf-primary/10 text-rf-primary">
                <Icon name="dashboard" className="text-[20px]" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-rf-on-surface">Dashboard</div>
                <div className="text-[12px] text-rf-on-surface-variant">Overview and stats</div>
              </div>
              <Icon name="arrow_forward" className="ml-auto text-[16px] text-rf-on-surface-variant transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </section>

        {/* Walkthrough / Tour section */}
        <section data-tour="settings-walkthrough" className="glass-panel rounded-[20px] p-6">
          <div className="flex items-center gap-2 text-rf-primary">
            <Icon name="tour" className="text-[18px]" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Guided Walkthrough
            </h3>
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-[20px] border border-rf-primary/20 bg-rf-primary/5 p-6 md:flex-row md:items-center">
            <div>
              <h4 className="text-[18px] font-semibold text-rf-on-surface">
                Interactive Application Tour
              </h4>
              <p className="mt-2 max-w-2xl text-[14px] leading-[24px] text-rf-on-surface-variant">
                New to Reform? Take the guided tour to explore every section
                of the application — the dashboard, template library, flowchart
                builder, submissions, API keys, and settings.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-rf-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Icon name="steps" className="text-[14px] text-rf-primary" />
                  22 steps
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="timer" className="text-[14px] text-rf-primary" />
                  ~5 minutes
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="visibility" className="text-[14px] text-rf-primary" />
                  Covers all 6 sections
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <StartTourButtonClient />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: 'dashboard', title: 'Dashboard', desc: 'Overview, stats, and form library' },
              { icon: 'auto_awesome', title: 'Templates', desc: 'Pre-built forms and your published forms' },
              { icon: 'schema', title: 'Flowchart Builder', desc: 'Visual node editor for designing forms' },
              { icon: 'inbox', title: 'Submissions', desc: 'Real-time response tracking and search' },
              { icon: 'api', title: 'API Keys', desc: 'Create, rotate, and revoke programmatic access' },
              { icon: 'menu_book', title: 'API Docs', desc: 'Interactive REST API documentation' },
            ].map((topic) => (
              <div
                key={topic.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-rf-surface/50 p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rf-primary/10 text-rf-primary">
                  <Icon name={topic.icon} className="text-[18px]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-rf-on-surface">
                    {topic.title}
                  </div>
                  <div className="text-[11px] text-rf-on-surface-variant">
                    {topic.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security info */}
        <section className="glass-panel flex items-start gap-4 rounded-2xl border border-white/10 p-5 sm:p-6">
          <div className="rounded-xl bg-rf-primary/10 p-2.5 text-rf-primary">
            <Icon name="shield" className="text-[20px]" />
          </div>
          <div className="flex-1">
            <h4 className="text-[14px] font-bold text-rf-on-surface">
              Security & Privacy
            </h4>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-rf-on-surface-variant">
              Your password is hashed with SHA-256 and a per-user salt before storage.
              Session tokens are stored in httpOnly cookies and expire after 30 days.
              API keys are SHA-256 hashed at rest — the full key is only shown once at
              creation. Rotate or revoke keys anytime from the API Keys page.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
