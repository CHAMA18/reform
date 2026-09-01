'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell, Icon } from '@/components/app-shell';
import { FlowchartBuilder } from '@/components/flowchart/flowchart-builder';
import { JsonPreviewPanel } from '@/components/flowchart/json-preview-panel';
import { PublishDialog } from '@/components/flowchart/publish-dialog';
import { useFlowchartStore } from '@/lib/flowchart/store';
import type { Flowchart } from '@/lib/flowchart/types';

/**
 * EditFormPage (/forms/[id]/edit)
 *
 * Loads an existing form from the database (GET /api/forms/[id]) and
 * populates the flowchart builder with its flowchart + name + description.
 * The user can then modify the form and click "Update Form" to save
 * changes via PATCH /api/forms/[id].
 *
 * If the form doesn't exist or doesn't belong to the current user, the
 * API returns 404 and we show a "not found" state.
 */
export default function EditFormPage() {
  const params = useParams<{ id: string }>();
  const formId = params.id;

  const [publishOpen, setPublishOpen] = useState(false);
  const [showJson, setShowJson] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');

  const { loadFlowchart, getErrors, reset } = useFlowchartStore();

  // Load the form from the API on mount.
  useEffect(() => {
    if (!formId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/forms/${formId}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to load form (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return; // 404 handled above
        setFormName(data.name ?? '');
        let fc: Flowchart;
        try {
          fc =
            typeof data.flowchart === 'string'
              ? JSON.parse(data.flowchart)
              : data.flowchart;
        } catch {
          fc = { nodes: [], edges: [] };
        }
        loadFlowchart(fc, data.name, data.description ?? '');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load form');
      })
      .finally(() => setLoading(false));

    // Cleanup: reset the builder when leaving the edit page.
    return () => {
      reset();
    };
  }, [formId, loadFlowchart, reset]);

  // Listen for edge-delete events (same as /forms/new)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      useFlowchartStore.getState().deleteEdge(detail);
    };
    window.addEventListener('flowedge-delete', handler);
    return () => window.removeEventListener('flowedge-delete', handler);
  }, []);

  const errors = getErrors();

  if (loading) {
    return (
      <AppShell activePath="/forms" brandSubtitle="Loading form…">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Icon name="progress_activity" className="animate-spin text-[32px] text-rf-primary" />
            <p className="text-[13px] text-rf-on-surface-variant">Loading form…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (notFound) {
    return (
      <AppShell activePath="/forms" brandSubtitle="Form not found">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="glass-panel max-w-md rounded-2xl border border-white/10 bg-rf-glass-bg p-8 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <Icon name="error" className="text-[32px]" />
            </div>
            <h2 className="mt-4 text-[20px] font-bold text-rf-on-surface">
              Form not found
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-rf-on-surface-variant">
              This form doesn&apos;t exist or you don&apos;t have permission to
              edit it. It may have been deleted, or it belongs to another
              account.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-rf-primary-container px-5 py-2.5 text-[13px] font-bold text-rf-on-primary-container transition-all hover:opacity-95"
            >
              <Icon name="dashboard" className="text-[16px]" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell activePath="/forms" brandSubtitle="Error">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="glass-panel max-w-md rounded-2xl border border-white/10 bg-rf-glass-bg p-8 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <Icon name="cloud_off" className="text-[32px]" />
            </div>
            <h2 className="mt-4 text-[20px] font-bold text-rf-on-surface">
              Failed to load form
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-rf-on-surface-variant">
              {error}
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-rf-primary-container px-5 py-2.5 text-[13px] font-bold text-rf-on-primary-container transition-all hover:opacity-95"
            >
              <Icon name="dashboard" className="text-[16px]" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activePath="/forms" brandSubtitle={`Editing: ${formName}`}>
      <div className="relative h-screen w-full overflow-hidden">
        {/* Toolbar */}
        <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-rf-surface/80 px-4 py-3 backdrop-blur-md min-[480px]:px-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] text-rf-on-surface-variant">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-rf-primary"
              >
                Dashboard
              </Link>
              <Icon name="chevron_right" className="text-[14px]" />
              <span className="font-semibold text-rf-on-surface">
                Edit Form
              </span>
            </div>
            <h1 className="text-[18px] font-bold tracking-tight text-rf-on-surface sm:text-[20px]">
              {formName || 'Editing Form'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJson((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[12px] font-semibold text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
            >
              <Icon name="data_object" className="text-[16px]" />
              <span className="hidden sm:inline">{showJson ? 'Hide' : 'Show'} JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold"
            >
              <Icon name="save" className="text-[16px]" />
              Update Form
            </button>
          </div>
        </div>

        {/* Validation indicator */}
        <div className="absolute left-0 right-0 top-[60px] z-20 flex items-center gap-3 px-4 py-1.5 text-[11px] min-[480px]:px-6">
          {errors.length === 0 ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Ready to save
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {errors.length} validation issue{errors.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Builder */}
        <div className="pt-[80px]">
          <FlowchartBuilder />
        </div>

        {showJson && (
          <div className="absolute bottom-4 right-4 z-20 w-[min(420px,90vw)]">
            <JsonPreviewPanel />
          </div>
        )}

        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          editFormId={formId}
        />
      </div>
    </AppShell>
  );
}
