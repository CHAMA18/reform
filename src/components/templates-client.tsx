'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFlowchartStore } from '@/lib/flowchart/store';
import { STARTER_TEMPLATES, type StarterTemplate } from '@/lib/flowchart/starter-templates';
import { generateSchema } from '@/lib/flowchart/schema-generator';
import type { Flowchart, GeneratedSchema } from '@/lib/flowchart/types';

/**
 * TemplatesClient
 *
 * Interactive templates page. Shows:
 *   1. Starter templates (pre-built flowcharts) — click "Use Template" to
 *      load into the builder, or "Preview Schema" to see the JSON.
 *   2. Your published forms (loaded from the database) — click to view the
 *      shareable link or open the live form.
 *
 * Search filters both sections in real time.
 */

interface PublishedForm {
  id: string;
  shareId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  submissionCount: number;
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`.trim()} aria-hidden="true">
      {name}
    </span>
  );
}

export function TemplatesClient() {
  const router = useRouter();
  const { loadFlowchart } = useFlowchartStore();
  const [search, setSearch] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<StarterTemplate | null>(null);
  const [publishedForms, setPublishedForms] = useState<PublishedForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Load published forms from the API
  useEffect(() => {
    fetch('/api/forms')
      .then((res) => (res.ok ? res.json() : { forms: [] }))
      .then((data) => setPublishedForms(data.forms ?? []))
      .catch(() => setPublishedForms([]))
      .finally(() => setLoadingForms(false));
  }, []);

  const handleUseTemplate = (template: StarterTemplate) => {
    // Load the flowchart into the builder store, then navigate to the builder
    loadFlowchart(
      template.flowchart,
      template.name,
      template.description
    );
    router.push('/forms/new');
  };

  const handleCopyLink = async (shareId: string) => {
    try {
      const url = `${window.location.origin}/f/${shareId}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(shareId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // ignore
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /**
   * Delete a form via DELETE /api/forms/[id]. On success, removes it
   * from the local publishedForms list so the UI updates instantly
   * without a full page reload. Confirms with the user first.
   */
  const handleDeleteForm = async (form: PublishedForm) => {
    const confirmed = window.confirm(
      `Delete "${form.name}"?\n\nThis will permanently remove the form and all ${form.submissionCount} submission(s). This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(form.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/forms/${form.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to delete (HTTP ${res.status})`);
      }
      // Remove from local state
      setPublishedForms((prev) => prev.filter((f) => f.id !== form.id));
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete form');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return STARTER_TEMPLATES;
    const q = search.toLowerCase();
    return STARTER_TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [search]);

