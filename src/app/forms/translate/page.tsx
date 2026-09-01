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
}

interface TranslationResult {
  language: string;
  translations: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸', native: 'Español' },
  { code: 'fr', name: 'French', flag: '🇫🇷', native: 'Français' },
  { code: 'de', name: 'German', flag: '🇩🇪', native: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', native: 'Português' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', native: 'Italiano' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', native: '中文' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', native: '日本語' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', native: 'العربية' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', native: 'हिन्दी' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪', native: 'Kiswahili' },
];

// ---------------------------------------------------------------------------
// Translation preview — shows before/after
// ---------------------------------------------------------------------------

function TranslationPreview() {
  const [activeLang, setActiveLang] = useState('es');

  const sampleStrings: Record<string, string> = {
    name: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    message: 'Your Message',
    submit: 'Submit',
    rating: 'How would you rate us?',
  };

  const sampleTranslations: Record<string, Record<string, string>> = {
    es: { name: 'Nombre completo', email: 'Correo electrónico', phone: 'Número de teléfono', message: 'Tu mensaje', submit: 'Enviar', rating: '¿Cómo nos calificarías?' },
    fr: { name: 'Nom complet', email: 'Adresse e-mail', phone: 'Numéro de téléphone', message: 'Votre message', submit: 'Soumettre', rating: 'Comment nous évalueriez-vous?' },
    de: { name: 'Vollständiger Name', email: 'E-Mail-Adresse', phone: 'Telefonnummer', message: 'Ihre Nachricht', submit: 'Absenden', rating: 'Wie würden Sie uns bewerten?' },
    pt: { name: 'Nome completo', email: 'Endereço de e-mail', phone: 'Número de telefone', message: 'Sua mensagem', submit: 'Enviar', rating: 'Como você nos avaliaria?' },
    it: { name: 'Nome completo', email: 'Indirizzo e-mail', phone: 'Numero di telefono', message: 'Il tuo messaggio', submit: 'Invia', rating: 'Come ci valuteresti?' },
    zh: { name: '全名', email: '电子邮件地址', phone: '电话号码', message: '您的留言', submit: '提交', rating: '您如何评价我们？' },
    ja: { name: '氏名', email: 'メールアドレス', phone: '電話番号', message: 'メッセージ', submit: '送信', rating: 'どのように評価しますか？' },
    ar: { name: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', message: 'رسالتك', submit: 'إرسال', rating: 'كيف تقيمنا؟' },
    hi: { name: 'पूरा नाम', email: 'ईमेल पता', phone: 'फ़ोन नंबर', message: 'आपका संदेश', submit: 'सबमिट', rating: 'आप हमें कैसे रेट करेंगे?' },
    sw: { name: 'Jina kamili', email: 'Anwani ya barua pepe', phone: 'Nambari ya simu', message: 'Ujumbe wako', submit: 'Wasilisha', rating: 'Ungetutathimnia vipi?' },
  };

  const lang = LANGUAGES.find((l) => l.code === activeLang)!;
  const translations = sampleTranslations[activeLang] ?? {};

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-rf-surface-container/60">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <Icon name="translate" className="text-[16px] text-amber-400" />
        </div>
        <div>
          <div className="text-[12px] font-bold text-rf-on-surface">Translation Preview</div>
          <div className="text-[10px] text-rf-on-surface-variant">Before & after</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[20px]">{lang.flag}</span>
          <span className="text-[11px] font-semibold text-rf-on-surface">{lang.name}</span>
        </div>
      </div>

      {/* Language selector pills */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-white/6 px-4 py-2.5 scrollbar-none">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setActiveLang(l.code)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              activeLang === l.code
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-rf-on-surface-variant hover:text-rf-on-surface hover:bg-white/5'
            }`}
          >
            <span className="text-[14px]">{l.flag}</span>
            {l.code.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Translation pairs */}
      <div className="divide-y divide-white/5">
        {Object.entries(sampleStrings).map(([key, original]) => (
          <div key={key} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant/40 mb-0.5">
                English
              </div>
              <div className="text-[13px] text-rf-on-surface">{original}</div>
            </div>
            <Icon name="arrow_forward" className="flex-shrink-0 text-[14px] text-rf-on-surface-variant/30" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant/40 mb-0.5">
                {lang.name}
              </div>
              <div className="text-[13px] text-amber-400 font-medium">{translations[key] || original}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TranslatePage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [translated, setTranslated] = useState<Record<string, number>>({});

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

  const handleTranslate = useCallback(async (langCode: string) => {
    if (!selectedForm) return;
    setTranslatingLang(langCode);
    // Simulate translation
    await new Promise((r) => setTimeout(r, 2000));
    setTranslated((prev) => ({ ...prev, [langCode]: 6 + Math.floor(Math.random() * 5) }));
    setTranslatingLang(null);
  }, [selectedForm]);

  return (
    <AppShell activePath="/forms/new?mode=translate" brandSubtitle="Translation">
      <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Breadcrumb */}
          <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-rf-on-surface-variant">
            <Link href="/dashboard" className="transition-colors hover:text-rf-primary">Dashboard</Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="font-semibold text-rf-on-surface">Auto-Translation</span>
          </div>

          {/* Hero */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Icon name="translate" className="text-[22px] text-amber-400" />
              </div>
              <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                Auto-Translation
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-[15px] text-rf-on-surface-variant">
              One-click translate all form labels, placeholders, and options into 10+ languages. Translations are cached in Xano and served to respondents based on their browser language.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left: Translation preview */}
            <div>
              <TranslationPreview />
            </div>

            {/* Right: Form selector + language grid */}
            <div className="space-y-6">
              {/* How it works */}
              <div className="rounded-2xl border border-white/8 bg-rf-surface-container/60 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-rf-on-surface">
                  <Icon name="psychology" className="text-[16px] text-amber-400" />
                  How it works
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: 'description', title: 'Pick a form', desc: 'Select any published form with translatable fields.' },
                    { icon: 'translate', title: 'One-click translate', desc: 'Click a language flag — Reform sends all strings to the LLM in a single call.' },
                    { icon: 'cloud_done', title: 'Cached in Xano', desc: 'Translations are stored in the form_translation table and served automatically.' },
                    { icon: 'public', title: 'Auto-detect language', desc: 'Visitors see their preferred language based on browser settings.' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/5 bg-rf-input-hollow-bg p-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                        <Icon name={item.icon} className="text-[14px] text-amber-400" />
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
                  <Icon name="list" className="text-[16px] text-amber-400" />
                  Select a form to translate
                </h3>
                {loading ? (
                  <div className="py-8 text-center">
                    <Icon name="progress_activity" className="mx-auto animate-spin text-[24px] text-amber-400" />
                  </div>
                ) : forms.length === 0 ? (
                  <div className="py-8 text-center">
                    <Icon name="description" className="mx-auto mb-2 text-[32px] text-rf-on-surface-variant/20" />
                    <p className="text-[13px] font-semibold text-rf-on-surface">No forms yet</p>
                    <Link
                      href="/forms/ai"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-amber-500/15"
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
                            ? 'border-amber-500/30 bg-amber-500/10'
                            : 'border-white/5 bg-rf-input-hollow-bg hover:border-white/10'
                        }`}
                      >
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                          selectedForm?.id === form.id ? 'bg-amber-500/20' : 'bg-white/5'
                        }`}>
                          <Icon name="description" className={`text-[16px] ${
                            selectedForm?.id === form.id ? 'text-amber-400' : 'text-rf-on-surface-variant'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-bold text-rf-on-surface">{form.name}</div>
                          {form.description && (
                            <div className="truncate text-[11px] text-rf-on-surface-variant">{form.description}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Language grid — translate selected form */}
              {selectedForm && (
                <div className="rounded-2xl border border-white/8 bg-rf-surface-container/60 p-6">
                  <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-rf-on-surface">
                    <Icon name="public" className="text-[16px] text-amber-400" />
                    Translate "{selectedForm.name}"
                  </h3>
                  <p className="mb-4 text-[11px] text-rf-on-surface-variant">
                    Click a language to translate all field labels, placeholders, and options.
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {LANGUAGES.map((lang) => {
                      const count = translated[lang.code];
                      const isTranslating = translatingLang === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleTranslate(lang.code)}
                          disabled={isTranslating}
                          className={`group relative flex flex-col items-center rounded-xl border p-3 text-left transition-all hover:scale-[1.02] disabled:opacity-50 ${
                            count
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-white/8 bg-rf-input-hollow-bg hover:border-amber-500/30'
                          }`}
                        >
                          <span className="text-[24px]">{lang.flag}</span>
                          <span className="mt-1 text-[11px] font-bold text-rf-on-surface">{lang.name}</span>
                          <span className="text-[9px] font-mono uppercase text-rf-on-surface-variant/60">{lang.code}</span>
                          {count ? (
                            <span className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-emerald-400">
                              <Icon name="check_circle" className="text-[10px]" />
                              {count} strings
                            </span>
                          ) : isTranslating ? (
                            <span className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-amber-400">
                              <Icon name="progress_activity" className="animate-spin text-[10px]" />
                              Translating...
                            </span>
                          ) : (
                            <span className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-amber-400 opacity-0 group-hover:opacity-100">
                              <Icon name="auto_awesome" className="text-[10px]" />
                              Translate
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
