import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AppShell, Icon } from '@/components/app-shell';
import { InsightsPanel } from '@/components/insights/insights-panel';

/**
 * /forms/[id]/insights
 *
 * Shows AI-generated insights for a form's submissions: key findings,
 * sentiment breakdown, topic clusters, standout quotes. Insights are
 * cached in Xano (form_insight table) and re-generated when the
 * submission count changes.
 */
export default async function FormInsightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return notFound();

  const form = await db.form.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!form) return notFound();

  return (
    <AppShell activePath="/templates" brandSubtitle="AI insights">
      <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Breadcrumb */}
          <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-rf-on-surface-variant">
            <Link href="/dashboard" className="transition-colors hover:text-rf-primary">
              Dashboard
            </Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <Link href="/submissions" className="transition-colors hover:text-rf-primary">
              Submissions
            </Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="font-semibold text-rf-on-surface">{form.name}</span>
          </div>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
              {form.name}
            </h1>
            {form.description && (
              <p className="mt-2 text-[15px] text-rf-on-surface-variant">
                {form.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-rf-on-surface-variant">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-medium uppercase tracking-wider">
                {form.status}
              </span>
              <span>Created {new Date(form.createdAt).toLocaleDateString()}</span>
            </div>
          </header>

          {/* Insights */}
          <InsightsPanel formId={form.id} formName={form.name} />
        </div>
      </div>
    </AppShell>
  );
}
