import Link from 'next/link';
import ParticleBackground from '@/components/ParticleBackground';
import { SafeClientBoundary } from '@/components/safe-client-boundary';
import { SignUpForm } from '@/components/signup-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Reform',
  description:
    'Create your Reform workspace and deploy secure form infrastructure in seconds.',
};

export default function SignupPage() {
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
          <div className="auth-card-shell relative max-h-[calc(100svh-112px)] overflow-hidden rounded-[28px] p-5 shadow-2xl md:p-7">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -left-24 top-6 h-44 w-44 rounded-full bg-rf-primary-container/10 blur-3xl md:h-52 md:w-52" />
              <div className="absolute right-0 top-1/3 h-56 w-56 rounded-full bg-rf-tertiary/10 blur-3xl md:h-64 md:w-64" />
            </div>

            <div className="relative z-10">
              <header className="mb-5 text-center md:text-left">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-rf-primary">
                  Secure Onboarding
                </p>
                <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-rf-on-surface md:text-[36px] md:leading-[42px]">
                  Create Infrastructure
                </h1>
                <p className="mt-2 max-w-xl text-[13px] leading-[21px] text-rf-on-surface-variant md:text-[14px] md:leading-[23px]">
                  Deploy your secure forms environment in seconds.
                </p>
              </header>

              <SignUpForm />

              <div className="mt-5 text-center md:mt-6">
                <p className="text-[13px] leading-[22px] text-rf-on-surface-variant/80">
                  Already part of the network?{' '}
                  <Link
                    href="/signin"
                    className="font-semibold text-rf-primary-container underline-offset-4 transition-all hover:underline"
                  >
                    Login
                  </Link>
                </p>
              </div>

              <div className="auth-terminal absolute bottom-3 right-3 hidden rounded-xl px-3 py-2 opacity-10 xl:block">
                <pre className="text-[11px] leading-[16px] font-mono text-rf-on-surface">
{`$ init account_deploy --target=PRO
$ verifying keys... [OK]
$ spinning up node... [OK]`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-[740px] flex-col items-center justify-between gap-3 px-6 pb-4 text-center opacity-70 md:flex-row md:text-left">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rf-on-surface">
          © 2024 Reform. Precision Infrastructure.
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
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
