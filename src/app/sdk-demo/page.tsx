'use client';

import { useState } from 'react';
import { Icon } from '@/components/app-shell';
import { ReformForm } from '@/sdk/reform-form';

/**
 * /sdk-demo — interactive demo of the ReformForm embeddable widget.
 *
 * Lets users paste any share ID + pick a mode (standard, conversational,
 * voice) and see the embedded form live. Also shows the code snippet
 * they'd copy to embed it on their own site.
 */
export default function SDKDemoPage() {
  const [shareId, setShareId] = useState('c0mtfp67k8c8ea9ede2b7920f');
  const [mode, setMode] = useState<'standard' | 'conversational' | 'voice'>('standard');
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const codeSnippet = `import { ReformForm } from '@/sdk/reform-form';

function MyMarketingPage() {
  return (
    <ReformForm
      shareId="${shareId}"
      mode="${mode}"
      onSubmit={(submissionId) => console.log('Submitted:', submissionId)}
    />
  );
}`;

  const htmlSnippet = `<!-- Vanilla HTML embed -->
<div id="reform-form"></div>
<script>
  import('https://your-reform-app.com/sdk/reform-form.js')
    .then(({ mountReformForm }) => mountReformForm({
      target: '#reform-form',
      shareId: '${shareId}',
      mode: '${mode}',
    }));
</script>`;

  return (
    <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2">
            <Icon name="extension" className="text-[24px] text-rf-primary" />
            <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
              Embeddable Widget SDK
            </h1>
          </div>
          <p className="mt-2 text-[15px] text-rf-on-surface-variant">
            Drop a Reform form into any site with a single React component. Three modes: standard, conversational (chat), and voice (mic).
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: form preview */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Share ID
                </label>
                <input
                  type="text"
                  value={shareId}
                  onChange={(e) => setShareId(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-1.5 text-[12px] font-mono text-rf-on-surface"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['standard', 'conversational', 'voice'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      mode === m
                        ? 'border-rf-primary bg-rf-primary/10 text-rf-primary'
                        : 'border-white/10 bg-rf-input-hollow-bg text-rf-on-surface-variant hover:text-rf-on-surface'
                    }`}
                  >
                    {m === 'standard' && '📝 '}
                    {m === 'conversational' && '💬 '}
                    {m === 'voice' && '🎤 '}
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-rf-border-white-faint bg-black/30 p-2">
              {shareId ? (
                <ReformForm
                  shareId={shareId}
                  mode={mode}
                  height={500}
                  onSubmit={(sid) => setLastSubmission(sid)}
                  onError={(e) => setLastError(e)}
                />
              ) : (
                <div className="flex h-[500px] items-center justify-center text-[13px] text-rf-on-surface-variant">
                  Enter a share ID above to preview
                </div>
              )}
            </div>

            {lastSubmission && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2 text-[12px] text-emerald-300">
                  <Icon name="check_circle" className="text-[16px]" />
                  Submission received: <code className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px]">{lastSubmission.slice(0, 24)}…</code>
                </div>
              </div>
            )}

            {lastError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                <div className="flex items-center gap-2 text-[12px] text-red-300">
                  <Icon name="error" className="text-[16px]" />
                  {lastError}
                </div>
              </div>
            )}
          </div>

          {/* Right: code snippets */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="code" className="text-[16px] text-rf-primary" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  React usage
                </span>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 text-[11px] leading-relaxed text-emerald-200/90">
                {codeSnippet}
              </pre>
            </div>

            <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="html" className="text-[16px] text-rf-primary" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Vanilla HTML embed
                </span>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 text-[11px] leading-relaxed text-emerald-200/90">
                {htmlSnippet}
              </pre>
            </div>

            <details className="rounded-xl border border-rf-border-white-faint bg-rf-surface-container/30 p-4">
              <summary className="cursor-pointer list-none text-[12px] font-semibold text-rf-on-surface">
                <div className="flex items-center gap-2">
                  <Icon name="hub" className="text-[14px] text-rf-primary" />
                  How the embed works
                </div>
              </summary>
              <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-rf-on-surface-variant">
                <p>
                  The <code className="rounded bg-white/5 px-1.5 py-0.5">ReformForm</code> React component renders an iframe pointing at <code className="rounded bg-white/5 px-1.5 py-0.5">/embed/{'{shareId}'}?mode=...</code>. The embed page is a minimal version of the public form — no app shell, no nav, no sidebar.
                </p>
                <p>
                  The iframe auto-resizes to fit its content via the <code className="rounded bg-white/5 px-1.5 py-0.5">postMessage</code> API: the embed page sends <code className="rounded bg-white/5 px-1.5 py-0.5">{'{ type: "reform:height", height: N }'}</code> messages and the parent React component updates its height.
                </p>
                <p>
                  On successful submission, the embed sends <code className="rounded bg-white/5 px-1.5 py-0.5">{'{ type: "reform:submitted", submissionId: "..." }'}</code> so the host page can react (e.g. fire an analytics event, redirect to a thank-you page).
                </p>
                <p>
                  The widget supports three modes — standard (full form UI), conversational (chat), and voice (chat with mic). Voice mode requires the <code className="rounded bg-white/5 px-1.5 py-0.5">allow=&quot;microphone&quot;</code> attribute, which the SDK sets automatically.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
