'use client';

import { useState, useEffect, useCallback } from 'react';
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
  _count?: { submissions: number };
}

interface ChatMessage {
  role: 'bot' | 'user';
  content: string;
}

// ---------------------------------------------------------------------------
// Chat preview — live demo of the conversational form experience
// ---------------------------------------------------------------------------

function ChatPreview() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', content: "Hi there! I'm Reform's conversational form assistant. I'll walk you through a few questions to collect your feedback." },
  ]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const questions = [
    { q: "What's your name?", a: 'Jane Doe' },
    { q: "How would you rate your experience on a scale of 1-5?", a: '4' },
    { q: "What could we improve?", a: 'The onboarding process was a bit confusing at first, but overall great product.' },
  ];

  useEffect(() => {
    if (currentStep < questions.length) {
      const timer = setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'bot', content: questions[currentStep].q }]);
      }, 1200);
      return () => clearTimeout(timer);
    } else if (currentStep === questions.length) {
      const timer = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: "Thank you! Your feedback has been recorded. We appreciate your time." },
        ]);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  function handleSend() {
    if (!input.trim() || currentStep >= questions.length) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setInput('');
    setCurrentStep((s) => s + 1);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-rf-surface-container/60">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
          <Icon name="chat_bubble" className="text-[16px] text-violet-400" />
        </div>
        <div>
          <div className="text-[12px] font-bold text-rf-on-surface">Conversational Mode</div>
          <div className="text-[10px] text-rf-on-surface-variant">Live preview</div>
        </div>
        {currentStep < questions.length && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-rf-on-surface-variant">Progress</span>
            <span className="rounded-full bg-violet-500/10 px-2 py-px text-[10px] font-bold text-violet-400">
              {currentStep}/{questions.length}
            </span>
          </div>
        )}
        {currentStep >= questions.length && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400">Complete</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="h-[320px] overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-md bg-violet-500 text-white'
                  : 'rounded-bl-md border border-white/8 bg-rf-input-hollow-bg text-rf-on-surface'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {currentStep < questions.length && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-white/8 bg-rf-input-hollow-bg px-4 py-2.5">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400/40" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400/40" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400/40" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/6 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={currentStep >= questions.length ? 'Conversation complete' : 'Type your answer...'}
            disabled={currentStep >= questions.length}
            className="flex-1 rounded-xl border border-white/8 bg-rf-input-hollow-bg px-4 py-2.5 text-[12px] text-rf-on-surface placeholder:text-rf-on-surface-variant/30 focus:border-violet-500/40 focus:outline-none disabled:opacity-40"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || currentStep >= questions.length}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white transition-colors hover:bg-violet-500/90 disabled:opacity-30"
          >
            <Icon name="send" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ChatPage() {
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
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchForms();
  }, []);

  return (
    <AppShell activePath="/forms/new?mode=chat" brandSubtitle="Conversational">
      <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Breadcrumb */}
          <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-rf-on-surface-variant">
            <Link href="/dashboard" className="transition-colors hover:text-rf-primary">Dashboard</Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="font-semibold text-rf-on-surface">Conversational Forms</span>
          </div>

          {/* Hero */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Icon name="chat_bubble" className="text-[22px] text-violet-400" />
              </div>
              <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                Conversational Forms
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-[15px] text-rf-on-surface-variant">
              Turn any form into a natural conversation. Reform's AI walks respondents through questions one by one, adapting follow-ups based on their answers.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left: Chat preview */}
            <div>
              <ChatPreview />
            </div>

            {/* Right: Select a form */}
            <div className="space-y-6">
              {/* How it works */}
              <div className="rounded-2xl border border-white/8 bg-rf-surface-container/60 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-rf-on-surface">
                  <Icon name="psychology" className="text-[16px] text-violet-400" />
                  How it works
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: 'description', title: 'Pick a form', desc: 'Select any published form to convert into a conversation.' },
                    { icon: 'smart_toy', title: 'AI adapts', desc: 'The AI asks questions naturally and adapts follow-ups based on answers.' },
                    { icon: 'mic', title: 'Voice input', desc: 'Respondents can speak their answers using the built-in voice mode.' },
                    { icon: 'check_circle', title: 'Auto-submit', desc: 'Once all required fields are answered, the submission is captured automatically.' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/5 bg-rf-input-hollow-bg p-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                        <Icon name={item.icon} className="text-[14px] text-violet-400" />
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
                  <Icon name="list" className="text-[16px] text-violet-400" />
                  Select a form
                </h3>
                {loading ? (
                  <div className="py-8 text-center">
                    <Icon name="progress_activity" className="mx-auto animate-spin text-[24px] text-violet-400" />
                    <p className="mt-2 text-[11px] text-rf-on-surface-variant">Loading forms...</p>
                  </div>
                ) : forms.length === 0 ? (
                  <div className="py-8 text-center">
                    <Icon name="description" className="mx-auto mb-2 text-[32px] text-rf-on-surface-variant/20" />
                    <p className="text-[13px] font-semibold text-rf-on-surface">No forms yet</p>
                    <p className="text-[11px] text-rf-on-surface-variant">Create a form first, then convert it to a conversation.</p>
                    <Link
                      href="/forms/ai"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold text-violet-400 hover:bg-violet-500/15"
                    >
                      <Icon name="auto_awesome" className="text-[12px]" />
                      Generate a form with AI
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
                            ? 'border-violet-500/30 bg-violet-500/10'
                            : 'border-white/5 bg-rf-input-hollow-bg hover:border-white/10'
                        }`}
                      >
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                          selectedForm?.id === form.id ? 'bg-violet-500/20' : 'bg-white/5'
                        }`}>
                          <Icon name="description" className={`text-[16px] ${
                            selectedForm?.id === form.id ? 'text-violet-400' : 'text-rf-on-surface-variant'
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
                            className="flex items-center gap-1 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-[10px] font-bold text-violet-400 opacity-0 transition-opacity hover:bg-violet-500/20 group-hover:opacity-100"
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
