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
type MicStatus = 'idle' | 'recording' | 'transcribing';

/**
 * ConversationalFormRenderer — renders a published form as a chat.
 *
 * Also includes a 🎤 mic button for voice-first input: the user can
 * speak their answer, the audio is sent to /api/forms/[id]/voice-transcribe
 * which uses a local Whisper ASR server to convert it to text. The
 * transcribed text is then sent through the normal chat flow.
 */
export function ConversationalFormRenderer({ shareId, formName, formDescription }: ConversationalFormRendererProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ answered: number; total: number } | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micStatus, setMicStatus] = useState<MicStatus>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Auto-start the conversation on mount
  useEffect(() => {
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup media recorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
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

  // ----- Voice recording + transcription -----

  async function toggleMic() {
    if (micStatus === 'recording') {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Stop the stream so the mic indicator turns off
        stream.getTracks().forEach((t) => t.stop());

        if (blob.size === 0) {
          setMicStatus('idle');
          setError('No audio captured. Please try again.');
          return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          await transcribeAudio(base64);
        };
        reader.readAsDataURL(blob);
      };

      mr.start();
      setMicStatus('recording');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? `Microphone access failed: ${e.message}` : String(e));
      setMicStatus('idle');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setMicStatus('transcribing');
    }
  }

  async function transcribeAudio(base64: string) {
    try {
      const resp = await fetch(`/api/forms/${shareId}/voice-transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, shareId }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.details || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setInput(data.transcription);
      setMicStatus('idle');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      setError(e instanceof Error ? `Transcription failed: ${e.message}` : String(e));
      setMicStatus('idle');
    }
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

          {/* Voice transcribing indicator */}
          {micStatus === 'transcribing' && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-rf-primary/30 bg-rf-primary/5 px-4 py-2.5">
                <div className="flex items-center gap-2 text-[12px] text-rf-primary">
                  <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                  Transcribing your voice…
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
                disabled={status !== 'active' || micStatus !== 'idle'}
                className="flex-1 rounded-xl border border-white/10 bg-rf-input-hollow-bg px-4 py-2.5 text-[14px] text-rf-on-surface placeholder:text-rf-on-surface-variant/60 focus:border-rf-primary focus:outline-none disabled:opacity-50"
              />
              {/* Mic button — voice-first input */}
              <button
                type="button"
                onClick={toggleMic}
                disabled={status !== 'active' || micStatus === 'transcribing'}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-30 ${
                  micStatus === 'recording'
                    ? 'animate-pulse bg-red-500 text-white'
                    : micStatus === 'transcribing'
                    ? 'bg-amber-500 text-white'
                    : 'border border-white/10 bg-rf-input-hollow-bg text-rf-on-surface-variant hover:text-rf-primary'
                }`}
                aria-label={micStatus === 'recording' ? 'Stop recording' : 'Record voice answer'}
                title={micStatus === 'recording' ? 'Recording… click to stop' : 'Speak your answer'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {micStatus === 'recording' ? 'stop' : micStatus === 'transcribing' ? 'progress_activity' : 'mic'}
                </span>
              </button>
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || status !== 'active' || micStatus !== 'idle'}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-rf-primary text-white transition-colors hover:bg-rf-primary/90 disabled:opacity-30"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-rf-on-surface-variant/60">
              {micStatus === 'recording' ? (
                <span className="flex items-center gap-1 text-red-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                  Recording — click the mic again to stop
                </span>
              ) : micStatus === 'transcribing' ? (
                <span className="text-amber-400">Transcribing your voice…</span>
              ) : (
                <>
                  Powered by Reform&apos;s conversational AI · 🎤 mic for voice input ·{' '}
                  <Link href={`/f/${shareId}`} className="underline hover:text-rf-on-surface-variant">
                    Standard form
                  </Link>
                </>
              )}
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}

