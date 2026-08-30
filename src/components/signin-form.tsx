'use client';

import { useState, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * SignInForm
 *
 * Client component for email/password login using the real database-backed
 * auth system (POST /api/auth/login). No Supabase dependency.
 */
export function SignInForm() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-8 text-[13px] text-rf-on-surface-variant">Loading…</div>}>
      <SignInFormInner />
    </Suspense>
  );
}

function SignInFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  // Surface auth error codes returned by /api/auth/* as a friendly banner
  // at the top of the form so the user knows why the redirect brought them
  // back here.
  const authErrorParam = searchParams.get('error');
  const authErrorMessage: string | null = (() => {
    switch (authErrorParam) {
      case 'guest_failed':
        return 'Guest sign-in failed. Please try again or use email/password.';
      case 'oauth_failed':
        return 'Authentication failed. Please try again or use email/password.';
      case null:
        return null;
      default:
        return 'Authentication error. Please try again.';
    }
  })();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(authErrorMessage);
  const [success, setSuccess] = useState(false);

  const navigateToDashboard = () => {
    try {
      router.push(redirectTo);
    } catch {
      /* fall through to hard redirect */
    }
    const fallback = window.setTimeout(() => {
      const target = redirectTo.split('?')[0];
      if (!window.location.pathname.startsWith(target)) {
        window.location.assign(redirectTo);
      }
    }, 500);
    window.addEventListener(
      'beforeunload',
      () => window.clearTimeout(fallback),
      { once: true }
    );
  };

  const handleEmailSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setSuccess(true);
      navigateToDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <form className="grid gap-3" onSubmit={handleEmailSignIn} noValidate>
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

        <FieldShell label="Secure Password">
          <div className="flex items-center overflow-hidden rounded-lg border border-rf-border-white-faint bg-rf-input-hollow-bg transition-all duration-300 focus-within:border-rf-primary-container focus-within:shadow-[0_0_15px_rgba(0,102,255,0.2)]">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••••"
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

        <div className="flex items-center justify-between gap-4 pt-1">
          <label className="flex items-center gap-2 text-[12px] font-medium text-rf-on-surface-variant">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-rf-border-white-faint bg-rf-input-hollow-bg text-rf-primary-container accent-rf-primary-container"
            />
            Remember this device
          </label>
          <Link
            href="#"
            className="text-[12px] font-semibold text-rf-primary-container underline-offset-4 transition-all hover:underline"
          >
            Forgot password?
          </Link>
        </div>

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
            <span>Login successful! Redirecting…</span>
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
              SIGNING IN…
            </>
          ) : (
            <>
              SIGN IN
              <AuthIcon name="login" className="text-[17px]" />
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
        href={`/api/auth/guest?redirect=${encodeURIComponent(redirectTo)}`}
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
