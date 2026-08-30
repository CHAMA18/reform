import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AppShell, Icon } from '@/components/app-shell';
import { SubmissionsClient } from '@/components/submissions-client';

export const metadata: Metadata = {
  title: 'Submissions | Reform',
  description:
    'Monitor form submission throughput, inspect live events, and export technical submission analytics.',
};

/**
 * SubmissionsPage
 *
 * Loads real submissions from the database and renders them via the
 * SubmissionsClient component (which handles filtering, expansion, and
 * the detail drawer).
 */
export default async function SubmissionsPage() {
  let submissions: Array<{
    id: string;
    formId: string;
    formName: string;
    data: Record<string, unknown>;
    source: string | null;
    status: string;
    timestamp: string;
  }> = [];

  // Per-form submission counts for the "Submissions by Form" breakdown
  // and the form-filter dropdown.
  let formsWithCounts: Array<{
    formId: string;
    formName: string;
    count: number;
  }> = [];

  let metrics = [
    {
      label: 'Total Submissions',
      value: '0',
      detail: 'Across all published forms.',
      icon: 'database',
      tone: 'text-rf-primary',
    },
    {
      label: 'Active Forms',
      value: '0',
      detail: 'Forms currently accepting responses.',
      icon: 'verified',
      tone: 'text-rf-secondary',
    },
    {
      label: 'Latest Activity',
      value: '—',
      detail: 'Most recent submission timestamp.',
      icon: 'speed',
      tone: 'text-rf-tertiary',
    },
  ];

  try {
    // Require authentication — submissions are scoped to the current user.
    // Only submissions belonging to the user's own forms are loaded.
    const currentUser = await getCurrentUser();

    const rows = currentUser
      ? await db.submission.findMany({
          where: { form: { ownerId: currentUser.id } },
          orderBy: { id: 'desc' },
          take: 100,
          include: {
            form: {
              select: { id: true, name: true, shareId: true },
            },
          },
        })
      : [];

    submissions = rows.map((s) => ({
      id: s.id.toISOString(),
      formId: s.formId,
      formName: s.form.name,
      data: JSON.parse(String(s.data)) as Record<string, unknown>,
      source: s.source,
      status: s.status,
      timestamp: s.id.toISOString(),
    }));

    // Build per-form submission counts by grouping the loaded rows.
    const countMap: Record<string, { formName: string; count: number }> = {};
    for (const s of submissions) {
      if (!countMap[s.formId]) {
        countMap[s.formId] = { formName: s.formName, count: 0 };
      }
      countMap[s.formId].count++;
    }
    formsWithCounts = Object.entries(countMap)
      .map(([formId, info]) => ({
        formId,
        formName: info.formName,
        count: info.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Count the current user's published forms (not all forms globally).
    const formCount = currentUser
      ? await db.form.count({
          where: { status: 'published', ownerId: currentUser.id },
        })
      : 0;

    const latest = submissions[0]?.timestamp;
    const latestLabel = latest
      ? new Date(latest).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '—';

    metrics = [
      {
        label: 'Total Submissions',
        value: submissions.length.toLocaleString(),
        detail: 'Across all published forms.',
        icon: 'database',
        tone: 'text-rf-primary',
      },
      {
        label: 'Active Forms',
        value: formCount.toLocaleString(),
        detail: 'Forms currently accepting responses.',
        icon: 'verified',
        tone: 'text-rf-secondary',
      },
      {
        label: 'Latest Activity',
        value: latestLabel,
        detail: 'Most recent submission timestamp.',
        icon: 'speed',
        tone: 'text-rf-tertiary',
      },
    ];
  } catch (error) {
    console.error('[SubmissionsPage] failed to load submissions:', error);
  }

  return (
    <AppShell activePath="/submissions" brandSubtitle="Real-time entry stream">
      <div className="relative min-h-screen w-full overflow-hidden px-4 pb-10 pt-20 min-[480px]:pt-8 sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[10%] top-[12%] h-56 w-56 rounded-full bg-rf-primary/10 blur-3xl" />
          <div className="absolute right-[8%] top-[22%] h-72 w-72 rounded-full bg-rf-secondary/10 blur-3xl" />
          <div className="absolute bottom-0 left-[28%] h-64 w-64 rounded-full bg-rf-tertiary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-[1520px] space-y-6">
          <header data-tour="submissions-header" className="glass-panel rounded-[28px] border border-white/10 bg-rf-glass-bg p-5 backdrop-blur-xl sm:p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-rf-primary-container">
                <Icon name="dns" className="text-[15px]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                  Live Operations
                </span>
              </div>
              <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-rf-on-surface sm:text-[36px] md:text-[48px] md:leading-[56px]">
                Data Submissions
              </h2>
              <p className="max-w-2xl text-[14px] leading-[24px] text-rf-on-surface-variant sm:text-[15px]">
                Real-time entry stream for every published form. Click a row to
                inspect the full response payload.
              </p>
            </div>
          </header>

          <section data-tour="submissions-metrics" className="grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="glass-panel rounded-[22px] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rf-on-surface-variant">
                      {metric.label}
                    </p>
                    <div className="mt-3 flex items-end gap-3">
                      <h3 className="text-[24px] font-semibold tracking-[-0.04em] text-rf-on-surface sm:text-[30px]">
                        {metric.value}
                      </h3>
                    </div>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-rf-surface-container-highest ${metric.tone}`}
                  >
                    <Icon name={metric.icon} className="text-[22px]" />
                  </div>
                </div>
                <p className="mt-3 max-w-sm text-[13px] leading-[22px] text-rf-on-surface-variant">
                  {metric.detail}
                </p>
              </div>
            ))}
          </section>

          <SubmissionsClient
            initialSubmissions={submissions}
            formsWithCounts={formsWithCounts}
          />
        </div>
      </div>
    </AppShell>
  );
}
