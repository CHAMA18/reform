import Link from 'next/link';
import ParticleBackground from '@/components/ParticleBackground';
import { SafeClientBoundary } from '@/components/safe-client-boundary';
import { SignInForm } from '@/components/signin-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Reform',
  description:
    'Access your Reform workspace and continue building secure form infrastructure.',
};

function AuthIcon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`.trim()} aria-hidden="true">
      {name}
    </span>
  );
}

function TrustRow({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rf-border-white-faint bg-rf-input-hollow-bg/40 p-4">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rf-border-white-faint bg-rf-primary-container/10 text-rf-primary">
        <AuthIcon name={icon} className="text-[20px]" />
      </div>
      <div>
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-rf-on-surface">
          {title}
        </h3>
        <p className="mt-1 text-[13px] leading-[21px] text-rf-on-surface-variant">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-rf-surface-base text-rf-on-surface">
      <SafeClientBoundary>
        <ParticleBackground />
      </SafeClientBoundary>
      <div className="auth-procedural-bg" />
      <div className="auth-scanline" />

      <nav className="fixed left-0 top-0 z-50 flex h-[92px] w-full items-center justify-between border-b border-rf-border-white-faint bg-rf-glass-bg px-6 backdrop-blur-[40px]">
        <Link href="/" className="text-[24px] font-bold tracking-tight text-rf-on-surface">
          Reform
        </Link>
        <div className="flex items-center gap-3">
          <a
            className="hidden text-[14px] font-medium text-rf-on-surface-variant transition-colors duration-300 hover:text-rf-primary md:inline-flex"
            href="#support"
          >
            Support
          </a>
          <a
            className="hidden text-[14px] font-medium text-rf-on-surface-variant transition-colors duration-300 hover:text-rf-primary md:inline-flex"
            href="#docs"
          >
            Documentation
          </a>
        </div>
      </nav>

      <main className="relative z-10 mx-auto flex flex-1 w-full max-w-[760px] items-center px-6 pt-[92px] pb-3">
        <section className="w-full">
          <div className="auth-card-shell relative max-h-[calc(100svh-112px)] overflow-hidden rounded-[28px] p-5 shadow-2xl md:p-6">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -left-24 top-6 h-44 w-44 rounded-full bg-rf-primary-container/10 blur-3xl md:h-52 md:w-52" />
              <div className="absolute right-0 top-1/3 h-56 w-56 rounded-full bg-rf-tertiary/10 blur-3xl md:h-64 md:w-64" />
            </div>

            <div className="relative z-10">
              <header className="mb-5 text-center">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-rf-primary">
                  Secure Access
                </p>
                <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-rf-on-surface md:text-[36px] md:leading-[42px]">
                  Sign In
                </h1>
                <p className="mt-2 text-[13px] leading-[21px] text-rf-on-surface-variant md:text-[14px] md:leading-[23px]">
                  Enter your credentials to continue building without
                  breaking your momentum.
                </p>
              </header>

              <SignInForm />

              <div className="mt-5 text-center">
                <p className="text-[13px] leading-[22px] text-rf-on-surface-variant/80">
                  New here?{' '}
                  <Link
                    href="/signup"
                    className="font-semibold text-rf-primary-container underline-offset-4 transition-all hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              </div>

              <div className="auth-terminal absolute bottom-3 right-3 hidden rounded-xl px-3 py-2 opacity-10 xl:block">
                <pre className="text-[11px] leading-[16px] font-mono text-rf-on-surface">
{`$ auth handshake --mode=signin
$ verifying token... [OK]
$ access level... [GRANTED]`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1080px] flex-col items-center justify-between gap-3 px-6 pb-4 text-center opacity-70 lg:flex-row lg:text-left">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rf-on-surface">
          © 2024 Reform. Precision Infrastructure.
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-end">
          <a
            id="support"
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rf-outline transition-colors hover:text-rf-primary"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            id="docs"
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rf-outline transition-colors hover:text-rf-primary"
            href="#"
          >
            Terms of Service
          </a>
          <div className="flex items-center gap-2">
            <span className="auth-status-dot h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rf-outline">
              System Online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
