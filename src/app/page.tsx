'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SafeClientBoundary } from '@/components/safe-client-boundary';
import ParticleBackground from '@/components/ParticleBackground';
import { useTheme } from 'next-themes';

function MaterialIcon({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`material-symbols-outlined ${className}`.trim()} style={style} aria-hidden="true">{name}</span>
  );
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div
      className={`transition-all duration-700 ease-out ${className} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-2 w-2 rounded-full" style={{ background: 'var(--rf-eyebrow)' }} />
      <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--rf-eyebrow)' }}>
        {children}
      </span>
    </div>
  );
}

function StepNumber({ num }: { num: string }) {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold"
      style={{ background: 'var(--rf-chip-bg)', color: 'var(--rf-chip-fg)' }}
    >
      {num}
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // HYDRATION SAFETY: server + first client render use 'dark' (the default);
  // after mount we follow the real persisted theme so dark/light toggle works.
  useEffect(() => setMounted(true), []);
  const isLight = mounted && resolvedTheme === 'light';

  const accent = isLight ? '#d97706' : '#f59e0b'; // amber (deeper on light for contrast)
  const accentLight = '#fef3c7';
  const accentDark = '#92400e';
  const greenStatus = '#10b981';
  const textColor = isLight ? '#1c1917' : '#f5f5f4';
  const subtextColor = isLight ? '#57534e' : '#a8a29e';
  const bgColor = isLight ? '#fafaf9' : '#0c0a09';
  const cardBg = isLight ? '#ffffff' : '#1c1917';
  const secondaryBg = isLight ? '#f5f5f4' : '#1c1917';
  const borderColor = isLight ? '#e7e5e4' : '#292524';
  const cardShadow = isLight ? '0 16px 44px rgba(28,25,23,0.07)' : 'none';
  const navBg = isLight ? 'rgba(250,250,249,0.85)' : 'rgba(12,10,9,0.8)';
  const toggleTheme = () => setTheme(isLight ? 'dark' : 'light');

  const goToSignin = () => {
    router.push('/signin');
    setTimeout(() => {
      if (window.location.pathname !== '/signin') window.location.assign('/signin');
    }, 500);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: bgColor, color: textColor }}>
      {/* === Animated Background — Three.js particle field + CSS atmosphere === */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SafeClientBoundary>
          <ParticleBackground />
        </SafeClientBoundary>
        {/* Soft amber radial glow keeps the warm brand tint over the field */}
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,158,11,0.05), transparent 70%)',
          }} />
      </div>

      {/* === Navigation === */}
      <nav className="fixed top-0 z-50 w-full border-b backdrop-blur-xl"
        style={{
          background: navBg,
          borderColor,
        }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-0 text-[22px] font-extrabold tracking-tight">
            {/* Flow logo mark only — no wordmark in the landing header */}
            <svg
              viewBox="0 0 64 64"
              className="h-7 w-7 flex-shrink-0"
              role="img"
              aria-label="Reform Logo"
            >
              <defs>
                <linearGradient id="rf-landing-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="rf-landing-grad-2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#rf-landing-grad-2)" opacity="0.45" />
              <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#rf-landing-grad-2)" opacity="0.75" transform="translate(2, 0)" />
              <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#rf-landing-grad)" transform="translate(4, 0)" />
              <g transform="translate(32, 32)" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <line x1="-22" y1="-10" x2="-6" y2="-10" />
                <line x1="-22" y1="0"   x2="-6" y2="0" />
                <line x1="-22" y1="10"  x2="-6" y2="10" />
                <line x1="-6" y1="0" x2="20" y2="0" />
                <polyline points="14,-6 22,0 14,6" fill="none" />
              </g>
            </svg>
          </div>
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-[14px] font-medium transition-colors hover:opacity-60" style={{ color: textColor }}>Features</a>
            <a href="#how" className="text-[14px] font-medium transition-colors hover:opacity-60" style={{ color: textColor }}>How It Works</a>
            <a href="#pricing" className="text-[14px] font-medium transition-colors hover:opacity-60" style={{ color: textColor }}>Pricing</a>
            <a href="#api" className="text-[14px] font-medium transition-colors hover:opacity-60" style={{ color: textColor }}>API</a>
            <Link href="/docs/api" className="text-[14px] font-medium transition-colors hover:opacity-60" style={{ color: textColor }}>Docs</Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'} title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className="flex h-9 w-9 items-center justify-center rounded-full border transition-all hover:opacity-75 active:scale-95"
              style={{ borderColor, color: subtextColor }}>
              <MaterialIcon name={isLight ? 'dark_mode' : 'light_mode'} className="text-[17px]" />
            </button>
            <button onClick={goToSignin} className="hidden sm:block text-[14px] font-medium transition-opacity hover:opacity-60" style={{ color: subtextColor }}>
              Sign In
            </button>
            <button onClick={() => router.push('/signup')}
              className="rounded-lg px-5 py-2 text-[14px] font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: textColor, color: bgColor }}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* === Hero === */}
      <section className="relative z-10 px-6 pt-36 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
            {/* Left: Copy */}
            <Reveal>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium"
                  style={{ borderColor, background: secondaryBg, color: subtextColor }}>
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: greenStatus }} />
                  Dynamic form builder engine
                </div>
                <h1 className="text-[42px] font-extrabold leading-[1.1] tracking-tight sm:text-[56px] md:text-[64px]">
                  Forms that think
                  <br />
                  <span style={{ color: accent }}>dynamically.</span>
                </h1>
                <p className="mt-6 max-w-xl text-[17px] leading-relaxed" style={{ color: subtextColor }}>
                  Design forms with a visual flowchart editor. Validate responses
                  with config-driven rules. Deploy with a shareable link. Integrate
                  via REST API. All in one platform.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => router.push('/signup')}
                    className="flex items-center gap-2 rounded-lg px-6 py-3 text-[15px] font-bold transition-all hover:opacity-90 active:scale-95"
                    style={{ background: textColor, color: bgColor }}>
                    Start Building Free
                    <MaterialIcon name="arrow_forward" className="text-[18px]" />
                  </button>
                  <button onClick={() => router.push('/templates')}
                    className="flex items-center gap-2 rounded-lg border px-6 py-3 text-[15px] font-bold transition-all hover:opacity-80"
                    style={{ borderColor, background: 'transparent', color: textColor }}>
                    <MaterialIcon name="auto_awesome" className="text-[18px]" style={{ color: accent }} />
                    Browse Templates
                  </button>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px]" style={{ color: subtextColor }}>
                  {['No code required', '13 field types', 'Dynamic validation', 'REST API included', 'PostgreSQL backed'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <MaterialIcon name="check" className="text-[14px]" style={{ color: greenStatus }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Right: Visual cards */}
            <Reveal delay={200}>
              <div className="relative">
                {/* Card 1: Builder preview */}
                <div className="rounded-xl border p-5 transition-all hover:shadow-lg"
                  style={{ borderColor, background: cardBg, boxShadow: cardShadow }}>
                  <Eyebrow>Flowchart Builder</Eyebrow>
                  <div className="mb-3 text-[16px] font-bold" style={{ color: textColor }}>Drag. Connect. Deploy.</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: subtextColor }}>
                    Visual node editor with 5 node types, 13 field types, and conditional logic branches.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <StepNumber num="01" />
                    <span className="text-[12px] font-medium" style={{ color: subtextColor }}>Start → Field → Submit → End</span>
                  </div>
                </div>
                {/* Card 2: Validation preview — overlaps */}
                <div className="mt-[-12px] ml-8 rounded-xl border p-5 transition-all hover:shadow-lg"
                  style={{ borderColor, background: cardBg, boxShadow: cardShadow }}>
                  <Eyebrow>Dynamic Validation</Eyebrow>
                  <div className="mb-3 text-[16px] font-bold" style={{ color: textColor }}>Rules from config, not code.</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: subtextColor }}>
                    Zod-powered engine reads rules from the form config at runtime. Required, min/max, regex, dates.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['required', 'minLength', 'pattern', 'max', 'enum'].map((tag) => (
                      <span key={tag} className="rounded px-2 py-0.5 font-mono text-[10px] font-medium"
                        style={{ background: accentLight, color: accentDark }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* === Demo Video === */}
      <section className="relative z-10 px-6 py-20" id="demo">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h2 className="text-[32px] font-extrabold tracking-tight sm:text-[40px]" style={{ color: textColor }}>
              See the platform in action
            </h2>
            <p className="mt-3 text-[15px]" style={{ color: subtextColor }}>
              90-second product demo — AI form generation, visual builder, submission insights, and the Xano backend.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor, background: cardBg }}>
            <video
              src="/reform-demo.mp4"
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full"
              style={{ display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* === Stats Band === */}
      <section className="relative z-10 border-y" style={{ borderColor, background: secondaryBg }}>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 py-12 md:grid-cols-4">
          {[
            { value: '13', label: 'Field Types', icon: 'input' },
            { value: '22', label: 'Tour Steps', icon: 'tour' },
            { value: '6', label: 'Starter Templates', icon: 'auto_awesome' },
            { value: '100%', label: 'Dynamic Validation', icon: 'verified' },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80}>
              <div className="flex flex-col items-center text-center">
                <MaterialIcon name={stat.icon} className="mb-2 text-[28px]" style={{ color: accent }} />
                <div className="text-[36px] font-extrabold tracking-tight" style={{ color: textColor }}>{stat.value}</div>
                <div className="text-[12px] uppercase tracking-wider" style={{ color: subtextColor }}>{stat.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* === Features === */}
      <section id="features" className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-16 text-center">
              <Eyebrow>Capabilities</Eyebrow>
              <h2 className="text-[36px] font-extrabold tracking-tight sm:text-[48px]" style={{ color: textColor }}>Everything you need to build</h2>
              <p className="mx-auto mt-4 max-w-2xl text-[16px]" style={{ color: subtextColor }}>
                From visual form design to API integration, the platform covers the entire lifecycle.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { num: '01', icon: 'schema', title: 'Visual Flowchart Builder', desc: 'Design forms with a drag-and-drop node editor. Connect fields, add conditions, and define validation rules visually — no code needed.', tags: ['Canvas', 'Nodes', 'Edges'] },
              { num: '02', icon: 'verified', title: 'Dynamic Validation Engine', desc: 'Validation rules stored in form config, evaluated at runtime using Zod. Change rules without redeploying. Client + server validation in one engine.', tags: ['Zod', 'Runtime', 'Isomorphic'] },
              { num: '03', icon: 'alt_route', title: 'Conditional Logic', desc: 'Branch form flow based on field values. Show or hide fields dynamically. True/false condition paths with green and red handles.', tags: ['Branching', 'Conditions'] },
              { num: '04', icon: 'api', title: 'REST API v1', desc: 'Full programmatic access with API key authentication. Create forms, submit responses, and retrieve submissions via clean REST endpoints.', tags: ['REST', 'Keys', 'Scopes'] },
              { num: '05', icon: 'vpn_key', title: 'Rotatable API Keys', desc: 'SHA-256 hashed at rest. Scoped permissions. Rotate or revoke instantly without downtime. Full key shown once at creation.', tags: ['SHA-256', 'Rotation', 'Scopes'] },
              { num: '06', icon: 'share', title: 'Shareable Links', desc: 'Publish a form and get a shareable URL instantly. Send it to anyone. Responses appear in your submissions dashboard in real time.', tags: ['Links', 'Public', 'Real-time'] },
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 60}>
                <div className="group h-full rounded-xl border p-6 transition-all hover:shadow-lg"
                  style={{ borderColor, background: cardBg, boxShadow: cardShadow }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg"
                      style={{ background: accentLight }}>
                      <MaterialIcon name={feature.icon} className="text-[22px]" style={{ color: accentDark }} />
                    </div>
                    <StepNumber num={feature.num} />
                  </div>
                  <h3 className="mb-2 text-[18px] font-bold tracking-tight" style={{ color: textColor }}>{feature.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: subtextColor }}>{feature.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {feature.tags.map((tag) => (
                      <span key={tag} className="rounded px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: secondaryBg, color: subtextColor }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* === How It Works === */}
      <section id="how" className="relative z-10 px-6 py-24" style={{ background: secondaryBg }}>
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-16 text-center">
              <Eyebrow>Workflow</Eyebrow>
              <h2 className="text-[36px] font-extrabold tracking-tight sm:text-[48px]" style={{ color: textColor }}>From idea to deployment in 4 steps</h2>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-4">
            {[
              { step: '01', icon: 'add_circle', title: 'Design', desc: 'Open the visual builder and drag nodes onto the canvas. Add fields, connect them, and set conditions.' },
              { step: '02', icon: 'rule', title: 'Validate', desc: 'Configure validation rules per field — required, min/max length, regex patterns, date ranges, enum values.' },
              { step: '03', icon: 'rocket_launch', title: 'Publish', desc: 'Click Deploy Schema. Get a shareable link instantly. The JSON schema is generated and stored automatically.' },
              { step: '04', icon: 'analytics', title: 'Collect', desc: 'Share the link. Watch submissions arrive in real time on your dashboard. Export or query via the REST API.' },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 100}>
                <div className="relative h-full rounded-xl border p-6" style={{ borderColor, background: cardBg, boxShadow: cardShadow }}>
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded text-[12px] font-bold"
                    style={{ background: accent, color: '#fff' }}>
                    {item.step}
                  </div>
                  <MaterialIcon name={item.icon} className="mb-3 text-[26px]" style={{ color: accent }} />
                  <h3 className="mb-2 text-[18px] font-bold" style={{ color: textColor }}>{item.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: subtextColor }}>{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* === API Code Preview === */}
      <section id="api" className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <Reveal>
              <div>
                <Eyebrow>Developer API</Eyebrow>
                <h2 className="text-[36px] font-extrabold tracking-tight sm:text-[44px]" style={{ color: textColor }}>Integrate with anything</h2>
                <p className="mt-4 text-[16px] leading-relaxed" style={{ color: subtextColor }}>
                  Every feature is accessible via a clean REST API. Create forms
                  programmatically, submit responses from your backend, and retrieve
                  submissions with pagination. API keys are scoped and rotatable.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    'Scoped permissions: forms:read, forms:write, submissions:read, submissions:write',
                    'SHA-256 hashed keys — full key shown once at creation',
                    'Rotate keys instantly without downtime',
                    'Full interactive docs at /docs/api',
                  ].map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <MaterialIcon name="check" className="mt-0.5 text-[16px]" style={{ color: greenStatus }} />
                      <span className="text-[14px]" style={{ color: subtextColor }}>{point}</span>
                    </div>
                  ))}
                </div>
                <Link href="/docs/api" className="mt-8 inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-[14px] font-bold transition-all hover:opacity-80"
                  style={{ borderColor, background: secondaryBg, color: textColor }}>
                  <MaterialIcon name="code" className="text-[18px]" style={{ color: accent }} />
                  View API Documentation
                </Link>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="overflow-hidden rounded-xl border" style={{ borderColor }}>
                <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor, background: secondaryBg }}>
                  <span className="h-3 w-3 rounded-full" style={{ background: '#ef4444', opacity: 0.6 }} />
                  <span className="h-3 w-3 rounded-full" style={{ background: '#f59e0b', opacity: 0.6 }} />
                  <span className="h-3 w-3 rounded-full" style={{ background: '#10b981', opacity: 0.7 }} />
                  <span className="ml-3 text-[12px] font-mono" style={{ color: subtextColor }}>terminal</span>
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed" style={{ background: '#0c0a09' }}>
                  <code><span style={{ color: '#10b981' }}>curl</span> <span style={{ color: accent }}>-X POST</span> \
{'  '}https://reform.onrender.com/api/v1/forms \
{'  '}<span style={{ color: accent }}>-H</span> <span style={{ color: '#ef4444' }}>&quot;Authorization: Bearer fep_live_...&quot;</span> \
{'  '}<span style={{ color: accent }}>-H</span> <span style={{ color: '#ef4444' }}>&quot;Content-Type: application/json&quot;</span> \
{'  '}<span style={{ color: accent }}>-d</span> <span style={{ color: '#ef4444' }}>&apos;{`{&quot;name&quot;:&quot;Survey&quot;,&quot;flowchart&quot;:{...}}`}&apos;</span>

<span style={{ color: subtextColor }}># Response (201 Created)</span>
{`{`}
{'  '}<span style={{ color: '#06b6d4' }}>&quot;id&quot;</span>: <span style={{ color: '#ef4444' }}>&quot;clk...&quot;</span>,
{'  '}<span style={{ color: '#06b6d4' }}>&quot;shareId&quot;</span>: <span style={{ color: '#ef4444' }}>&quot;cmqv...&quot;</span>,
{'  '}<span style={{ color: '#06b6d4' }}>&quot;name&quot;</span>: <span style={{ color: '#ef4444' }}>&quot;Survey&quot;</span>,
{'  '}<span style={{ color: '#06b6d4' }}>&quot;status&quot;</span>: <span style={{ color: '#ef4444' }}>&quot;published&quot;</span>
{`}`}</code>
                </pre>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* === Pricing === */}
      <section id="pricing" className="relative z-10 px-6 py-24" style={{ background: secondaryBg }}>
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-16 text-center">
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="text-[36px] font-extrabold tracking-tight sm:text-[48px]" style={{ color: textColor }}>Simple, transparent pricing</h2>
              <p className="mx-auto mt-4 max-w-2xl text-[16px]" style={{ color: subtextColor }}>
                Start free. Upgrade when you need more. No hidden fees.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: 'Starter', price: '$0', period: '/mo', desc: 'For getting started', features: ['Unlimited forms', 'Unlimited submissions', 'Visual builder', 'REST API access', '1 API key', 'Community support'], cta: 'Start Free', highlight: false },
              { name: 'Engine', price: '$0', period: '/mo', desc: 'For growing teams', features: ['Everything in Starter', 'Unlimited API keys', 'Key rotation', 'Priority support', 'Custom domains', 'Webhook integrations'], cta: 'Get Started', highlight: true },
              { name: 'Enterprise', price: 'Custom', period: '', desc: 'For large organizations', features: ['Everything in Engine', 'SSO / SAML', 'Dedicated infrastructure', 'Custom SLAs', 'Audit logs', 'Dedicated architect'], cta: 'Talk to Sales', highlight: false },
            ].map((plan, i) => (
              <Reveal key={plan.name} delay={i * 80}>
                <div className="relative h-full overflow-hidden rounded-xl border p-8 transition-all hover:shadow-lg"
                  style={{
                    borderColor: plan.highlight ? accent : borderColor,
                    background: cardBg,
                    boxShadow: plan.highlight ? `0 4px 20px ${accent}20` : cardShadow,
                  }}>
                  {plan.highlight && (
                    <div className="absolute top-0 right-0 rounded-bl-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ background: accent }}>
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-[22px] font-bold" style={{ color: textColor }}>{plan.name}</h3>
                  <p className="mt-1 text-[13px]" style={{ color: subtextColor }}>{plan.desc}</p>
                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-[44px] font-extrabold tracking-tight" style={{ color: textColor }}>{plan.price}</span>
                    <span className="mb-2 text-[14px]" style={{ color: subtextColor }}>{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[14px]">
                        <MaterialIcon name="check" className="mt-0.5 text-[16px]" style={{ color: greenStatus }} />
                        <span style={{ color: subtextColor }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => router.push('/signup')}
                    className="mt-8 w-full rounded-lg py-3 text-[14px] font-bold transition-all hover:opacity-90 active:scale-95"
                    style={plan.highlight
                      ? { background: accent, color: '#fff' }
                      : { background: textColor, color: bgColor }}>
                    {plan.cta}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* === Final CTA === */}
      <section className="relative z-10 px-6 py-24">
        <Reveal>
          <div className="mx-auto max-w-4xl rounded-2xl border p-12 text-center"
            style={{ borderColor, background: secondaryBg }}>
            <Eyebrow>Get Started</Eyebrow>
            <h2 className="text-[36px] font-extrabold tracking-tight sm:text-[48px]" style={{ color: textColor }}>
              Ready to build something amazing?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[16px]" style={{ color: subtextColor }}>
              Join the next generation of form builders. Design dynamic forms with a
              visual editor, validate with config-driven rules, and deploy in seconds.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => router.push('/signup')}
                className="flex items-center gap-2 rounded-lg px-8 py-3.5 text-[15px] font-bold transition-all hover:opacity-90 active:scale-95"
                style={{ background: textColor, color: bgColor }}>
                Create Your Account
                <MaterialIcon name="arrow_forward" className="text-[18px]" />
              </button>
              <button onClick={goToSignin}
                className="rounded-lg border px-8 py-3.5 text-[15px] font-bold transition-all hover:opacity-80"
                style={{ borderColor, color: textColor }}>
                Sign In
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* === Footer === */}
      <footer className="relative z-10 border-t px-6 py-12" style={{ borderColor, background: secondaryBg }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-0 text-[20px] font-extrabold tracking-tight" style={{ color: textColor }}>
                {/* Flow logo mark only — no wordmark in the footer */}
                <svg
                  viewBox="0 0 64 64"
                  className="h-6 w-6 flex-shrink-0"
                  role="img"
                  aria-label="Reform Logo"
                >
                  <defs>
                    <linearGradient id="rf-footer-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="rf-footer-grad-2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#rf-footer-grad-2)" opacity="0.45" />
                  <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#rf-footer-grad-2)" opacity="0.75" transform="translate(2, 0)" />
                  <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#rf-footer-grad)" transform="translate(4, 0)" />
                  <g transform="translate(32, 32)" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none">
                    <line x1="-22" y1="-10" x2="-6" y2="-10" />
                    <line x1="-22" y1="0"   x2="-6" y2="0" />
                    <line x1="-22" y1="10"  x2="-6" y2="10" />
                    <line x1="-6" y1="0" x2="20" y2="0" />
                    <polyline points="14,-6 22,0 14,6" fill="none" />
                  </g>
                </svg>
              </div>
              <p className="mt-2 text-[12px]" style={{ color: subtextColor }}>
                The world&apos;s most advanced dynamic form builder engine.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: subtextColor }}>Product</h4>
              <ul className="space-y-2 text-[13px]">
                <li><a href="#features" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Features</a></li>
                <li><a href="#pricing" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Pricing</a></li>
                <li><Link href="/templates" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Templates</Link></li>
                <li><Link href="/docs/api" className="transition-colors hover:opacity-60" style={{ color: textColor }}>API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: subtextColor }}>Company</h4>
              <ul className="space-y-2 text-[13px]">
                <li><a href="#" className="transition-colors hover:opacity-60" style={{ color: textColor }}>About</a></li>
                <li><a href="#" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Blog</a></li>
                <li><a href="#" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Careers</a></li>
                <li><a href="#" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: subtextColor }}>Legal</h4>
              <ul className="space-y-2 text-[13px]">
                <li><a href="#" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Privacy Policy</a></li>
                <li><a href="#" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Terms of Service</a></li>
                <li><a href="#" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Security</a></li>
                <li><a href="#" className="transition-colors hover:opacity-60" style={{ color: textColor }}>Status</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row" style={{ borderColor }}>
            <p className="text-[12px]" style={{ color: subtextColor }}>© 2026. Built with precision.</p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: greenStatus }} />
              <span className="text-[12px] font-medium" style={{ color: subtextColor }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
