'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell, Icon } from '@/components/app-shell';
import { useFlowchartStore } from '@/lib/flowchart/store';
import type { Flowchart } from '@/lib/flowchart/types';

/**
 * AI Form Generator (/forms/ai)
 *
 * User types a natural-language prompt describing the form they want.
 * We POST it to /api/forms/ai/generate, which calls the Xano function
 * stack `ai/generate_form`. Xano orchestrates the LLM call (via the
 * Next.js internal LLM proxy), validates the result, and logs to
 * ai_generation_log. We then load the returned flowchart into the
 * visual builder and navigate there.
 *
 * Demo video gold: type prompt → see flowchart appear in builder in ~3s.
 */
const EXAMPLE_PROMPTS = [
  {
    label: 'NPS Survey',
    text: 'Create a 5-question Net Promoter Score survey for a B2B SaaS company. Include the 0-10 rating question, a category dropdown (Product, Support, Billing, Other), and a conditional comment field that only shows when the rating is 8 or below.',
  },
  {
    label: 'Job Application',
    text: 'Create a job application form for a senior frontend engineer role. Fields: full name, email, phone, portfolio URL, years of experience (number), current role, LinkedIn URL, resume upload, cover letter (long text), and a checkbox for "willing to relocate".',
  },
  {
    label: 'Customer Support',
    text: 'Create a customer support ticket form. Fields: name, email, subject, priority (dropdown: low/medium/high/urgent), category (dropdown: bug, billing, feature request, how-to, other), description (long text, min 20 chars), and a file upload for screenshots.',
  },
  {
    label: 'Event Registration',
    text: 'Create an event registration form for a tech conference. Fields: full name, email, company, job title, dietary restrictions (textarea), t-shirt size (dropdown: XS/S/M/L/XL/XXL), and a checkbox for "I agree to the code of conduct". Make the email field required.',
  },
];

interface GenerateResponse {
  flowchart: Flowchart;
  name: string;
  description: string;
  field_notes?: string;
  model: string;
  latency_ms: number;
  audit_log_id: string;
}

type Status = 'idle' | 'generating' | 'success' | 'error';

