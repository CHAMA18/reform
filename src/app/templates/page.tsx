import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
import { AppShell } from '@/components/app-shell';
import { TemplatesClient } from '@/components/templates-client';

export const metadata: Metadata = {
  title: 'Templates | Reform',
  description:
    'Browse pre-built form templates and your published forms. Use a template to start building instantly.',
};

export default function TemplatesPage() {
  return (
    <AppShell activePath="/templates" brandSubtitle="Template library">
      <div className="relative z-10 min-h-screen w-full px-4 pb-8 pt-20 min-[480px]:pt-8 sm:px-6">
        <div className="mx-auto w-full max-w-[1400px] space-y-6">
          <header data-tour="templates-header" className="space-y-2">
            <div className="flex items-center gap-2 text-rf-primary-container">
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                Template Library
              </span>
            </div>
            <h1 className="text-[30px] font-bold tracking-tight text-rf-on-surface sm:text-[40px]">
              Form Templates
            </h1>
            <p className="max-w-2xl text-[14px] leading-relaxed text-rf-on-surface-variant sm:text-[15px]">
              Start from a pre-built template or create a custom form. Every template
              is fully customizable in the visual flowchart builder.
            </p>
          </header>

          <TemplatesClient />
        </div>
      </div>
    </AppShell>
  );
}
