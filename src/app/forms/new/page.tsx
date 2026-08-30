'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell, Icon } from '@/components/app-shell';
import { FlowchartBuilder } from '@/components/flowchart/flowchart-builder';
import { JsonPreviewPanel } from '@/components/flowchart/json-preview-panel';
import { PublishDialog } from '@/components/flowchart/publish-dialog';
import { useFlowchartStore } from '@/lib/flowchart/store';

/**
 * NewFormPage (Schema Architect)
 *
 * A world-class visual flowchart builder for creating dynamic forms.
 * Users drag nodes from the palette, connect them with edges to define
 * the form flow, and the JSON schema is generated in real time.
 * When ready, they click "Deploy Schema" to publish and get a shareable link.
 */
export default function NewFormPage() {
  const [publishOpen, setPublishOpen] = useState(false);
  const [showJson, setShowJson] = useState(true);
  const { getErrors } = useFlowchartStore();

  // Listen for edge-delete events dispatched by the SVG edge layer
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      useFlowchartStore.getState().deleteEdge(detail);
    };
    window.addEventListener('flowedge-delete', handler);
    return () => window.removeEventListener('flowedge-delete', handler);
  }, []);

  const errors = getErrors();

  return (
    <AppShell activePath="/templates" brandSubtitle="Schema architect">
      <div className="flex min-h-screen flex-col bg-rf-surface-base text-rf-on-surface">
        {/* Header */}
        <header data-tour="builder-header" className="sticky top-0 z-30 border-b border-rf-border-white-faint bg-rf-glass-bg px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[12px] text-rf-on-surface-variant">
                <Link
                  href="/templates"
                  className="transition-colors hover:text-rf-primary"
                >
                  Form Templates
                </Link>
                <Icon name="chevron_right" className="text-[14px]" />
                <span className="font-semibold text-rf-on-surface">Schema Architect</span>
              </div>
              <h1 className="text-[20px] font-bold tracking-tight text-rf-on-surface sm:text-[24px]">
                Flowchart Builder
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
                data-tour="builder-deploy"
                className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold"
              >
                <Icon name="rocket_launch" className="text-[16px]" />
                Deploy Schema
              </button>
            </div>
          </div>

          {/* Validation indicator */}
          <div className="mt-2 flex items-center gap-3 text-[11px]">
            {errors.length === 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Ready to deploy
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                {errors.length} validation issue{errors.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </header>

        {/* Main: Builder + optional JSON panel */}
        <div className="flex flex-1 flex-col overflow-hidden xl:flex-row">
          {/* Flowchart builder — takes most of the space */}
          <div className="flex-1 overflow-hidden" style={{ minHeight: '500px' }}>
            <FlowchartBuilder />
          </div>

          {/* JSON preview — toggleable, right side on XL, bottom on smaller */}
          {showJson && (
            <div data-tour="builder-json" className="h-[400px] w-full overflow-hidden border-t border-rf-border-white-faint xl:h-auto xl:w-[440px] xl:border-l xl:border-t-0">
              <JsonPreviewPanel />
            </div>
          )}
        </div>

        {/* Publish dialog */}
        <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} />
      </div>
    </AppShell>
  );
}
