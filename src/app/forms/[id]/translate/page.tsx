import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AppShell, Icon } from '@/components/app-shell';
import { TranslationPanel } from '@/components/translation/translation-panel';

export default async function FormTranslationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return notFound();

  const form = await db.form.findFirst({ where: { id, ownerId: user.id } });
  if (!form) return notFound();

  return (
    <AppShell activePath="/templates" brandSubtitle="AI translation">
      <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-rf-on-surface-variant">
            <Link href="/dashboard" className="transition-colors hover:text-rf-primary">
              Dashboard
            </Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="font-semibold text-rf-on-surface">{form.name}</span>
          </div>

          <header className="mb-8">
            <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
              Translations
            </h1>
            {form.description && (
              <p className="mt-2 text-[15px] text-rf-on-surface-variant">{form.description}</p>
            )}
          </header>

          <TranslationPanel formId={form.id} />
        </div>
      </div>
    </AppShell>
  );
}
