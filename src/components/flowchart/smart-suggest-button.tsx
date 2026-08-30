'use client';

import { useState } from 'react';
import { Icon } from '@/components/app-shell';
import { useFlowchartStore } from '@/lib/flowchart/store';
import type { FieldType, FlowNodeData, ValidationRules } from '@/lib/flowchart/types';

interface SmartSuggestButtonProps {
  nodeId: string;
  currentLabel: string;
  currentFieldType?: FieldType;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

interface SuggestionResult {
  suggestions: {
    suggestedType?: FieldType;
    suggestedPlaceholder?: string;
    suggestedRequired?: boolean;
    suggestedHelperText?: string;
    suggestedOptions?: string[];
    suggestedValidation?: ValidationRules;
    suggestedNotes?: string;
  };
  audit_log_id: string;
  model: string;
  latency_ms: number;
}

/**
 * Smart field suggestion button — appears next to the label input in the
 * node inspector. When clicked, calls the Xano-orchestrated AI to suggest
 * a complete field configuration based on the current label.
 *
 * Architecture:
 *   1. POST /api/forms/ai/suggest-field { label, fieldType }
 *   2. Next.js invokes z-ai-web-dev-sdk with a structured system prompt
 *   3. Next.js calls Xano function 'ai/log_field_suggestion' which validates
 *      the response + logs to ai_generation_log
 *   4. UI displays the suggestion with an "Apply" button
 */
export function SmartSuggestButton({ nodeId, currentLabel, currentFieldType }: SmartSuggestButtonProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionResult | null>(null);
  const { updateNodeData } = useFlowchartStore();

  async function fetchSuggestion() {
    if (currentLabel.trim().length < 2 || status === 'loading') return;
    setStatus('loading');
    setError(null);
    setSuggestion(null);

    try {
      const resp = await fetch('/api/forms/ai/suggest-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: currentLabel.trim(),
          fieldType: currentFieldType ?? 'text',
        }),
      });
      if (!resp.ok) {
        const errorBody = await resp.json().catch(() => ({}));
        throw new Error(errorBody.error || errorBody.details || `HTTP ${resp.status}`);
      }
      const data: SuggestionResult = await resp.json();
      setSuggestion(data);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    const updates: Partial<FlowNodeData> = {};
    const s = suggestion.suggestions;
    if (s.suggestedType) updates.fieldType = s.suggestedType;
    if (s.suggestedPlaceholder !== undefined) updates.placeholder = s.suggestedPlaceholder;
    if (s.suggestedRequired !== undefined) updates.required = s.suggestedRequired;
    if (s.suggestedHelperText !== undefined) updates.helperText = s.suggestedHelperText;
    if (s.suggestedOptions) updates.options = s.suggestedOptions;
    if (s.suggestedValidation) updates.validation = s.suggestedValidation;
    updateNodeData(nodeId, updates);
    // Reset to idle so the panel can be re-used
    setStatus('idle');
    setSuggestion(null);
  }

  function dismiss() {
    setStatus('idle');
    setSuggestion(null);
    setError(null);
  }

  if (status === 'idle') {
    return (
      <button
        type="button"
        onClick={fetchSuggestion}
        disabled={currentLabel.trim().length < 2}
        className="flex items-center gap-1 rounded-md border border-rf-primary/30 bg-rf-primary/5 px-2 py-1 text-[10px] font-semibold text-rf-primary transition-all hover:bg-rf-primary/10 disabled:opacity-30"
        title="Let AI suggest configuration for this field"
      >
        <Icon name="auto_awesome" className="text-[12px]" />
        Suggest config
      </button>
    );
  }

  if (status === 'loading') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-rf-on-surface-variant">
        <Icon name="progress_activity" className="animate-spin text-[12px]" />
        Suggesting…
      </span>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/5 px-2 py-1.5 text-[10px] text-red-300">
        <div className="font-semibold">Suggestion failed</div>
        <div className="mt-0.5 text-[10px] text-red-300/80">{error}</div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-1 text-[10px] font-bold text-red-300 hover:underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Success — show the suggestion panel
  if (!suggestion) return null;
  const s = suggestion.suggestions;

  return (
    <div className="mt-2 rounded-lg border border-rf-primary/30 bg-rf-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-rf-primary">
          <Icon name="auto_awesome" className="text-[12px]" />
          AI suggestion
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-rf-on-surface-variant hover:text-rf-on-surface"
          aria-label="Dismiss"
        >
          <Icon name="close" className="text-[14px]" />
        </button>
      </div>

      <div className="space-y-1.5 text-[11px] text-rf-on-surface-variant">
        {s.suggestedType && s.suggestedType !== currentFieldType && (
          <div>
            <span className="font-semibold">Type:</span>{' '}
            <span className="rounded bg-rf-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-rf-primary">{s.suggestedType}</span>{' '}
            <span className="text-rf-on-surface-variant/60">(was {currentFieldType ?? 'text'})</span>
          </div>
        )}
        {s.suggestedPlaceholder && (
          <div>
            <span className="font-semibold">Placeholder:</span>{' '}
            <span className="text-rf-on-surface">{s.suggestedPlaceholder}</span>
          </div>
        )}
        {s.suggestedRequired !== undefined && (
          <div>
            <span className="font-semibold">Required:</span>{' '}
            <span className={s.suggestedRequired ? 'text-amber-300' : 'text-rf-on-surface-variant'}>
              {s.suggestedRequired ? 'yes' : 'no'}
            </span>
          </div>
        )}
        {s.suggestedHelperText && (
          <div>
            <span className="font-semibold">Helper:</span>{' '}
            <span className="text-rf-on-surface">{s.suggestedHelperText}</span>
          </div>
        )}
        {s.suggestedOptions && s.suggestedOptions.length > 0 && (
          <div>
            <span className="font-semibold">Options:</span>{' '}
            <span className="text-rf-on-surface">{s.suggestedOptions.length} suggestions</span>
          </div>
        )}
        {s.suggestedValidation && (
          <div>
            <span className="font-semibold">Validation:</span>{' '}
            <span className="text-rf-on-surface">
              {Object.entries(s.suggestedValidation)
                .map(([k]) => k)
                .join(', ')}
            </span>
          </div>
        )}
        {s.suggestedNotes && (
          <div className="border-t border-rf-border-white-faint pt-1.5 italic text-rf-on-surface-variant/80">
            {s.suggestedNotes}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={applySuggestion}
          className="rounded-md bg-rf-primary px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-rf-primary/90"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
        >
          Dismiss
        </button>
        <span className="ml-auto text-[9px] text-rf-on-surface-variant/60">
          {(suggestion.latency_ms / 1000).toFixed(1)}s · audit:{' '}
          <code className="rounded bg-black/20 px-1">{suggestion.audit_log_id.slice(0, 12)}…</code>
        </span>
      </div>
    </div>
  );
}
