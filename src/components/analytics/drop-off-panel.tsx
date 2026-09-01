'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/app-shell';

interface FieldStat {
  fieldId: string;
  label: string;
  type: string;
  required: boolean;
  focusCount: number;
  blurCount: number;
  inputCount: number;
  submitCount: number;
  abandonCount: number;
  avgValueLength: number;
  avgTimeOnFieldMs: number;
  dropOffRate: number;
}

interface AISuggestion {
  fieldId: string;
  label: string;
  issue: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high';
}

interface DropOffPanelProps {
  formId: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function DropOffPanel({ formId }: DropOffPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldStat[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);

  const fetchAnalysis = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const resp = await fetch(`/api/forms/${formId}/drop-off-analysis`, { cache: 'no-store' });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setFields(data.fields ?? []);
      setSuggestions(data.aiSuggestions ?? []);
      setTotalEvents(data.totalEvents ?? 0);
      setLatencyMs(data.latency_ms ?? 0);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [formId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-8 text-center">
        <Icon name="progress_activity" className="mx-auto animate-spin text-[24px] text-rf-primary" />
        <p className="mt-2 text-[12px] text-rf-on-surface-variant">Analyzing field events…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-start gap-3">
          <Icon name="error" className="text-[20px] text-red-400" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-red-300">Analysis failed</div>
            <div className="mt-1 text-[11px] text-red-300/80">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (totalEvents === 0) {
    return (
      <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-8 text-center">
        <Icon name="analytics" className="mx-auto mb-3 text-[32px] text-rf-on-surface-variant/40" />
        <div className="text-[14px] font-semibold text-rf-on-surface">No field events yet</div>
        <p className="mt-1 text-[12px] text-rf-on-surface-variant">
          Visit the public form and start filling it out — Reform will record focus/blur/abandon events and analyze them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="analytics" className="text-[20px] text-rf-primary" />
            <h2 className="text-[18px] font-bold tracking-tight">Drop-off Analytics</h2>
          </div>
          <p className="mt-1 text-[12px] text-rf-on-surface-variant">
            {totalEvents} events recorded across {fields.length} fields · AI analysis ran in {(latencyMs / 1000).toFixed(1)}s
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAnalysis}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-1.5 text-[12px] font-semibold text-rf-on-surface-variant hover:text-rf-on-surface"
        >
          <Icon name="refresh" className="text-[14px]" />
          Refresh
        </button>
      </div>

      {/* AI suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-rf-primary/30 bg-rf-primary/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="lightbulb" className="text-[16px] text-rf-primary" />
            <span className="text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              AI suggestions ({suggestions.length})
            </span>
          </div>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-rf-surface-container/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-rf-on-surface">{s.label}</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        s.severity === 'high'
                          ? 'border-red-500/30 bg-red-500/10 text-red-300'
                          : s.severity === 'medium'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                          : 'border-white/10 bg-white/5 text-rf-on-surface-variant'
                      }`}>
                        {s.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-rf-on-surface-variant">{s.issue}</p>
                    <p className="mt-2 text-[12px] font-medium text-rf-primary">
                      💡 {s.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field stats table */}
      <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="table_rows" className="text-[16px] text-rf-primary" />
          <span className="text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
            Field-by-field stats
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-rf-border-white-faint text-[10px] uppercase tracking-wider text-rf-on-surface-variant">
                <th className="py-2 pr-3 font-semibold">Field</th>
                <th className="py-2 px-3 font-semibold">Type</th>
                <th className="py-2 px-3 font-semibold text-right">Focus</th>
                <th className="py-2 px-3 font-semibold text-right">Abandon</th>
                <th className="py-2 px-3 font-semibold text-right">Drop-off</th>
                <th className="py-2 px-3 font-semibold text-right">Avg time</th>
                <th className="py-2 pl-3 font-semibold text-right">Avg length</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.fieldId} className="border-b border-white/5">
                  <td className="py-2 pr-3 font-medium text-rf-on-surface">
                    {f.label}
                    {f.required && <span className="ml-1 text-red-400">*</span>}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-rf-on-surface-variant">{f.type}</td>
                  <td className="py-2 px-3 text-right text-rf-on-surface">{f.focusCount}</td>
                  <td className="py-2 px-3 text-right text-rf-on-surface">{f.abandonCount}</td>
                  <td className={`py-2 px-3 text-right font-bold ${f.dropOffRate > 0.4 ? 'text-red-400' : f.dropOffRate > 0.2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(f.dropOffRate * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 px-3 text-right text-rf-on-surface-variant">
                    {f.avgTimeOnFieldMs > 0 ? `${(f.avgTimeOnFieldMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="py-2 pl-3 text-right text-rf-on-surface-variant">{f.avgValueLength}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How it works */}
      <details className="rounded-xl border border-rf-border-white-faint bg-rf-surface-container/30 p-4">
        <summary className="cursor-pointer list-none text-[12px] font-semibold text-rf-on-surface">
          <div className="flex items-center gap-2">
            <Icon name="hub" className="text-[14px] text-rf-primary" />
            How drop-off analytics works
          </div>
        </summary>
        <p className="mt-3 text-[11px] leading-relaxed text-rf-on-surface-variant">
          When a respondent interacts with the public form, Reform&apos;s client-side tracker records focus/blur/input/abandon events and POSTs them to <code className="rounded bg-white/5 px-1.5 py-0.5">/api/forms/[id]/field-events</code>, which writes them to Xano&apos;s <code className="rounded bg-white/5 px-1.5 py-0.5">field_event</code> table. This endpoint aggregates those events per field and asks the LLM to identify drop-off points + suggest specific fixes (e.g. &quot;Field 3 has 40% drop-off; users typing &gt;30 chars. Consider splitting into two fields or making optional.&quot;). Each analysis is audit-logged via the Xano function <code className="rounded bg-white/5 px-1.5 py-0.5">ai/log_field_suggestion</code>.
        </p>
      </details>
    </div>
  );
}
