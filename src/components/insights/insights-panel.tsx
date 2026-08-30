'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/app-shell';

interface InsightSummary {
  bullets: string[];
  sentiment: { positive: number; neutral: number; negative: number };
  topics?: Array<{ topic: string; count: number; sentiment: string }>;
  standout_quotes?: string[];
}

interface Insight {
  id: string;
  form_id: string;
  submission_count: number;
  summary: InsightSummary;
  model: string;
  generated_at: string;
}

interface InsightsPanelProps {
  formId: string;
  formName: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function InsightsPanel({ formId, formName }: InsightsPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [insight, setInsight] = useState<Insight | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (force = false) => {
    setStatus('loading');
    setError(null);
    try {
      const url = `/api/forms/${formId}/insights${force ? '?force=1' : ''}`;
      const method = force ? 'POST' : 'GET';
      const resp = await fetch(url, { method, cache: 'no-store' });
      if (!resp.ok) {
        const errorBody = await resp.json().catch(() => ({}));
        throw new Error(errorBody.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setInsight(data.insight);
      setSubmissionCount(data.submission_count);
      setCached(data.cached);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [formId]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-8">
        <div className="flex items-center gap-3 text-rf-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin text-[20px] text-rf-primary" />
          <span className="text-[14px]">Analyzing submissions for &quot;{formName}&quot;…</span>
        </div>
        <p className="mt-2 text-[12px] text-rf-on-surface-variant/60">
          Reading all submissions, identifying themes, classifying sentiment…
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-start gap-3">
          <Icon name="error" className="text-[20px] text-red-400" />
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-red-300">Analysis failed</div>
            <div className="mt-1 text-[12px] text-red-300/80">{error}</div>
            <button
              type="button"
              onClick={() => fetchInsights(true)}
              className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-8 text-center">
        <Icon name="lightbulb" className="mx-auto mb-3 text-[32px] text-rf-on-surface-variant/40" />
        <div className="text-[14px] font-semibold text-rf-on-surface">No insights yet</div>
        <p className="mt-1 text-[12px] text-rf-on-surface-variant">
          This form has {submissionCount} submissions. Generate insights to see them summarised.
        </p>
        <button
          type="button"
          onClick={() => fetchInsights(true)}
          className="btn-primary mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold"
        >
          <Icon name="auto_awesome" className="text-[16px]" />
          Generate insights
        </button>
      </div>
    );
  }

  const { summary } = insight;
  const sentimentTotal = summary.sentiment.positive + summary.sentiment.neutral + summary.sentiment.negative;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="insights" className="text-[20px] text-rf-primary" />
            <h2 className="text-[18px] font-bold tracking-tight">AI Insights</h2>
            {cached && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                cached
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-rf-on-surface-variant">
            Based on {insight.submission_count} submissions · model: {insight.model} · generated {timeAgo(new Date(insight.generated_at))}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchInsights(true)}
          disabled={status === 'loading'}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-1.5 text-[12px] font-semibold text-rf-on-surface-variant transition-colors hover:text-rf-on-surface disabled:opacity-40"
        >
          <Icon name="refresh" className="text-[14px]" />
          Regenerate
        </button>
      </div>

      {/* Bullets */}
      <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="format_list_bulleted" className="text-[16px] text-rf-primary" />
          <span className="text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
            Key findings
          </span>
        </div>
        <ul className="space-y-2">
          {summary.bullets.map((bullet, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-rf-on-surface">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rf-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Sentiment */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="sentiment_satisfied" className="text-[16px] text-rf-primary" />
            <span className="text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              Sentiment breakdown
            </span>
          </div>
          {sentimentTotal > 0 && (
            <div className="space-y-3">
              <SentimentBar
                label="Positive"
                value={summary.sentiment.positive}
                color="bg-emerald-500"
              />
              <SentimentBar
                label="Neutral"
                value={summary.sentiment.neutral}
                color="bg-slate-400"
              />
              <SentimentBar
                label="Negative"
                value={summary.sentiment.negative}
                color="bg-red-500"
              />
            </div>
          )}
        </div>

        {/* Topics */}
        {summary.topics && summary.topics.length > 0 && (
          <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="label" className="text-[16px] text-rf-primary" />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                Topic clusters
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.topics.map((topic, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium ${
                    topic.sentiment === 'positive'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : topic.sentiment === 'negative'
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-white/10 bg-white/5 text-rf-on-surface-variant'
                  }`}
                >
                  {topic.topic}
                  <span className="rounded-full bg-black/30 px-1.5 text-[10px] font-bold">
                    {topic.count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Standout quotes */}
      {summary.standout_quotes && summary.standout_quotes.length > 0 && (
        <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="format_quote" className="text-[16px] text-rf-primary" />
            <span className="text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              Standout quotes
            </span>
          </div>
          <div className="space-y-3">
            {summary.standout_quotes.map((quote, i) => (
              <blockquote
                key={i}
                className="border-l-2 border-rf-primary/40 pl-4 text-[14px] italic text-rf-on-surface"
              >
                &ldquo;{quote}&rdquo;
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Footer — how it works */}
      <details className="rounded-xl border border-rf-border-white-faint bg-rf-surface-container/30 p-4">
        <summary className="cursor-pointer list-none text-[12px] font-semibold text-rf-on-surface">
          <div className="flex items-center gap-2">
            <Icon name="hub" className="text-[14px] text-rf-primary" />
            How this works
          </div>
        </summary>
        <p className="mt-3 text-[11px] leading-relaxed text-rf-on-surface-variant">
          Reform fetches all submissions, builds a structured prompt, and asks the LLM
          (z-ai-web-dev-sdk, glm-4.5) to summarize them. The result is then validated and
          cached in Xano via the <code className="rounded bg-white/5 px-1.5 py-0.5">ai/save_form_insight</code> function stack — which inserts a row in the <code className="rounded bg-white/5 px-1.5 py-0.5">form_insight</code> table and a row in <code className="rounded bg-white/5 px-1.5 py-0.5">ai_generation_log</code> for the audit trail.
        </p>
      </details>
    </div>
  );
}

function SentimentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-rf-on-surface-variant">{label}</span>
        <span className="font-bold text-rf-on-surface">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/20">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
