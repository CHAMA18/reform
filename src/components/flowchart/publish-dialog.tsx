'use client';

import { useState } from 'react';
import { useFlowchartStore } from '@/lib/flowchart/store';

/**
 * PublishDialog
 *
 * Modal that handles publishing a flowchart to a shareable form.
 *
 * - When `editFormId` is NOT provided: calls POST /api/forms to create a
 *   brand-new form.
 * - When `editFormId` IS provided: calls PATCH /api/forms/[id] to update
 *   an existing form's flowchart + schema (used by the builder's edit mode).
 *
 * On success, displays the generated shareable link.
 */
export function PublishDialog({
  open,
  onClose,
  editFormId,
}: {
  open: boolean;
  onClose: () => void;
  /** If provided, the dialog updates this form instead of creating a new one. */
  editFormId?: string | null;
}) {
  const { flowchart, formName, formDescription, getErrors, reset } =
    useFlowchartStore();
  const [publishing, setPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const errors = getErrors();

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const isEditing = !!editFormId;
      const url = isEditing
        ? `/api/forms/${editFormId}`
        : '/api/forms';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          flowchart,
          // When editing, keep the form published so the share link
          // continues to work after the update.
          status: 'published',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to ${isEditing ? 'update' : 'publish'} (HTTP ${res.status})`);
      }
      const data = await res.json();
      const origin = window.location.origin;
      setShareUrl(`${origin}/f/${data.shareId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${editFormId ? 'update' : 'publish'} form`);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleClose = () => {
    if (shareUrl) {
      // After successful publish, reset the builder for a new form
      reset();
      setShareUrl(null);
    }
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-rf-surface-container shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-rf-primary">
              rocket_launch
            </span>
            <h2 className="text-[16px] font-bold text-rf-on-surface">
              {shareUrl
                ? editFormId
                  ? 'Form Updated'
                  : 'Form Published'
                : editFormId
                ? 'Update Form'
                : 'Publish Form'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-rf-on-surface-variant transition-colors hover:bg-white/5 hover:text-rf-on-surface"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {!shareUrl ? (
            <>
              <p className="text-[13px] leading-relaxed text-rf-on-surface-variant">
                You&apos;re about to publish{' '}
                <span className="font-semibold text-rf-on-surface">"{formName}"</span>.
                Once published, you&apos;ll get a shareable link that anyone can use
                to submit responses. Responses will appear in the Submissions tab.
              </p>

              {/* Summary */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-white/10 bg-rf-surface/50 p-3 text-center">
                  <div className="text-[20px] font-bold text-rf-primary">
                    {flowchart.nodes.filter((n) => n.type === 'field').length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-rf-on-surface-variant">
                    Fields
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-rf-surface/50 p-3 text-center">
                  <div className="text-[20px] font-bold text-amber-400">
                    {flowchart.nodes.filter((n) => n.type === 'condition').length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-rf-on-surface-variant">
                    Conditions
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-rf-surface/50 p-3 text-center">
                  <div className="text-[20px] font-bold text-emerald-400">
                    {flowchart.nodes.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-rf-on-surface-variant">
                    Total Nodes
                  </div>
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-red-400">
                    <span className="material-symbols-outlined text-[14px]">
                      error
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Cannot publish — fix these first
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[11px] text-red-300/80">
                    {errors.map((err, i) => (
                      <li key={i}>· {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[12px] text-red-400">
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <span className="material-symbols-outlined text-[36px]">
                    check_circle
                  </span>
                </div>
                <h3 className="mt-3 text-[18px] font-bold text-rf-on-surface">
                  Your form is live!
                </h3>
                <p className="mt-1 text-[12px] text-rf-on-surface-variant">
                  Share this link with anyone to collect responses.
                </p>
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Shareable Link
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2.5 font-mono text-[12px] text-rf-on-surface"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-bold transition-colors ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rf-primary text-white hover:bg-rf-primary/90'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-rf-surface/50 py-2.5 text-[12px] font-semibold text-rf-on-surface transition-colors hover:bg-rf-surface"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Open Form
              </a>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
          >
            {shareUrl ? 'New Form' : 'Cancel'}
          </button>
          {!shareUrl && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || errors.length > 0}
              className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {publishing ? 'progress_activity' : 'rocket_launch'}
              </span>
              {publishing ? 'Publishing…' : 'Publish & Generate Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
