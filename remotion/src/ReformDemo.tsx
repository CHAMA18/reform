/**
 * ReformDemo — 90-second product demo video
 *
 * Built with Remotion. Uses actual screenshots from the Reform app.
 *
 * Story arc:
 *   0-8s   : The Problem — "Every business relies on 7 tools..."
 *   8-15s  : The Solution — "Reform. One AI-native platform."
 *   15-25s : AI Form Generator — "Type a prompt. Get a form."
 *   25-35s : Dashboard — "Your entire form portfolio, at a glance."
 *   35-45s : Flowchart Builder — "Drag, connect, deploy."
 *   45-55s : Submissions + Insights — "AI summarises 200 submissions in 3 bullets."
 *   55-65s : API Keys + Developer Platform — "Full REST API. Programmatic access."
 *   65-75s : Xano Backend — "12 tables. 6 function stacks. 1 backend."
 *   75-90s : Closing — "Reform. $99/mo instead of $485. Built on Xano."
 *
 * Render with:
 *   npx remotion render ReformDemo out/reform-demo.mp4
 */
import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Easing,
  Series,
  interpolateColors,
} from 'remotion';

// Import screenshots
import landingImg from './screenshots/01-landing.png';
import signinImg from './screenshots/02-signin.png';
import aiGeneratorImg from './screenshots/03-ai-generator.png';
import dashboardImg from './screenshots/04-dashboard.png';
import builderImg from './screenshots/05-builder.png';
import submissionsImg from './screenshots/06-submissions.png';
import apiKeysImg from './screenshots/07-api-keys.png';
import settingsImg from './screenshots/08-settings.png';

// Brand colors
const AMBER = '#f59e0b';
const AMBER_DARK = '#d97706';
const AMBER_DEEP = '#92400e';
const DARK_BG = '#0c0a09';
const DARK_SURFACE = '#1c1917';
const WHITE = '#ffffff';
const MUTED = '#a8a29e';

