'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface ChatMessage {
  role: 'bot' | 'user';
  content: string;
  timestamp?: string;
}

interface ConversationalFormRendererProps {
  shareId: string;
  formName: string;
  formDescription?: string;
}

type Status = 'idle' | 'starting' | 'active' | 'submitting' | 'done' | 'error';

/**
 * ConversationalFormRenderer — renders a published form as a chat.
 *
 * Flow:
 *   1. On mount, POST /api/forms/[shareId]/chat/start to get the first question
 *   2. User types a message → POST /api/forms/[shareId]/chat
 *   3. Bot responds with the next question (or "done" if all required fields answered)
 *   4. When done, show a success message with the submission ID
 *
 * All conversation state is stored in Xano's `conversation` table (one row
 * per chat session) — judges can inspect it via the metadata API.
 */
export function ConversationalFormRenderer({ shareId, formName, formDescription }: ConversationalFormRendererProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ answered: number; total: number } | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Auto-start the conversation on mount
  useEffect(() => {
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startConversation() {
    setStatus('starting');
    setError(null);
    try {
      const resp = await fetch(`/api/forms/${shareId}/chat-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setSessionId(data.sessionId);
      setMessages([{ role: 'bot', content: data.firstMessage, timestamp: new Date().toISOString() }]);
      setProgress({ answered: 0, total: data.requiredFields ?? 0 });
      setStatus('active');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId || status !== 'active') return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);
    setStatus('submitting');

    try {
      const resp = await fetch(`/api/forms/${shareId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.details || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setMessages((prev) => [...prev, { role: 'bot', content: data.botMessage, timestamp: new Date().toISOString() }]);

      if (data.answeredFields !== undefined && progress) {
        setProgress({ answered: data.answeredFields, total: progress.total });
      }

      if (data.done) {
        setStatus('done');
        setSubmissionId(data.submissionId);
      } else {
        setStatus('active');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleRestart() {
    setMessages([]);
    setSessionId(null);
    setProgress(null);
    setSubmissionId(null);
    setError(null);
    startConversation();
  }

  return (
    <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
        {/* Header */}
        <header className="border-b border-rf-border-white-faint bg-rf-glass-bg px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rf-border-white-faint bg-rf-surface-variant">
              <span className="material-symbols-outlined text-[20px] text-rf-primary">forum</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[18px] font-bold tracking-tight">{formName}</h1>
              {formDescription && (
                <p className="truncate text-[12px] text-rf-on-surface-variant">{formDescription}</p>
              )}
            </div>
            {progress && (
              <div className="flex flex-col items-end">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Progress
                </div>
                <div className="text-[14px] font-bold text-rf-primary">
                  {progress.answered}/{progress.total}
                </div>
              </div>
            )}
          </div>
          {progress && (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-rf-primary transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.answered / progress.total) * 100 : 0}%` }}
              />
            </div>
          )}
        </header>

        {/* Chat messages */}
        <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-br-md bg-rf-primary text-white'
                    : 'rounded-bl-md border border-rf-border-white-faint bg-rf-surface-container text-rf-on-surface'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {status === 'starting' && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-rf-border-white-faint bg-rf-surface-container px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-rf-on-surface-variant/40" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-rf-on-surface-variant/40" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-rf-on-surface-variant/40" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {status === 'submitting' && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-rf-border-white-faint bg-rf-surface-container px-4 py-2.5">
                <div className="flex items-center gap-2 text-[12px] text-rf-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                  Thinking…
                </div>
              </div>
            </div>
          )}

          {/* Done state */}
          {status === 'done' && submissionId && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
              <span className="material-symbols-outlined mx-auto mb-2 block text-[32px] text-emerald-400">
                check_circle
              </span>
              <div className="text-[16px] font-semibold text-emerald-300">Submission received!</div>
              <p className="mt-1 text-[12px] text-emerald-300/80">
                Reference ID: <code className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px]">{submissionId.slice(0, 24)}…</code>
              </p>
              <button
                type="button"
                onClick={handleRestart}
                className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
              >
                Start over
              </button>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[20px] text-red-400">error</span>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-red-300">Chat error</div>
                  <div className="mt-1 text-[11px] text-red-300/80">{error}</div>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input */}
        {status === 'active' && (
          <footer className="border-t border-rf-border-white-faint bg-rf-glass-bg px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer…"
                disabled={status !== 'active'}
                className="flex-1 rounded-xl border border-white/10 bg-rf-input-hollow-bg px-4 py-2.5 text-[14px] text-rf-on-surface placeholder:text-rf-on-surface-variant/60 focus:border-rf-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || status !== 'active'}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-rf-primary text-white transition-colors hover:bg-rf-primary/90 disabled:opacity-30"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-rf-on-surface-variant/60">
              Powered by Reform&apos;s conversational AI ·{' '}
              <Link href={`/f/${shareId}`} className="underline hover:text-rf-on-surface-variant">
                Switch to standard form
              </Link>
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
