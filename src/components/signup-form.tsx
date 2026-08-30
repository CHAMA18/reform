'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * SignUpForm
 *
 * Client component for email/password registration using the real
 * database-backed auth system (POST /api/auth/register).
 * On success, the user is automatically logged in and redirected to /dashboard.
 */
export function SignUpForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const navigateToDashboard = () => {
    try {
      router.push('/dashboard');
    } catch {
      /* fall through */
    }
    const fallback = window.setTimeout(() => {
      if (window.location.pathname !== '/dashboard') {
        window.location.assign('/dashboard');
      }
    }, 500);
    window.addEventListener(
      'beforeunload',
      () => window.clearTimeout(fallback),
      { once: true }
    );
  };

  const handleEmailSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          orgName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Registration successful — session cookie is set automatically
      setSuccess(true);
      navigateToDashboard();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <>
      <form className="grid gap-3" onSubmit={handleEmailSignUp} noValidate>
        <FieldShell label="Full Name">
          <input
            type="text"
            autoComplete="name"
            placeholder="Alex Sterling"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg px-4 py-2.5 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 transition-all duration-300 outline-none focus:border-rf-primary-container focus:shadow-[0_0_15px_rgba(0,102,255,0.2)]"
          />
        </FieldShell>

        <FieldShell label="Work Email">
          <input
            type="email"
            autoComplete="email"
            placeholder="dev@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg px-4 py-2.5 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 transition-all duration-300 outline-none focus:border-rf-primary-container focus:shadow-[0_0_15px_rgba(0,102,255,0.2)]"
          />
        </FieldShell>

        <FieldShell label="Organization (optional)">
          <input
            type="text"
            autoComplete="organization"
            placeholder="Acme Inc."
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg px-4 py-2.5 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 transition-all duration-300 outline-none focus:border-rf-primary-container focus:shadow-[0_0_15px_rgba(0,102,255,0.2)]"
          />
        </FieldShell>

        <FieldShell label="Secure Password">
          <div className="flex items-center overflow-hidden rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg transition-all duration-300 focus-within:border-rf-primary-container focus-within:shadow-[0_0_15px_rgba(0,102,255,0.2)]">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent px-4 py-2.5 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="px-4 text-rf-outline transition-colors hover:text-rf-on-surface"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <AuthIcon name={showPassword ? 'visibility_off' : 'visibility'} />
            </button>
          </div>
        </FieldShell>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[12px] leading-[18px] text-red-300"
          >
            <AuthIcon name="error" className="mt-0.5 text-[16px] text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-[12px] leading-[18px] text-emerald-300"
          >
            <AuthIcon name="check_circle" className="mt-0.5 text-[16px] text-emerald-400" />
            <span>Account created! Redirecting to dashboard…</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-rf-primary-container px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-rf-on-primary-container transition-all active:scale-[0.99] hover:opacity-95 disabled:opacity-60 disabled:cursor-wait"
        >
          {loading ? (
            <>
              <AuthIcon name="progress_activity" className="text-[17px] animate-spin" />
              CREATING ACCOUNT…
            </>
          ) : (
            <>
              CREATE ACCOUNT
              <AuthIcon name="person_add" className="text-[17px]" />
            </>
          )}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-rf-border-white-faint" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rf-outline">
          Or
        </span>
        <div className="h-px flex-1 bg-rf-border-white-faint" />
      </div>

      <a
        href="/api/auth/guest"
        className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-rf-border-white-faint bg-rf-input-hollow-bg px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-rf-on-surface transition-all duration-200 hover:bg-rf-surface-container-highest hover:border-rf-primary-container/40 no-underline"
      >
        <AuthIcon name="person" className="text-[17px] text-rf-primary-container" />
        Sign In As A Guest
      </a>
    </>
  );
}

/* ----------------------------- Local primitives ----------------------------- */

function AuthIcon({
  name,
  className = '',
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="ml-1 block text-[10px] font-semibold uppercase tracking-[0.24em] text-rf-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  );
}
