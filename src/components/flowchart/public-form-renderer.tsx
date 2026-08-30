'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { GeneratedSchema, SchemaField } from '@/lib/flowchart/types';
import { validateSubmission, isFieldVisible } from '@/lib/flowchart/validation-engine';
import { createFieldEventTracker } from '@/lib/analytics/field-event-tracker';

/**
 * PublicFormRenderer
 *
 * Renders a published form from its generated schema. Handles all field
 * types, conditional visibility, and **dynamic validation** — validation
 * rules are read from the form config and evaluated at runtime by the
 * validation engine (not hardcoded).
 *
 * Validation runs both client-side (instant feedback) and server-side
 * (security). Field-level errors are surfaced inline under each field.
 *
 * States: loading → idle → validating → submitting → success / error
 */
export function PublicFormRenderer({
  shareId,
  formName,
  formDescription,
  schema,
}: {
  shareId: string;
  formName: string;
  formDescription?: string;
  schema: GeneratedSchema;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Visible fields — re-evaluated whenever values change (for conditionals)
  const visibleFields = useMemo(
    () => schema.fields.filter((f) => isFieldVisible(f, values)),
    [schema.fields, values]
  );

  // Field-event tracker — sends focus/blur/input/abandon events to Xano
  // for AI drop-off analysis. We use a ref to the tracker + per-field refs
  // so we can attach listeners when each input mounts.
  const trackerRef = useRef<ReturnType<typeof createFieldEventTracker> | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>(new Map());

  useEffect(() => {
    trackerRef.current = createFieldEventTracker(shareId);
  }, [shareId]);

  // Attach the tracker to each rendered input after they mount.
  useEffect(() => {
    if (!trackerRef.current) return;
    for (const [fieldId, el] of inputRefs.current.entries()) {
      trackerRef.current.attach(el, fieldId);
    }
    // attach() is idempotent in practice (addEventListener dedupes) so
    // re-attaching on every visibleFields change is safe.
  }, [visibleFields]);

  const setFieldValue = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error for this field when the user edits it
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const handleBlur = useCallback((fieldId: string) => {
    setTouched((prev) => ({ ...prev, [fieldId]: true }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    // Track submit event for analytics
    trackerRef.current?.trackSubmit();

    // Client-side validation using the dynamic validation engine
    const result = validateSubmission(schema, values);
    if (!result.valid) {
      setErrors(result.errors);
      setTouched(
        Object.keys(result.errors).reduce(
          (acc, id) => ({ ...acc, [id]: true }),
          {} as Record<string, boolean>
        )
      );
      setSubmitting(false);
      return;
    }

    // Submit to the server (which validates again for security)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, data: values }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Server may return field-level errors (422) or a generic error
        if (res.status === 422 && body.errors) {
          setErrors(body.errors);
        } else {
          setSubmitError(body.error ?? `Submission failed (HTTP ${res.status})`);
        }
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Success state ---
  if (submitted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-rf-surface-base p-6">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(0,102,255,0.15), transparent 50%)',
          }}
        />
        <div className="glass-panel relative w-full max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <span className="material-symbols-outlined text-[36px]">
              check_circle
            </span>
          </div>
          <h1 className="mt-4 text-[24px] font-bold text-rf-on-surface">
            Thank You!
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-rf-on-surface-variant">
            Your response has been submitted successfully.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setValues({});
              setErrors({});
              setTouched({});
            }}
            className="mt-6 rounded-lg border border-white/10 bg-rf-surface/50 px-4 py-2 text-[13px] font-semibold text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  // --- Form state ---
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-rf-surface-base p-4 py-12">
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(0,102,255,0.08), transparent 30%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.06), transparent 30%)',
        }}
      />

      <div className="glass-panel relative w-full max-w-[560px] rounded-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rf-primary/10 text-rf-primary">
              <span className="material-symbols-outlined text-[18px]">
                description
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rf-primary">
              Reform
            </span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-rf-on-surface sm:text-[32px]">
            {formName}
          </h1>
          {formDescription && (
            <p className="mt-2 text-[14px] leading-relaxed text-rf-on-surface-variant">
              {formDescription}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {visibleFields.map((field) => (
            <div
              key={field.id}
              ref={(el) => {
                // Register the first input/select/textarea inside this div
                // with the analytics tracker
                if (el) {
                  const input = el.querySelector('input, textarea, select');
                  if (input) {
                    inputRefs.current.set(field.id, input as HTMLInputElement);
                  }
                }
              }}
            >
              <FieldRenderer
                field={field}
                value={values[field.id]}
                error={touched[field.id] ? errors[field.id] : undefined}
                onChange={(v) => setFieldValue(field.id, v)}
                onBlur={() => handleBlur(field.id)}
              />
            </div>
          ))}

          {visibleFields.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-rf-surface/30 p-6 text-center text-[13px] text-rf-on-surface-variant">
              No fields to display.
            </div>
          )}

          {/* Form-level error (network / server errors) */}
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-300">
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-red-400">
                error
              </span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Validation summary if there are errors */}
          {Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-300">
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-amber-400">
                warning
              </span>
              <span>
                Please fix {Object.keys(errors).length} field
                {Object.keys(errors).length > 1 ? 's' : ''} below before
                submitting.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">
              {submitting ? 'progress_activity' : 'send'}
            </span>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * FieldRenderer — renders a single field with its validation error.
 */
function FieldRenderer({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: SchemaField;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
  onBlur: () => void;
}) {
  const baseInput = `w-full rounded-lg border bg-rf-input-hollow-bg px-4 py-3 text-[14px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 transition-all focus:outline-none ${
    error
      ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
      : 'border-rf-border-white-faint focus:border-rf-primary focus:shadow-[0_0_15px_rgba(0,102,255,0.15)]'
  }`;

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">
        {field.label}
        {field.required && <span className="text-rf-primary">*</span>}
      </label>

      {field.type === 'text' && (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={baseInput}
        />
      )}

      {field.type === 'email' && (
        <input
          type="email"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder ?? 'you@example.com'}
          className={baseInput}
        />
      )}

      {field.type === 'password' && (
        <input
          type="password"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={baseInput}
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={baseInput}
        />
      )}

      {field.type === 'tel' && (
        <input
          type="tel"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder ?? '+1 (555) 000-0000'}
          className={baseInput}
        />
      )}

      {field.type === 'url' && (
        <input
          type="url"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder ?? 'https://'}
          className={baseInput}
        />
      )}

      {field.type === 'date' && (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={baseInput}
        />
      )}

      {field.type === 'textarea' && (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          rows={4}
          className={`${baseInput} resize-none`}
        />
      )}

      {field.type === 'dropdown' && (
        <div className="relative">
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`${baseInput} appearance-none pr-10`}
          >
            <option value="">Select…</option>
            {field.options?.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-rf-on-surface-variant">
            expand_more
          </span>
        </div>
      )}

      {field.type === 'radio' && (
        <div className="space-y-2">
          {field.options?.map((opt, i) => (
            <label
              key={i}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-rf-input-hollow-bg px-4 py-2.5 transition-all hover:border-rf-primary/40 ${
                error ? 'border-red-500/30' : 'border-rf-border-white-faint'
              }`}
            >
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={(value as string) === opt}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className="h-4 w-4 accent-rf-primary"
              />
              <span className="text-[14px] text-rf-on-surface">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === 'checkbox' && (
        <div className="space-y-2">
          {field.options?.map((opt, i) => {
            const arr = (value as string[]) ?? [];
            const checked = arr.includes(opt);
            return (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-rf-input-hollow-bg px-4 py-2.5 transition-all hover:border-rf-primary/40 ${
                  error ? 'border-red-500/30' : 'border-rf-border-white-faint'
                }`}
              >
                <input
                  type="checkbox"
                  value={opt}
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...arr, opt]
                      : arr.filter((v) => v !== opt);
                    onChange(next);
                  }}
                  onBlur={onBlur}
                  className="h-4 w-4 accent-rf-primary"
                />
                <span className="text-[14px] text-rf-on-surface">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {field.type === 'rating' && (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onBlur={onBlur}
              className="transition-transform hover:scale-110"
              aria-label={`Rate ${star} out of 5`}
            >
              <span
                className={`material-symbols-outlined text-[28px] ${
                  star <= ((value as number) ?? 0)
                    ? 'text-amber-400'
                    : 'text-rf-on-surface-variant/30'
                }`}
              >
                star
              </span>
            </button>
          ))}
        </div>
      )}

      {field.type === 'file' && (
        <input
          type="file"
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
          onBlur={onBlur}
          className={`${baseInput} file:mr-3 file:rounded file:border-0 file:bg-rf-primary file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white`}
        />
      )}

      {/* Helper text */}
      {field.helperText && !error && (
        <p className="text-[11px] text-rf-on-surface-variant/70">
          {field.helperText}
        </p>
      )}

      {/* Field-level validation error */}
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-red-400">
          <span className="material-symbols-outlined text-[13px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