// Helper: fade in + out
const fadeInOut = (frame: number, duration: number, fadeIn = 15, fadeOut = 15) => {
  const opacity = interpolate(
    frame,
    [0, fadeIn, duration - fadeOut, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return opacity;
};

// Helper: slide in from bottom
const slideUp = (frame: number, delay = 0, distance = 50) => {
  const y = interpolate(frame - delay, [0, 20], [distance, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return y;
};

// Helper: scale in
const scaleIn = (frame: number, delay = 0) => {
  const scale = interpolate(frame - delay, [0, 25], [0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return scale;
};

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

// --- Scene 1: The Problem (0-8s, frames 0-240) ---
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tools = [
    { name: 'Typeform', cost: '$99', delay: 15 },
    { name: 'Zapier', cost: '$49', delay: 30 },
    { name: 'Airtable', cost: '$20', delay: 45 },
    { name: 'Metabase', cost: '$85', delay: 60 },
    { name: 'Customer.io', cost: '$150', delay: 75 },
    { name: 'Hotjar', cost: '$32', delay: 90 },
    { name: 'Localize', cost: '$50', delay: 105 },
  ];

  const totalCost = '$485';
  const reformCost = '$99';

  const titleOpacity = fadeInOut(frame, 240, 20, 30);
  const totalScale = spring({ frame: frame - 140, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center' }}>
      {/* Title */}
      <div style={{ opacity: titleOpacity, textAlign: 'center', marginBottom: 60 }}>
        <h1 style={{ fontSize: 64, fontWeight: 800, color: WHITE, letterSpacing: '-0.02em' }}>
          Every business relies on <span style={{ color: AMBER }}>7 tools</span>
        </h1>
        <p style={{ fontSize: 28, color: MUTED, marginTop: 16 }}>
          Form builders. Workflow engines. Dashboards. Analytics. Email. UX. Translation.
        </p>
      </div>

      {/* Tool list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {tools.map((tool, i) => {
          const toolOpacity = fadeInOut(frame - tool.delay, 120, 10, 80);
          const toolY = slideUp(frame, tool.delay, 30);
          return (
            <div
              key={tool.name}
              style={{
                opacity: toolOpacity,
                transform: `translateY(${toolY}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 32,
                padding: '12px 40px',
                borderRadius: 12,
                backgroundColor: DARK_SURFACE,
                border: '1px solid rgba(255,255,255,0.08)',
                width: 500,
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 600, color: WHITE }}>{tool.name}</span>
              <span style={{ fontSize: 24, color: '#ef4444', fontWeight: 700 }}>{tool.cost}/mo</span>
            </div>
          );
        })}

        {/* Total cost */}
        <div
          style={{
            opacity: totalScale,
            transform: `scale(${totalScale})`,
            marginTop: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <span style={{ fontSize: 36, fontWeight: 700, color: MUTED }}>Total:</span>
          <span style={{ fontSize: 64, fontWeight: 900, color: '#ef4444' }}>{totalCost}</span>
          <span style={{ fontSize: 28, color: MUTED }}>/month</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Scene 2: The Solution (8-15s, frames 240-450) ---
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 10, stiffness: 80 } });
  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const costOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const xanoOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center' }}>
      {/* Flow logo animation */}
      <div style={{ transform: `scale(${titleSpring * 1.5})`, marginBottom: 40, opacity: titleSpring }}>
        <svg viewBox="0 0 64 64" width="120" height="120">
          <defs>
            <linearGradient id="demo-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="demo-grad-2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#demo-grad-2)" opacity="0.45" />
          <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#demo-grad-2)" opacity="0.75" transform="translate(2, 0)" />
          <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#demo-grad)" transform="translate(4, 0)" />
          <g transform="translate(32, 32)" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <line x1="-22" y1="-10" x2="-6" y2="-10" />
            <line x1="-22" y1="0" x2="-6" y2="0" />
            <line x1="-22" y1="10" x2="-6" y2="10" />
            <line x1="-6" y1="0" x2="20" y2="0" />
            <polyline points="14,-6 22,0 14,6" fill="none" />
          </g>
        </svg>
      </div>

      <h1 style={{ fontSize: 80, fontWeight: 900, color: WHITE, letterSpacing: '-0.03em', opacity: titleSpring, transform: `scale(${titleSpring})` }}>
        Reform
      </h1>

      <p style={{ fontSize: 32, color: AMBER, marginTop: 16, opacity: subtitleOpacity, textAlign: 'center' }}>
        One AI-native platform.<br />
        Replaces all seven.
      </p>

      <div style={{ opacity: costOpacity, marginTop: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 28, color: MUTED, textDecoration: 'line-through' }}>$485/mo</span>
        <span style={{ fontSize: 28, color: MUTED }}>→</span>
        <span style={{ fontSize: 56, fontWeight: 900, color: AMBER }}>$99</span>
        <span style={{ fontSize: 28, color: MUTED }}>/mo</span>
      </div>

      <div style={{ opacity: xanoOpacity, marginTop: 24 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: AMBER_DEEP, backgroundColor: 'rgba(245,158,11,0.1)', padding: '8px 24px', borderRadius: 999, border: '1px solid rgba(245,158,11,0.3)' }}>
          ⚡ Powered by Xano
        </span>
      </div>
    </AbsoluteFill>
  );
};

// --- Generic screen showcase scene ---
const ScreenShowcase: React.FC<{
  img: string;
  title: string;
  subtitle: string;
  feature?: string;
  delay?: number;
}> = ({ img, title, subtitle, feature, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - delay - 5, fps, config: { damping: 12 } });
  const subtitleOpacity = interpolate(frame - delay, [15, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const screenshotScale = interpolate(frame - delay, [10, 40], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const screenshotOpacity = interpolate(frame - delay, [10, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const featureBadgeSpring = spring({ frame: frame - delay - 25, fps, config: { damping: 14 } });

  const exitOpacity = interpolate(frame - delay, [200, 230], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK_BG, opacity: exitOpacity }}>
      {/* Title + subtitle at top */}
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', opacity: titleSpring, zIndex: 10 }}>
        {feature && (
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: 999,
            backgroundColor: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.4)',
            marginBottom: 16,
            transform: `scale(${featureBadgeSpring})`,
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: AMBER, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {feature}
            </span>
          </div>
        )}
        <h2 style={{ fontSize: 48, fontWeight: 800, color: WHITE, letterSpacing: '-0.02em', margin: 0 }}>
          {title}
        </h2>
        <p style={{ fontSize: 24, color: MUTED, marginTop: 8, opacity: subtitleOpacity }}>
          {subtitle}
        </p>
      </div>

      {/* Screenshot */}
      <div style={{
        position: 'absolute',
        top: 200,
        left: '50%',
        transform: `translateX(-50%) scale(${screenshotScale})`,
        opacity: screenshotOpacity,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        width: 1280,
        height: 720,
      }}>
        <Img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </AbsoluteFill>
  );
};

// --- Xano Architecture Scene (65-75s) ---
const XanoScene: React.FC = () => {
  const frame = useCurrentFrame();

  const stats = [
    { label: 'Tables', value: '12', delay: 0 },
    { label: 'Function Stacks', value: '6', delay: 15 },
    { label: 'API Endpoints', value: '6', delay: 30 },
    { label: 'Scheduled Tasks', value: '1', delay: 45 },
    { label: 'Audit Log Entries', value: '8+', delay: 60 },
  ];

  const titleOpacity = fadeInOut(frame, 300, 15, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity: titleOpacity, textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          padding: '8px 24px',
          borderRadius: 999,
          backgroundColor: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.4)',
          marginBottom: 32,
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: AMBER, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            ⚡ Xano Backend
          </span>
        </div>

        <h2 style={{ fontSize: 56, fontWeight: 900, color: WHITE, marginBottom: 48 }}>
          The backend is the brain
        </h2>

        <div style={{ display: 'flex', gap: 40, justifyContent: 'center' }}>
          {stats.map((stat) => {
            const statOpacity = fadeInOut(frame - stat.delay, 250, 10, 60);
            const statY = slideUp(frame, stat.delay, 40);
            return (
              <div key={stat.label} style={{ opacity: statOpacity, transform: `translateY(${statY}px)`, textAlign: 'center' }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: AMBER }}>{stat.value}</div>
                <div style={{ fontSize: 20, color: MUTED, marginTop: 8 }}>{stat.label}</div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 24, color: MUTED, marginTop: 48, maxWidth: 800, lineHeight: 1.6 }}>
          Every AI call flows through Xano function stacks.<br />
          Every submission is stored in Xano tables.<br />
          Every audit entry is queryable via the public REST API.
        </p>
      </div>
    </AbsoluteFill>
  );
};

// --- Closing Scene (75-90s) ---
const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame: frame - 10, fps, config: { damping: 10, stiffness: 60 } });
  const taglineOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urlOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const xanoOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center' }}>
      {/* Flow logo */}
      <div style={{ transform: `scale(${logoSpring * 2})`, marginBottom: 40, opacity: logoSpring }}>
        <svg viewBox="0 0 64 64" width="160" height="160">
          <defs>
            <linearGradient id="close-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="close-grad-2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#close-grad-2)" opacity="0.45" />
          <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#close-grad-2)" opacity="0.75" transform="translate(2, 0)" />
          <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#close-grad)" transform="translate(4, 0)" />
          <g transform="translate(32, 32)" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <line x1="-22" y1="-10" x2="-6" y2="-10" />
            <line x1="-22" y1="0" x2="-6" y2="0" />
            <line x1="-22" y1="10" x2="-6" y2="10" />
            <line x1="-6" y1="0" x2="20" y2="0" />
            <polyline points="14,-6 22,0 14,6" fill="none" />
          </g>
        </svg>
      </div>

      <h1 style={{ fontSize: 80, fontWeight: 900, color: WHITE, letterSpacing: '-0.03em', opacity: logoSpring, transform: `scale(${logoSpring})` }}>
        Reform
      </h1>

      <p style={{ fontSize: 32, color: AMBER, marginTop: 24, opacity: taglineOpacity, textAlign: 'center' }}>
        7 tools. 1 AI-native platform.<br />
        $99/mo instead of $485.
      </p>

      <div style={{ opacity: urlOpacity, marginTop: 40 }}>
        <span style={{ fontSize: 24, color: MUTED, fontFamily: 'monospace' }}>
          reform-oxbp.onrender.com
        </span>
      </div>

      <div style={{ opacity: xanoOpacity, marginTop: 24 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: AMBER_DEEP, backgroundColor: 'rgba(245,158,11,0.1)', padding: '8px 24px', borderRadius: 999, border: '1px solid rgba(245,158,11,0.3)' }}>
          ⚡ Built on Xano · Xano Hackathon 2026
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// MAIN COMPOSITION
// ============================================================================

export const ReformDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: DARK_BG }}>
      <Series>
        {/* Scene 1: The Problem (0-8s) */}
        <Series.Sequence durationInFrames={240}>
          <ProblemScene />
        </Series.Sequence>

        {/* Scene 2: The Solution (8-15s) */}
        <Series.Sequence durationInFrames={210}>
          <SolutionScene />
        </Series.Sequence>

        {/* Scene 3: AI Form Generator (15-25s) */}
        <Series.Sequence durationInFrames={300}>
          <ScreenShowcase
            img={aiGeneratorImg}
            title="AI Form Generator"
            subtitle="Type a prompt. Get a complete form in seconds."
            feature="AI Feature #1"
          />
        </Series.Sequence>

        {/* Scene 4: Dashboard (25-35s) */}
        <Series.Sequence durationInFrames={300}>
          <ScreenShowcase
            img={dashboardImg}
            title="Your form portfolio"
            subtitle="Live dashboard with submission counts and form status."
            feature="Real-time"
          />
        </Series.Sequence>

        {/* Scene 5: Flowchart Builder (35-45s) */}
        <Series.Sequence durationInFrames={300}>
          <ScreenShowcase
            img={builderImg}
            title="Visual Flowchart Builder"
            subtitle="Drag, connect, deploy. No code required."
            feature="Interactive"
          />
        </Series.Sequence>

        {/* Scene 6: Submissions + Insights (45-55s) */}
        <Series.Sequence durationInFrames={300}>
          <ScreenShowcase
            img={submissionsImg}
            title="AI Submission Insights"
            subtitle="200 submissions → 3 bullets + sentiment + topics in seconds."
            feature="AI Feature #2"
          />
        </Series.Sequence>

        {/* Scene 7: API Keys (55-65s) */}
        <Series.Sequence durationInFrames={300}>
          <ScreenShowcase
            img={apiKeysImg}
            title="Full REST API"
            subtitle="API keys, scoped permissions, programmatic access."
            feature="Developer Platform"
          />
        </Series.Sequence>

        {/* Scene 8: Xano Architecture (65-75s) */}
        <Series.Sequence durationInFrames={300}>
          <XanoScene />
        </Series.Sequence>

        {/* Scene 9: Closing (75-90s) */}
        <Series.Sequence durationInFrames={450}>
          <ClosingScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
