'use client';

import { useState, useMemo } from 'react';
import { Icon } from '@/components/app-shell';

interface Submission {
  id: string;
  formId: string;
  formName: string;
  data: Record<string, unknown>;
  source: string | null;
  status: string;
  timestamp: string;
}

interface FormWithCount {
  formId: string;
  formName: string;
  count: number;
}

/**
 * SubmissionsClient
 *
 * Client component that renders the submissions table with:
 *   - Search box (filter by form name, ID, or content)
 *   - Form-filter dropdown (show only submissions for a specific form)
 *   - "Submissions by Form" breakdown card (per-form counts)
 *   - Export PDF button (downloads a full report via /api/submissions/export)
 *   - Expandable detail rows showing the full response payload
 */
export function SubmissionsClient({
  initialSubmissions,
  formsWithCounts,
}: {
  initialSubmissions: Submission[];
  formsWithCounts: FormWithCount[];
}) {
  const [search, setSearch] = useState('');
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Apply both the form filter and the text search.
  const filtered = useMemo(() => {
    let result = initialSubmissions;
    if (selectedFormId) {
      result = result.filter((s) => s.formId === selectedFormId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.formName.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.source?.toLowerCase().includes(q) ||
          Object.values(s.data).some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return result;
  }, [initialSubmissions, selectedFormId, search]);

  /**
   * Trigger the PDF export. The endpoint is session-cookie authenticated,
   * so we can just navigate to it (or use a hidden anchor + click). We
   * pass the selectedFormId so the export respects the current filter.
   */
  const handleExportPdf = () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: 'pdf' });
      if (selectedFormId) params.set('formId', selectedFormId);
      // Use a hidden anchor so the browser treats it as a download
      // (Content-Disposition: attachment) instead of navigating away.
      const a = document.createElement('a');
      a.href = `/api/submissions/export?${params.toString()}`;
      a.download = ''; // hint to the browser that this is a download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      // Reset the exporting state after a short delay (the download
      // itself is non-blocking, so we can't detect completion — we
      // just prevent double-clicks for 2 seconds).
      setTimeout(() => setExporting(false), 2000);
    }
  };

  if (initialSubmissions.length === 0) {
    return (
      <section className="glass-panel rounded-[28px] border border-white/10 bg-rf-glass-bg p-8 backdrop-blur-xl sm:p-12">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rf-primary/10 text-rf-primary">
            <Icon name="inbox" className="text-[32px]" />
          </div>
          <h3 className="mt-4 text-[18px] font-bold text-rf-on-surface">
            No submissions yet
          </h3>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-rf-on-surface-variant">
            Publish a form from the Schema Architect and share the link. Once
            people start responding, their submissions will appear here in
            real time.
          </p>
          <a
            href="/forms/new"
            className="btn-primary mt-6 flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-bold"
          >
            <Icon name="add" className="text-[16px]" />
            Create a Form
          </a>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Submissions by Form breakdown --- */}
      {formsWithCounts.length > 0 && (
        <section className="glass-panel rounded-[28px] border border-white/10 bg-rf-glass-bg p-4 backdrop-blur-xl sm:p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-rf-on-surface">
                Submissions by Form
              </h3>
              <p className="mt-1 text-[13px] leading-[22px] text-rf-on-surface-variant">
                {formsWithCounts.length} {formsWithCounts.length === 1 ? 'form has' : 'forms have'} received submissions · click a form to filter the table below
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* "All Forms" card — clears the form filter */}
            <button
              type="button"
              onClick={() => setSelectedFormId('')}
              className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                selectedFormId === ''
                  ? 'border-rf-primary-container bg-rf-primary/10'
                  : 'border-white/10 bg-rf-input-hollow-bg hover:border-rf-primary-container/40 hover:bg-rf-surface-container-highest'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rf-primary/15 text-rf-primary">
                  <Icon name="apps" className="text-[20px]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-rf-on-surface">
                    All Forms
                  </div>
                  <div className="text-[11px] text-rf-on-surface-variant">
                    Show every submission
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[20px] font-bold text-rf-on-surface">
                  {initialSubmissions.length}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-rf-on-surface-variant">
                  total
                </div>
              </div>
            </button>

            {/* Per-form cards */}
            {formsWithCounts.map((f) => {
              const isActive = selectedFormId === f.formId;
              return (
                <button
                  key={f.formId}
                  type="button"
                  onClick={() => setSelectedFormId(isActive ? '' : f.formId)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                    isActive
                      ? 'border-rf-primary-container bg-rf-primary/10'
                      : 'border-white/10 bg-rf-input-hollow-bg hover:border-rf-primary-container/40 hover:bg-rf-surface-container-highest'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rf-secondary-container/40 text-rf-secondary">
                      <Icon name="description" className="text-[20px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-rf-on-surface" title={f.formName}>
                        {f.formName}
                      </div>
                      <div className="truncate font-mono text-[10px] text-rf-on-surface-variant">
                        {f.formId.slice(-12)}
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 text-right">
                    <div className="text-[20px] font-bold text-rf-on-surface">
                      {f.count}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-rf-on-surface-variant">
                      {f.count === 1 ? 'entry' : 'entries'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* --- Submission Index (table) --- */}
      <section data-tour="submissions-table" className="glass-panel rounded-[28px] border border-white/10 bg-rf-glass-bg p-4 backdrop-blur-xl sm:p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-rf-on-surface">
              Submission Index
            </h3>
            <p className="mt-1 text-[13px] leading-[22px] text-rf-on-surface-variant">
              {filtered.length} of {initialSubmissions.length} entries
              {selectedFormId && ' (filtered)'} · click a row to inspect
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Form filter dropdown */}
            <div className="relative">
              <Icon
                name="filter_list"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-rf-on-surface-variant"
              />
              <select
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="appearance-none rounded-full border border-white/10 bg-rf-input-hollow-bg py-2.5 pl-9 pr-8 text-[13px] text-rf-on-surface focus:border-rf-primary-container focus:outline-none"
              >
                <option value="">All forms</option>
                {formsWithCounts.map((f) => (
                  <option key={f.formId} value={f.formId}>
                    {f.formName} ({f.count})
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-rf-on-surface-variant"
              />
            </div>

            {/* Search box */}
            <div className="relative sm:w-72">
              <Icon
                name="search"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-rf-on-surface-variant"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by form, ID, or content…"
                className="input-glow w-full rounded-full border border-white/10 bg-rf-input-hollow-bg py-2.5 pl-11 pr-4 text-sm text-rf-on-surface placeholder:text-rf-on-surface-variant/50"
              />
            </div>

            {/* Export PDF button */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting || filtered.length === 0}
              className="flex items-center justify-center gap-2 rounded-full border border-rf-primary-container/30 bg-rf-primary/10 px-5 py-2.5 text-[12px] font-semibold text-rf-primary-container transition-all hover:bg-rf-primary/20 disabled:cursor-wait disabled:opacity-50"
              title="Export all (filtered) submissions as a PDF document"
            >
              <Icon
                name={exporting ? 'progress_activity' : 'picture_as_pdf'}
                className={`text-[16px] ${exporting ? 'animate-spin' : ''}`}
              />
              {exporting ? 'Generating…' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse">
              <thead className="bg-rf-surface-container-highest/60">
                <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.24em] text-rf-on-surface-variant">
                  <th className="px-5 py-4">Form</th>
                  <th className="px-5 py-4">Preview</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">Source</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => {
                  const isExpanded = expandedId === row.id;
                  const previewValues = Object.entries(row.data).slice(0, 2);
                  const date = new Date(row.timestamp);
                  const timeLabel = date.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <>
                      <tr
                        key={row.id}
                        className={`border-t border-white/10 text-[14px] text-rf-on-surface transition-colors hover:bg-white/[0.02] ${
                          index % 2 === 0 ? 'bg-rf-surface/25' : 'bg-transparent'
                        } ${isExpanded ? 'bg-rf-primary/5' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium">{row.formName}</div>
                          <div className="font-mono text-[11px] text-rf-on-surface-variant">
                            #{row.id.slice(0, 12)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[280px] space-y-0.5">
                            {previewValues.map(([key, val]) => (
                              <div
                                key={key}
                                className="truncate font-mono text-[11px] text-rf-on-surface-variant"
                              >
                                <span className="text-rf-on-surface-variant/60">
                                  {key}:
                                </span>{' '}
                                {String(val).slice(0, 40)}
                              </div>
                            ))}
                            {Object.keys(row.data).length > 2 && (
                              <div className="font-mono text-[10px] text-rf-on-surface-variant/50">
                                +{Object.keys(row.data).length - 2} more
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              row.status === 'Live'
                                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                                : row.status === 'Pending'
                                ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                                : 'border-rose-400/20 bg-rose-400/10 text-rose-300'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-rf-on-surface-variant">
                          {timeLabel}
                        </td>
                        <td className="px-5 py-4 font-mono text-[12px] text-rf-on-surface-variant">
                          {row.source ?? '—'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(isExpanded ? null : row.id)
                              }
                              className="flex items-center gap-1 rounded-full border border-white/10 bg-rf-input-hollow-bg px-3 py-1.5 text-[12px] font-medium text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
                            >
                              <Icon
                                name={isExpanded ? 'expand_less' : 'expand_more'}
                                className="text-[14px]"
                              />
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${row.id}-detail`} className="border-t border-white/5">
                          <td colSpan={6} className="bg-rf-surface-container-lowest px-5 py-5">
                            <div className="rounded-xl border border-white/10 bg-rf-surface/30 p-4">
                              <div className="mb-3 flex items-center gap-2">
                                <Icon
                                  name="data_object"
                                  className="text-[16px] text-rf-primary"
                                />
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                                  Full Response Payload
                                </span>
                              </div>
                              <pre className="overflow-x-auto rounded-lg bg-rf-surface-base p-3 font-mono text-[12px] leading-relaxed text-rf-on-surface">
                                <code>{JSON.stringify(row.data, null, 2)}</code>
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
