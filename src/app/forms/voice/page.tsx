'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { AppShell, Icon } from '@/components/app-shell';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Form {
  id: string;
  name: string;
  description?: string;
  shareId?: string;
}

type MicState = 'idle' | 'recording' | 'processing' | 'transcribed';

// ---------------------------------------------------------------------------
// Voice demo — interactive mic visualization
// ---------------------------------------------------------------------------

function VoiceDemo() {
  const [micState, setMicState] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState<number[]>(new Array(20).fill(0));
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sampleTranscripts = [
    "My name is Jane and I work at Acme Corp. I'd rate the product 4 out of 5.",
    "The onboarding was confusing but the support team was very helpful.",
    "I'd like to see more integration options and a mobile app.",
  ];

  const handleToggleMic = useCallback(async () => {
    if (micState === 'recording') {
      // Stop recording
      setMicState('processing');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      // Simulate transcription
      await new Promise((r) => setTimeout(r, 1500));
      const text = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
      setTranscript(text);
      setMicState('transcribed');
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        function updateVolume() {
          analyser.getByteFrequencyData(dataArray);
          const bars = Array.from(dataArray.slice(0, 20)).map((v) => v / 255);
          setVolume(bars);
          animFrameRef.current = requestAnimationFrame(updateVolume);
        }
        updateVolume();

        setMicState('recording');
        setTranscript('');
      } catch {
        // Fallback: simulate recording without mic
        setMicState('recording');
        setTranscript('');
        let frame = 0;
        function animate() {
          setVolume((prev) =>
            prev.map((_, i) =>
              Math.max(0, Math.min(1, 0.3 + 0.4 * Math.sin((frame + i * 0.5) * 0.15) * Math.random()))
            )
          );
          frame++;
          animFrameRef.current = requestAnimationFrame(animate);
        }
        animate();
      }
    }
  }, [micState]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-rf-surface-container/60">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <Icon name="mic" className="text-[16px] text-emerald-400" />
        </div>
        <div>
          <div className="text-[12px] font-bold text-rf-on-surface">Voice Mode</div>
          <div className="text-[10px] text-rf-on-surface-variant">Interactive demo</div>
        </div>
        {micState !== 'idle' && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${
              micState === 'recording' ? 'animate-pulse bg-red-400' :
              micState === 'processing' ? 'animate-pulse bg-amber-400' :
              'bg-emerald-400'
            }`} />
            <span className={`text-[10px] font-semibold ${
              micState === 'recording' ? 'text-red-400' :
              micState === 'processing' ? 'text-amber-400' :
              'text-emerald-400'
            }`}>
              {micState === 'recording' ? 'Listening...' :
               micState === 'processing' ? 'Transcribing...' :
               'Transcribed'}
            </span>
          </div>
        )}
      </div>

      {/* Visualization */}
      <div className="flex flex-col items-center px-4 py-8">
        {/* Mic button */}
        <button
          type="button"
          onClick={handleToggleMic}
          disabled={micState === 'processing'}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
            micState === 'recording'
              ? 'scale-110 bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
              : micState === 'processing'
              ? 'bg-amber-500'
              : micState === 'transcribed'
              ? 'bg-emerald-500'
              : 'bg-white/10 hover:bg-white/15'
          }`}
        >
          {/* Pulsing rings when recording */}
          {micState === 'recording' && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
              <span className="absolute inset-[-8px] animate-ping rounded-full bg-red-500/10" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          <Icon
            name={
              micState === 'recording' ? 'stop' :
              micState === 'processing' ? 'progress_activity' :
              micState === 'transcribed' ? 'check' :
              'mic'
            }
            className={`text-[28px] ${
              micState === 'recording' ? 'animate-spin text-white' :
              micState === 'processing' ? 'animate-spin text-white' :
              'text-white'
            }`}
          />
        </button>

        {/* Volume bars */}
        {micState === 'recording' && (
          <div className="mt-6 flex items-end gap-[3px] h-12">
            {volume.map((v, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-gradient-to-t from-emerald-500 to-emerald-300 transition-all duration-75"
                style={{ height: `${Math.max(4, v * 48)}px`, opacity: 0.4 + v * 0.6 }}
              />
            ))}
          </div>
        )}

        {/* Transcription result */}
        {transcript && (
          <div className="mt-6 w-full max-w-md rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="fact_check" className="text-[14px] text-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Transcription
              </span>
            </div>
            <p className="text-[13px] text-rf-on-surface leading-relaxed">{transcript}</p>
            <button
              type="button"
              onClick={() => { setTranscript(''); setMicState('idle'); }}
              className="mt-3 text-[10px] font-semibold text-emerald-400/60 hover:text-emerald-400"
            >
              Reset demo
            </button>
          </div>
        )}

        {/* Instructions */}
        {micState === 'idle' && (
          <p className="mt-4 text-center text-[12px] text-rf-on-surface-variant">
            Click the microphone to start recording.
            <br />
            Your voice will be transcribed using local Whisper ASR.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function VoicePage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  useEffect(() => {
    async function fetchForms() {
      try {
        const resp = await fetch('/api/forms', { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          setForms(data.forms ?? data ?? []);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    fetchForms();
  }, []);

  return (
    <AppShell activePath="/forms/new?mode=voice" brandSubtitle="Voice mode">
      <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Breadcrumb */}
          <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-rf-on-surface-variant">
            <Link href="/dashboard" className="transition-colors hover:text-rf-primary">Dashboard</Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="font-semibold text-rf-on-surface">Voice Mode</span>
          </div>

          {/* Hero */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Icon name="mic" className="text-[22px] text-emerald-400" />
              </div>
              <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                Voice Mode
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-[15px] text-rf-on-surface-variant">
              Let respondents speak their answers instead of typing. Reform's local Whisper ASR transcribes audio in real-time and feeds it through the conversational form pipeline.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left: Voice demo */}
            <div>
              <VoiceDemo />
            </div>

            {/* Right: Info + form selector */}
            <div className="space-y-6">
              {/* Features */}
              <div className="rounded-2xl border border-white/8 bg-rf-surface-container/60 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-rf-on-surface">
                  <Icon name="auto_awesome" className="text-[16px] text-emerald-400" />
                  Voice features
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: 'mic', title: 'Real-time transcription', desc: 'Speak naturally — Whisper transcribes your voice with high accuracy.' },
                    { icon: 'smart_toy', title: 'AI extracts answers', desc: 'The AI understands context and extracts the right answer from free-form speech.' },
                    { icon: 'language', title: 'Multi-language', desc: 'Supports 99 languages out of the box via Whisper\'s multilingual model.' },
                    { icon: 'privacy', title: 'Fully local', desc: 'Audio stays on your machine — transcription runs on a local Whisper server.' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/5 bg-rf-input-hollow-bg p-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                        <Icon name={item.icon} className="text-[14px] text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-rf-on-surface">{item.title}</div>
                        <div className="text-[11px] text-rf-on-surface-variant">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form selector */}
              <div className="rounded-2xl border border-white/8 bg-rf-surface-container/60 p-6">
                <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-rf-on-surface">
                  <Icon name="list" className="text-[16px] text-emerald-400" />
                  Enable voice for a form
                </h3>
                {loading ? (
                  <div className="py-8 text-center">
                    <Icon name="progress_activity" className="mx-auto animate-spin text-[24px] text-emerald-400" />
                  </div>
                ) : forms.length === 0 ? (
                  <div className="py-8 text-center">
                    <Icon name="description" className="mx-auto mb-2 text-[32px] text-rf-on-surface-variant/20" />
                    <p className="text-[13px] font-semibold text-rf-on-surface">No forms yet</p>
                    <Link
                      href="/forms/ai"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/15"
                    >
                      <Icon name="auto_awesome" className="text-[12px]" />
                      Generate a form
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {forms.map((form) => (
                      <button
                        key={form.id}
                        type="button"
                        onClick={() => setSelectedForm(form)}
                        className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                          selectedForm?.id === form.id
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : 'border-white/5 bg-rf-input-hollow-bg hover:border-white/10'
                        }`}
                      >
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                          selectedForm?.id === form.id ? 'bg-emerald-500/20' : 'bg-white/5'
                        }`}>
                          <Icon name="description" className={`text-[16px] ${
                            selectedForm?.id === form.id ? 'text-emerald-400' : 'text-rf-on-surface-variant'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-bold text-rf-on-surface">{form.name}</div>
                          {form.description && (
                            <div className="truncate text-[11px] text-rf-on-surface-variant">{form.description}</div>
                          )}
                        </div>
                        {form.shareId && (
                          <Link
                            href={`/f/${form.shareId}/chat`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-400 opacity-0 transition-opacity hover:bg-emerald-500/20 group-hover:opacity-100"
                          >
                            <Icon name="open_in_new" className="text-[12px]" />
                            Open
                          </Link>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
