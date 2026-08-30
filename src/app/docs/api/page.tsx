import type { Metadata } from 'next';
import { AppShell, Icon } from '@/components/app-shell';
import { ApiDocsClient } from '@/components/api-docs-client';

export const metadata: Metadata = {
  title: 'API Documentation | Reform',
  description:
    'Complete REST API reference for Reform. Learn how to authenticate, create forms, and manage submissions programmatically.',
};

export default function ApiDocsPage() {
  return (
    <AppShell activePath="/api-keys" brandSubtitle="Developer docs">
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 pb-10 pt-20 min-[480px]:pt-8 sm:px-6">
        <header className="glass-panel rounded-[24px] border border-white/10 bg-rf-glass-bg p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-center gap-2 text-rf-primary-container">
            <Icon name="menu_book" className="text-[15px]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              REST API v1
            </span>
          </div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-rf-on-surface sm:text-[36px]">
            API Documentation
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-rf-on-surface-variant sm:text-[14px]">
            Reform exposes a REST API for creating forms, submitting
            responses, and retrieving submission data. All requests require an
            API key.
          </p>
        </header>

        <ApiDocsClient />
      </div>
    </AppShell>
  );
}
