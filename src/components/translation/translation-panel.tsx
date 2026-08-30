'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/app-shell';

interface TranslationPanelProps {
  formId: string;
}

interface StoredTranslation {
  language: string;
  translations: Record<string, string>;
  created_at: string;
}

const LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
];

type Status = 'idle' | 'loading' | 'translating' | 'success' | 'error';

export function TranslationPanel({ formId }: TranslationPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [existingTranslations, setExistingTranslations] = useState<Record<string, StoredTranslation>>({});
  const [lastTranslated, setLastTranslated] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  const fetchExisting = useCallback(async () => {
    setLoadingExisting(true);
    const fetched: Record<string, StoredTranslation> = {};
    await Promise.all(
      LANGUAGES.map(async (lang) => {
        try {
          const resp = await fetch(`/api/forms/${formId}/translate?lang=${lang.code}`, { cache: 'no-store' });
          if (resp.ok) {
            const data = await resp.json();
            fetched[lang.code] = data;
          }
        } catch {
          // ignore
        }
      })
    );
    setExistingTranslations(fetched);
    setLoadingExisting(false);
  }, [formId]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  async function handleTranslate(languageCode: string) {
    setStatus('translating');
    setError(null);
    setLastTranslated(null);
    try {
      const resp = await fetch(`/api/forms/${formId}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: languageCode }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setLastTranslated(languageCode);
      setStatus('success');
      await fetchExisting();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="translate" className="text-[20px] text-rf-primary" />
            <h2 className="text-[18px] font-bold tracking-tight">AI Auto-Translation</h2>
          </div>
          <p className="mt-1 text-[12px] text-rf-on-surface-variant">
            One-click translate all field labels, placeholders, and options. Cached in Xano and served to respondents based on their browser language.
          </p>
        </div>
      </div>

      {status === 'translating' && (
        <div className="rounded-2xl border border-rf-primary/30 bg-rf-primary/5 p-4">
          <div className="flex items-center gap-3 text-[13px] text-rf-primary">
            <Icon name="progress_activity" className="animate-spin text-[18px]" />
            Translating all field text… (one LLM call)
          </div>
        </div>
      )}

      {status === 'success' && lastTranslated && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3">
            <Icon name="check_circle" className="text-[20px] text-emerald-400" />
            <div>
              <div className="text-[13px] font-semibold text-emerald-300">
                Translated to {LANGUAGES.find((l) => l.code === lastTranslated)?.name}
              </div>
              <p className="text-[11px] text-emerald-300/80">
                Public form will now serve this language based on the visitor&apos;s browser settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <Icon name="error" className="text-[20px] text-red-400" />
            <div>
              <div className="text-[13px] font-semibold text-red-300">Translation failed</div>
              <div className="text-[11px] text-red-300/80">{error}</div>
            </div>
          </div>
        </div>
      )}

      {loadingExisting ? (
        <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-8 text-center">
          <Icon name="progress_activity" className="mx-auto animate-spin text-[24px] text-rf-primary" />
          <p className="mt-2 text-[12px] text-rf-on-surface-variant">Checking existing translations…</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {LANGUAGES.map((lang) => {
            const existing = existingTranslations[lang.code];
            const isTranslated = !!existing;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleTranslate(lang.code)}
                disabled={status === 'translating'}
                className={`group relative rounded-xl border p-4 text-left transition-all hover:scale-[1.02] disabled:opacity-50 ${
                  isTranslated
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-white/10 bg-rf-surface-container/50 hover:border-rf-primary/40'
                }`}
              >
                <div className="text-[24px]">{lang.flag}</div>
                <div className="mt-2 text-[12px] font-bold text-rf-on-surface">{lang.name}</div>
                <div className="mt-0.5 text-[10px] font-mono uppercase text-rf-on-surface-variant">
                  {lang.code}
                </div>
                {isTranslated && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
                    <Icon name="check_circle" className="text-[12px]" />
                    {Object.keys(existing.translations).length} strings
                  </div>
                )}
                {!isTranslated && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-rf-primary opacity-0 group-hover:opacity-100">
                    <Icon name="auto_awesome" className="text-[12px]" />
                    Translate
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <details className="rounded-xl border border-rf-border-white-faint bg-rf-surface-container/30 p-4">
        <summary className="cursor-pointer list-none text-[12px] font-semibold text-rf-on-surface">
          <div className="flex items-center gap-2">
            <Icon name="hub" className="text-[14px] text-rf-primary" />
            How translation works
          </div>
        </summary>
        <p className="mt-3 text-[11px] leading-relaxed text-rf-on-surface-variant">
          When you click a language, Reform collects all translatable strings from the form (labels, placeholders, helper text, dropdown options), sends them in a single LLM call, and stores the translation map in Xano&apos;s <code className="rounded bg-white/5 px-1.5 py-0.5">form_translation</code> table. Each translation is audit-logged via the Xano function <code className="rounded bg-white/5 px-1.5 py-0.5">ai/log_field_suggestion</code>.
        </p>
      </details>
    </div>
  );
}