  const filteredForms = useMemo(() => {
    if (!search.trim()) return publishedForms;
    const q = search.toLowerCase();
    return publishedForms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q)
    );
  }, [publishedForms, search]);

  return (
    <div className="space-y-8">
      {/* Search bar */}
      <div className="glass-panel sticky top-0 z-30 flex h-14 items-center gap-3 rounded-xl border border-rf-border-white-faint bg-rf-glass-bg px-4 backdrop-blur-xl">
        <Icon name="search" className="text-[18px] text-rf-on-surface-variant" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates and your forms..."
          className="flex-1 bg-transparent text-[14px] text-rf-on-surface placeholder:text-rf-on-surface-variant/50 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        )}
      </div>

      {/* Starter templates */}
      <section data-tour="templates-grid" className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rf-primary-container">
            <Icon name="auto_awesome" className="text-[14px]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Starter Templates
            </span>
          </div>
          <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-rf-on-surface sm:text-[28px]">
            Pre-Built Forms
          </h2>
          <p className="max-w-2xl text-[13px] leading-relaxed text-rf-on-surface-variant">
            Click <strong>Use Template</strong> to load a pre-built flowchart into the
            builder, ready to customize and publish. Click <strong>Preview Schema</strong>{' '}
            to see the generated JSON.
          </p>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="glass-panel rounded-xl p-8 text-center text-[13px] text-rf-on-surface-variant">
            No templates match &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="glass-panel group flex flex-col rounded-xl p-5 transition-all duration-300 hover:border-white/20"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg border"
                    style={{
                      backgroundColor: `${template.accentColor}15`,
                      borderColor: `${template.accentColor}30`,
                      color: template.accentColor,
                    }}
                  >
                    <Icon name={template.icon} className="text-[24px]" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {template.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-rf-border-white-faint bg-rf-surface-container-highest px-1.5 py-0.5 text-[9px] text-rf-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <h3 className="mb-1.5 text-[17px] font-semibold tracking-[-0.02em] text-rf-on-surface">
                  {template.name}
                </h3>
                <p className="mb-4 flex-1 text-[13px] leading-[22px] text-rf-on-surface-variant">
                  {template.description}
                </p>

                <div className="mb-4 flex items-center gap-3 text-[11px] text-rf-on-surface-variant/70">
                  <span className="flex items-center gap-1">
                    <Icon name="schema" className="text-[14px]" />
                    {template.flowchart.nodes.filter((n) => n.type === 'field').length} fields
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="alt_route" className="text-[14px]" />
                    {template.flowchart.nodes.filter((n) => n.type === 'condition').length}{' '}
                    conditions
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(template)}
                    className="glow-button-primary flex-1 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                  >
                    Use Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1 rounded-lg border border-rf-border-white-faint bg-rf-surface-container-highest px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-rf-on-surface-variant transition-all hover:bg-rf-surface"
                  >
                    Preview
                  </button>
                </div>
              </div>
            ))}

            {/* Create new card */}
            <Link
              href="/forms/new"
              className="group flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-rf-border-white-faint p-6 text-center transition-all hover:border-rf-primary-container/40"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rf-surface-container text-rf-on-surface-variant transition-transform group-hover:scale-110">
                <Icon name="add" className="text-[32px]" />
              </div>
              <h3 className="mb-1 text-[18px] font-semibold text-rf-on-surface">
                Custom Implementation
              </h3>
              <p className="max-w-[200px] text-[13px] leading-[21px] text-rf-on-surface-variant">
                Build a form from scratch using the visual flowchart builder.
              </p>
            </Link>
          </div>
        )}
      </section>

      {/* Published forms */}
      <section data-tour="templates-published" className="space-y-4">
        {/* Delete error banner */}
        {deleteError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-300">
            <Icon name="error" className="mt-0.5 text-[16px] text-red-400" />
            <span>{deleteError}</span>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rf-primary-container">
            <Icon name="rocket_launch" className="text-[14px]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Your Published Forms
            </span>
          </div>
          <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-rf-on-surface sm:text-[28px]">
            Live Forms
          </h2>
          <p className="max-w-2xl text-[13px] leading-relaxed text-rf-on-surface-variant">
            Forms you&apos;ve published. Copy the share link or view submissions.
          </p>
        </div>

        {loadingForms ? (
          <div className="glass-panel rounded-xl p-8 text-center text-[13px] text-rf-on-surface-variant">
            Loading your forms…
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="glass-panel flex flex-col items-center rounded-xl p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rf-primary/10 text-rf-primary">
              <Icon name="rocket_launch" className="text-[24px]" />
            </div>
            <h3 className="mt-3 text-[15px] font-bold text-rf-on-surface">
              {search ? 'No forms match your search' : 'No published forms yet'}
            </h3>
            <p className="mt-1 max-w-sm text-[12px] text-rf-on-surface-variant">
              {search
                ? `Try a different search term.`
                : 'Use a starter template or build from scratch to create your first form.'}
            </p>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-rf-surface-container-low/50 text-[10px] uppercase tracking-widest text-rf-outline">
                  <tr>
                    <th className="border-b border-rf-border-white-faint px-5 py-3">Name</th>
                    <th className="border-b border-rf-border-white-faint px-5 py-3">Status</th>
                    <th className="border-b border-rf-border-white-faint px-5 py-3">Submissions</th>
                    <th className="border-b border-rf-border-white-faint px-5 py-3">Created</th>
                    <th className="border-b border-rf-border-white-faint px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rf-border-white-faint text-[13px] text-rf-on-surface-variant">
                  {filteredForms.map((form) => (
                    <tr key={form.id} className="transition-colors hover:bg-rf-surface-variant/10">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-rf-on-surface">{form.name}</div>
                        {form.description && (
                          <div className="truncate text-[11px] text-rf-on-surface-variant/60">
                            {form.description}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400">
                          {form.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px]">
                        {form.submissionCount}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] opacity-70">
                        {new Date(form.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/forms/${form.id}/edit`}
                            className="flex items-center gap-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-2.5 py-1.5 text-[11px] font-medium text-rf-on-surface-variant transition-colors hover:text-rf-primary"
                            title="Edit form in builder"
                          >
                            <Icon name="edit" className="text-[14px]" />
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(form.shareId)}
                            className="flex items-center gap-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-2.5 py-1.5 text-[11px] font-medium text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
                            title="Copy share link"
                          >
                            <Icon
                              name={copiedLink === form.shareId ? 'check' : 'link'}
                              className="text-[14px]"
                            />
                            {copiedLink === form.shareId ? 'Copied!' : 'Link'}
                          </button>
                          <a
                            href={`/f/${form.shareId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-2.5 py-1.5 text-[11px] font-medium text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
                            title="Open form"
                          >
                            <Icon name="open_in_new" className="text-[14px]" />
                            Open
                          </a>
                          <Link
                            href="/submissions"
                            className="flex items-center gap-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-2.5 py-1.5 text-[11px] font-medium text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
                            title="View submissions"
                          >
                            <Icon name="inbox" className="text-[14px]" />
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteForm(form)}
                            disabled={deletingId === form.id}
                            className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
                            title="Delete form and all its submissions"
                          >
                            <Icon
                              name={deletingId === form.id ? 'progress_activity' : 'delete'}
                              className={`text-[14px] ${deletingId === form.id ? 'animate-spin' : ''}`}
                            />
                            {deletingId === form.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Preview modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => {
            handleUseTemplate(previewTemplate);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Preview modal — shows the generated JSON schema for a template.
 */
function PreviewModal({
  template,
  onClose,
  onUse,
}: {
  template: StarterTemplate;
  onClose: () => void;
  onUse: () => void;
}) {
  const schema = generateSchema(template.flowchart, template.name);
  const jsonText = JSON.stringify(schema, null, 2);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-rf-surface-container shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${template.accentColor}15`,
                color: template.accentColor,
              }}
            >
              <Icon name={template.icon} className="text-[20px]" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-rf-on-surface">{template.name}</h2>
              <p className="text-[11px] text-rf-on-surface-variant">Generated Schema Preview</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-rf-on-surface-variant hover:bg-white/5 hover:text-rf-on-surface"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <p className="mb-3 text-[13px] leading-relaxed text-rf-on-surface-variant">
            {template.description}
          </p>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              JSON Schema
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
            >
              <Icon name={copied ? 'check' : 'content_copy'} className="text-[14px]" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-rf-surface-base p-3 font-mono text-[11px] leading-relaxed text-rf-on-surface">
            <code>{jsonText}</code>
          </pre>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-rf-on-surface-variant hover:text-rf-on-surface"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onUse}
            className="btn-primary rounded-lg px-5 py-2 text-[13px] font-bold"
          >
            Use This Template
          </button>
        </div>
      </div>
    </div>
  );
}