export default function AIFormGeneratorPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { loadFlowchart } = useFlowchartStore();

  // Focus the textarea on mount — this page is for typing a prompt fast.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleGenerate() {
    if (prompt.trim().length < 5 || status === 'generating') return;
    setStatus('generating');
    setError(null);
    setResult(null);

    try {
      const resp = await fetch('/api/forms/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!resp.ok) {
        const errorBody = await resp.json().catch(() => ({}));
        throw new Error(errorBody.error || errorBody.details || `HTTP ${resp.status}`);
      }
      const data: GenerateResponse = await resp.json();
      setResult(data);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  function handleOpenInBuilder() {
    if (!result) return;
    // Load the generated flowchart into the global store, then navigate
    // to the existing /forms/new builder — it will pick up the store state.
    loadFlowchart(result.flowchart, result.name, result.description);
    router.push('/forms/new');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl+Enter to generate
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <AppShell activePath="/forms/ai" brandSubtitle="AI form generator">
      <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Header */}
          <header className="mb-8">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-rf-on-surface-variant">
              <Link href="/templates" className="transition-colors hover:text-rf-primary">
                Templates
              </Link>
              <Icon name="chevron_right" className="text-[14px]" />
              <span className="font-semibold text-rf-on-surface">AI Generator</span>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
              Generate a form with AI
            </h1>
            <p className="mt-2 text-[15px] text-rf-on-surface-variant">
              Describe the form you want in plain English. Reform&apos;s AI (running in a Xano function stack) will build the flowchart, choose the right field types, set up validation rules, and drop it into the visual builder.
            </p>
          </header>

          {/* Prompt input */}
          <div className="rounded-2xl border border-rf-border-white-faint bg-rf-glass-bg p-5 backdrop-blur-xl sm:p-6">
            <label htmlFor="prompt" className="mb-2 block text-[13px] font-semibold text-rf-on-surface">
              What kind of form do you need?
            </label>
            <textarea
              id="prompt"
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              placeholder="e.g. Create a 10-question customer feedback form for a B2B SaaS company, with conditional logic for unhappy customers…"
              disabled={status === 'generating'}
              className="w-full resize-y rounded-xl border border-white/10 bg-rf-input-hollow-bg px-4 py-3 text-[14px] text-rf-on-surface placeholder:text-rf-on-surface-variant/60 focus:border-rf-primary/50 focus:outline-none focus:ring-2 focus:ring-rf-primary/20 disabled:opacity-50"
              maxLength={2000}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-rf-on-surface-variant">
                {prompt.length}/2000 · <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">⌘</kbd><kbd className="ml-0.5 rounded bg-white/5 px-1.5 py-0.5 text-[10px]">↵</kbd> to generate
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={prompt.trim().length < 5 || status === 'generating'}
                className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-bold disabled:opacity-40"
              >
                {status === 'generating' ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin text-[16px]" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Icon name="auto_awesome" className="text-[16px]" />
                    Generate form
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Example prompts */}
          {status === 'idle' && (
            <div className="mt-6">
              <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                Try an example
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => {
                      setPrompt(ex.text);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-xl border border-white/10 bg-rf-surface-container/50 px-4 py-3 text-left text-[13px] text-rf-on-surface-variant transition-colors hover:border-rf-primary/40 hover:text-rf-on-surface"
                  >
                    <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-rf-on-surface">
                      <Icon name="lightbulb" className="text-[14px] text-rf-primary" />
                      {ex.label}
                    </div>
                    <div className="line-clamp-2 text-[12px]">{ex.text}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
              <div className="flex items-start gap-3">
                <Icon name="error" className="text-[20px] text-red-400" />
                <div>
                  <div className="text-[14px] font-semibold text-red-300">Generation failed</div>
                  <div className="mt-1 text-[12px] text-red-300/80">{error}</div>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {status === 'success' && result && (
            <div className="mt-6 space-y-4">
              {/* Success banner */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <Icon name="check_circle" className="text-[20px] text-emerald-400" />
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-emerald-300">
                      Form generated in {(result.latency_ms / 1000).toFixed(1)}s
                    </div>
                    <div className="mt-1 text-[12px] text-emerald-300/80">
                      {result.flowchart.nodes.length} nodes · {result.flowchart.edges.length} edges · model: {result.model} · audit log: <code className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px]">{result.audit_log_id}</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form metadata */}
              <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Icon name="description" className="text-[16px] text-rf-primary" />
                  <span className="text-[13px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                    Suggested metadata
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">Name</div>
                    <div className="mt-1 text-[16px] font-semibold text-rf-on-surface">{result.name}</div>
                  </div>
                  {result.description && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">Description</div>
                      <div className="mt-1 text-[13px] text-rf-on-surface-variant">{result.description}</div>
                    </div>
                  )}
                  {result.field_notes && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">AI notes</div>
                      <div className="mt-1 text-[13px] text-rf-on-surface-variant">{result.field_notes}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Flowchart preview (JSON) */}
              <details className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50">
                <summary className="cursor-pointer list-none px-5 py-4 text-[13px] font-semibold text-rf-on-surface">
                  <div className="flex items-center gap-2">
                    <Icon name="data_object" className="text-[16px] text-rf-primary" />
                    Flowchart JSON ({result.flowchart.nodes.length} nodes, {result.flowchart.edges.length} edges)
                  </div>
                </summary>
                <div className="border-t border-rf-border-white-faint p-4">
                  <pre className="max-h-[400px] overflow-auto rounded-lg bg-black/30 p-4 text-[11px] leading-relaxed text-emerald-200/80">
                    {JSON.stringify(result.flowchart, null, 2)}
                  </pre>
                </div>
              </details>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenInBuilder}
                  className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-bold"
                >
                  <Icon name="edit" className="text-[16px]" />
                  Open in builder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setResult(null);
                    setPrompt('');
                    textareaRef.current?.focus();
                  }}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-4 py-2.5 text-[13px] font-semibold text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
                >
                  <Icon name="refresh" className="text-[16px]" />
                  Generate another
                </button>
              </div>
            </div>
          )}

          {/* How it works — collapsible */}
          {status === 'idle' && (
            <details className="mt-10 rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/30 p-5">
              <summary className="cursor-pointer list-none text-[13px] font-semibold text-rf-on-surface">
                <div className="flex items-center gap-2">
                  <Icon name="hub" className="text-[16px] text-rf-primary" />
                  How this works (architecture)
                </div>
              </summary>
              <div className="mt-4 space-y-3 text-[12px] text-rf-on-surface-variant">
                <p>
                  When you click <strong>Generate form</strong>, the prompt is sent to <code className="rounded bg-white/5 px-1.5 py-0.5">POST /api/forms/ai/generate</code>, which invokes the Xano function stack <code className="rounded bg-white/5 px-1.5 py-0.5">ai/generate_form</code>.
                </p>
                <p>
                  The Xano function builds a structured system prompt, calls the Next.js internal LLM proxy at <code className="rounded bg-white/5 px-1.5 py-0.5">/api/internal/llm</code> (which uses z-ai-web-dev-sdk to actually run the model), parses the response as flowchart JSON, validates it, and logs the entire invocation to the Xano <code className="rounded bg-white/5 px-1.5 py-0.5">ai_generation_log</code> table.
                </p>
                <p>
                  The Next.js app never talks to an LLM directly — every AI call flows through Xano, so the audit trail and business logic live in your backend, not in the frontend.
                </p>
              </div>
            </details>
          )}
        </div>
      </div>
    </AppShell>
  );
}
