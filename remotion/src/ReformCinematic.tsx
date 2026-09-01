/**
 * ReformCinematic — VOX-style world-class cinematic video
 *
 * 7-act epic narrative with VOX documentary aesthetics:
 *   - Stuttered 12fps motion graphics
 *   - Tracking transitions with blur
 *   - Step-by-step lower thirds
 *   - Film grain overlay
 *   - Chromatic aberration lens effects
 *   - Clean, purposeful typography
 *   - Animated data visualizations
 *
 * Render with:
 *   npx remotion render ReformCinematic out/reform-cinematic.mp4 --codec=h264 --crf=18
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
} from 'remotion';

// VOX-style components
import {
  VoxStutteredText,
  VoxLowerThird,
  VoxMotionBackground,
  VoxFilmGrain,
  VoxChromaticAberration,
  VoxCounter,
  VoxSectionHeader,
} from './components/VoxStyle';

// Premium fonts
import { FONTS, TYPOGRAPHY } from './components/PremiumFonts';

// Professional icons
import {
  DatabaseIcon,
  LightningIcon,
  PlugIcon,
  RefreshIcon,
  DocumentIcon,
  LockIcon,
} from './components/ProfessionalIcons';

// Other components
import { Particles } from './components/Particles';
import { GlowText } from './components/GlowText';
import { LogoReveal } from './components/LogoReveal';
import { BackgroundMusic } from './components/BackgroundMusic';
import { CinematicSFX } from './components/SoundEffects';

// @ts-ignore - Remotion handles audio imports
import bgMusic from '../public/music/background.mp3';

// Screenshots
import aiGeneratorImg from './screenshots/03-ai-generator.png';
import dashboardImg from './screenshots/04-dashboard.png';
import builderImg from './screenshots/05-builder.png';
import submissionsImg from './screenshots/06-submissions.png';

// Brand colors (VOX-muted palette)
const AMBER = '#f59e0b';
const AMBER_DARK = '#d97706';
const AMBER_DEEP = '#92400e';
const DARK = '#0c0a09';
const DARK_SURFACE = '#1c1917';
const WHITE = '#ffffff';
const MUTED = '#a8a29e';
const RED = '#ef4444';

// Screenshot dimensions
const SCREENSHOT_W = 1280;
const SCREENSHOT_H = 577;
const SCREENSHOT_ASPECT = SCREENSHOT_W / SCREENSHOT_H;
const CONTAINER_W = 1280;
const CONTAINER_H = Math.round(CONTAINER_W / SCREENSHOT_ASPECT);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const fadeIn = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const fadeOut = (frame: number, end: number, duration: number) =>
  interpolate(frame, [end - duration, end], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const slideUp = (frame: number, delay: number, distance = 60) => {
  const y = interpolate(frame - delay, [0, 20], [distance, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return y;
};

// ============================================================================
// ACT I — THE VOID (0-5s, 150 frames)
// VOX Style: Minimal, atmospheric, film grain
// ============================================================================

const ActVoid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dotScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 8, stiffness: 40 },
  });

  const ringScale = spring({
    frame: frame - 60,
    fps,
    config: { damping: 12, stiffness: 60 },
  });

  const logoOpacity = interpolate(frame, [90, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const burstProgress = interpolate(frame, [40, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <VoxMotionBackground intensity={0.02} />
      <Particles count={40} color={AMBER} maxSize={3} seed={1} />

      {/* Central amber dot */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: AMBER,
            transform: `scale(${dotScale * 8})`,
            boxShadow: `0 0 ${60 * dotScale}px ${AMBER}, 0 0 ${120 * dotScale}px ${AMBER}60`,
            opacity: dotScale,
          }}
        />

        {/* Expanding ring */}
        <div
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: `2px solid ${AMBER}`,
            transform: `scale(${ringScale * 2})`,
            opacity: ringScale * 0.4,
            boxShadow: `0 0 40px ${AMBER}40`,
          }}
        />

        {/* Burst particles */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const dist = burstProgress * 400;
          const opacity = interpolate(burstProgress, [0, 0.3, 1], [0, 0.8, 0]);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: AMBER,
                transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`,
                opacity,
                boxShadow: `0 0 12px ${AMBER}`,
              }}
            />
          );
        })}

        {/* Logo reveal */}
        <div style={{ position: 'absolute', opacity: logoOpacity }}>
          <LogoReveal showWordmark={false} size={160} delay={0} />
        </div>
      </AbsoluteFill>

      <VoxFilmGrain opacity={0.03} />
    </AbsoluteFill>
  );
};

// ============================================================================
// ACT II — THE CHAOS (5-15s, 300 frames)
// VOX Style: Data-driven, stuttered text, lower thirds
// ============================================================================

const ActChaos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tools = [
    { name: 'Typeform', cost: 99, color: '#a8a29e', direction: 'left' as const },
    { name: 'Zapier', cost: 49, color: '#a8a29e', direction: 'right' as const },
    { name: 'Airtable', cost: 20, color: '#a8a29e', direction: 'left' as const },
    { name: 'Metabase', cost: 85, color: '#a8a29e', direction: 'right' as const },
    { name: 'Customer.io', cost: 150, color: '#a8a29e', direction: 'left' as const },
    { name: 'Hotjar', cost: 32, color: '#a8a29e', direction: 'right' as const },
    { name: 'Localize', cost: 50, color: '#a8a29e', direction: 'left' as const },
  ];

  const totalCost = tools.reduce((s, t) => s + t.cost, 0);

  // VOX-style section header
  const headerOpacity = fadeIn(frame, 0, 40) * fadeOut(frame, 560, 60);
  const headerY = slideUp(frame, 0, 80);

  // "The old way is broken" flash
  const brokenFlash = interpolate(frame, [540, 550, 560, 570], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Directional animation helper
  const getDirectionalTransform = (direction: 'left' | 'right', delay: number) => {
    const progress = spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 80 },
    });
    const startX = direction === 'left' ? -400 : 400;
    const x = interpolate(progress, [0, 1], [startX, 0]);
    const opacity = interpolate(progress, [0, 0.3], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { x, opacity, scale: progress };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <VoxMotionBackground intensity={0.025} />
      <Particles count={30} color="#a8a29e15" maxSize={2} seed={2} />

      {/* VOX Section Header */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          textAlign: 'center',
        }}
      >
        <VoxSectionHeader
          number="THE PROBLEM"
          title="Every business relies on 7 different tools"
        />
      </div>

      {/* Tool cards — Large, directional reveal from left/right */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {tools.map((tool, i) => {
          const toolDelay = 80 + i * 50;
          const { x, opacity, scale } = getDirectionalTransform(tool.direction, toolDelay);
          const exitOpacity = fadeOut(frame, 560, 40);

          return (
            <div
              key={tool.name}
              style={{
                opacity: opacity * exitOpacity,
                transform: `translateX(${x}px) scale(${scale})`,
                display: 'flex',
                alignItems: 'center',
                gap: 32,
                padding: '20px 48px',
                borderRadius: 16,
                backgroundColor: DARK_SURFACE,
                border: '1px solid rgba(255,255,255,0.08)',
                width: 600,
                justifyContent: 'space-between',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: RED,
                    boxShadow: `0 0 12px ${RED}60`,
                  }}
                />
                <span style={{ ...TYPOGRAPHY.body, fontWeight: 700, color: WHITE }}>
                  {tool.name}
                </span>
              </div>
              <span style={{ ...TYPOGRAPHY.body, fontWeight: 700, color: RED }}>
                ${tool.cost}/mo
              </span>
            </div>
          );
        })}
      </div>

      {/* Total cost — VOX animated counter */}
      <div
        style={{
          position: 'absolute',
          bottom: 140,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <VoxCounter
          to={totalCost}
          delay={200}
          duration={200}
          prefix="$"
          fontSize={96}
          color={RED}
        />
        <div style={{ fontSize: 24, color: MUTED, marginTop: 8 }}>
          per month across 7 tools
        </div>
      </div>

      {/* VOX Lower Third */}
      <VoxLowerThird
        title="The fragmentation problem"
        subtitle="7 subscriptions. 7 dashboards. 1 broken workflow."
        delay={120}
        accentColor={RED}
      />

      {/* "The old way is broken" flash */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: DARK,
          opacity: brokenFlash,
        }}
      >
        <GlowText
          text="The old way is broken."
          fontSize={72}
          fontWeight={900}
          color={RED}
          glowColor={RED}
          glowIntensity={30}
          delay={0}
        />
      </AbsoluteFill>

      <VoxFilmGrain opacity={0.03} />
    </AbsoluteFill>
  );
};

// ============================================================================
// ACT III — THE VISION (15-25s, 300 frames)
// VOX Style: Clean reveal, purposeful typography
// ============================================================================

const ActVision: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const questionOpacity = fadeIn(frame, 0, 60) * fadeOut(frame, 240, 60);
  const questionY = slideUp(frame, 0, 100);

  const answerOpacity = fadeIn(frame, 200, 60);

  const logoSpring = spring({
    frame: frame - 240,
    fps,
    config: { damping: 10, stiffness: 50 },
  });

  const features = [
    'AI Form Generator',
    'Visual Builder',
    'Conversational Forms',
    'Voice Mode',
    'Smart Routing',
    'Auto-Translation',
    'AI Insights',
    'PDF Reports',
    'Field Analytics',
    'REST API',
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <VoxMotionBackground intensity={0.02} />
      <Particles count={50} color={AMBER} maxSize={3} seed={3} />

      {/* The question — VOX clean typography */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            opacity: questionOpacity,
            transform: `translateY(${questionY}px)`,
            textAlign: 'center',
            marginBottom: 200,
          }}
        >
          <p
            style={{
              fontSize: 32,
              color: MUTED,
              fontStyle: 'italic',
              margin: 0,
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            What if
          </p>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: WHITE,
              letterSpacing: '-0.03em',
              margin: '16px 0',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            one platform could replace them all?
          </h1>
        </div>

        {/* The answer */}
        <div style={{ opacity: answerOpacity, textAlign: 'center' }}>
          <div
            style={{
              transform: `scale(${logoSpring * 1.2})`,
              opacity: logoSpring,
              marginBottom: 32,
            }}
          >
            <svg viewBox="-8 -8 80 80" width="120" height="120">
              <defs>
                <linearGradient id="vis-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="vis-grad-2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#vis-grad-2)" opacity="0.45" />
              <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#vis-grad-2)" opacity="0.75" transform="translate(2, 0)" />
              <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#vis-grad)" transform="translate(4, 0)" />
              <g transform="translate(32, 32)" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <line x1="-22" y1="-10" x2="-6" y2="-10" />
                <line x1="-22" y1="0" x2="-6" y2="0" />
                <line x1="-22" y1="10" x2="-6" y2="10" />
                <line x1="-6" y1="0" x2="20" y2="0" />
                <polyline points="14,-6 22,0 14,6" fill="none" />
              </g>
            </svg>
          </div>

          <GlowText
            text="Introducing Reform"
            fontSize={72}
            fontWeight={900}
            color={AMBER}
            glowColor={AMBER}
            glowIntensity={25}
            delay={130}
          />

          <p
            style={{
              fontSize: 28,
              color: MUTED,
              marginTop: 16,
              opacity: fadeIn(frame, 160, 20),
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            10 AI features. One AI-native platform.
          </p>
        </div>
      </AbsoluteFill>

      {/* Feature pills — VOX scattered reveal */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            position: 'relative',
            width: 1200,
            height: 600,
            marginTop: 100,
          }}
        >
          {features.map((feat, i) => {
            const featDelay = 360 + i * 16;
            const featSpring = spring({
              frame: frame - featDelay,
              fps,
              config: { damping: 14, stiffness: 80 },
            });
            const angle = (i / features.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 220 + (i % 3) * 40;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * 0.6;

            return (
              <div
                key={feat}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(${x - 80}px, ${y - 16}px) scale(${featSpring})`,
                  opacity: featSpring,
                  padding: '8px 20px',
                  borderRadius: 999,
                  backgroundColor: `${AMBER}15`,
                  border: `1px solid ${AMBER}40`,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: AMBER,
                    letterSpacing: '0.05em',
                  }}
                >
                  {feat}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <VoxFilmGrain opacity={0.03} />
    </AbsoluteFill>
  );
};

// ============================================================================
// ACT IV — THE POWER (25-50s, 750 frames)
// VOX Style: Feature showcase with documentary pacing
// ============================================================================

const FeatureReveal: React.FC<{
  img: string;
  title: string;
  subtitle: string;
  badge: string;
  accent?: string;
}> = ({ img, title, subtitle, badge, accent = AMBER }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const subtitleOpacity = fadeIn(frame, 25, 20);

  const screenshotSpring = spring({ frame: frame - 15, fps, config: { damping: 14, stiffness: 60 } });
  const screenshotScale = interpolate(screenshotSpring, [0, 1], [0.85, 1]);
  const screenshotGlow = interpolate(
    Math.sin(frame * 0.04),
    [-1, 1],
    [0.3, 0.6],
  );

  const badgeSpring = spring({ frame: frame - 5, fps, config: { damping: 16 } });
  const exitOpacity = fadeOut(frame, useVideoConfig().durationInFrames, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: DARK, opacity: exitOpacity }}>
      <VoxMotionBackground intensity={0.02} />
      <Particles count={25} color={`${accent}30`} maxSize={2} seed={frame} />

      {/* Badge */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 18px',
            borderRadius: 999,
            backgroundColor: `${accent}15`,
            border: `1px solid ${accent}40`,
            transform: `scale(${badgeSpring})`,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: accent,
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
            }}
          >
            {badge}
          </span>
        </div>
      </div>

      {/* Title — VOX clean */}
      <div
        style={{
          position: 'absolute',
          top: 110,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleSpring,
        }}
      >
        <h2
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: WHITE,
            letterSpacing: '-0.03em',
            margin: 0,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 24,
            color: MUTED,
            marginTop: 8,
            opacity: subtitleOpacity,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Screenshot with VOX lens effect */}
      <VoxChromaticAberration intensity={1}>
        <div
          style={{
            position: 'absolute',
            top: 230,
            left: '50%',
            transform: `translateX(-50%) scale(${screenshotScale})`,
            opacity: screenshotSpring,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), 0 0 ${60 * screenshotGlow}px ${accent}20`,
            width: CONTAINER_W,
            height: CONTAINER_H,
          }}
        >
          <Img src={img} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </VoxChromaticAberration>

      {/* VOX Lower Third */}
      <VoxLowerThird
        title={title}
        subtitle={subtitle}
        delay={20}
        accentColor={accent}
      />

      <VoxFilmGrain opacity={0.03} />
    </AbsoluteFill>
  );
};

const ActPower: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={420}>
        <FeatureReveal
          img={aiGeneratorImg}
          title="AI Form Generator"
          subtitle="Type a prompt. Get a complete form in seconds."
          badge="AI FEATURE"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={420}>
        <FeatureReveal
          img={builderImg}
          title="Visual Flowchart Builder"
          subtitle="Drag, connect, deploy. No code required."
          badge="INTERACTIVE"
          accent="#10b981"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={420}>
        <FeatureReveal
          img={dashboardImg}
          title="Real-time Dashboard"
          subtitle="Live form counts, submission stats, and analytics."
          badge="ALWAYS LIVE"
          accent="#3b82f6"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={240}>
        <FeatureReveal
          img={submissionsImg}
          title="AI Submission Insights"
          subtitle="200 submissions → 3 bullets + sentiment in seconds."
          badge="AI FEATURE"
          accent="#8b5cf6"
        />
      </Series.Sequence>
    </Series>
  );
};

// ============================================================================
// ACT V — THE IMPACT (50-65s, 450 frames)
// VOX Style: Data visualization, animated counters
// ============================================================================

const ActImpact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const oldCost = 485;
  const newCost = 99;
  const savings = oldCost - newCost;
  const savingsPercent = Math.round((savings / oldCost) * 100);

  const oldCostOpacity = fadeIn(frame, 0, 20);
  const strikeThrough = interpolate(frame, [30, 60], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const newCostSpring = spring({ frame: frame - 60, fps, config: { damping: 10 } });

  const mathOpacity = fadeIn(frame, 500, 60);
  const mathY = slideUp(frame, 500, 80);

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <VoxMotionBackground intensity={0.02} />
      <Particles count={40} color={AMBER} maxSize={3} seed={5} />

      {/* VOX Section Header */}
      <VoxSectionHeader number="THE IMPACT" title="The numbers speak for themselves" />

      {/* Cost transformation */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          {/* Old cost */}
          <div style={{ opacity: oldCostOpacity, marginBottom: 20 }}>
            <span
              style={{
                fontSize: 100,
                fontWeight: 900,
                color: RED,
                position: 'relative',
                display: 'inline-block',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              }}
            >
              ${oldCost}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: `${strikeThrough}%`,
                  height: 4,
                  backgroundColor: RED,
                  transform: 'translateY(-50%) rotate(-3deg)',
                  opacity: 0.8,
                }}
              />
            </span>
            <span style={{ fontSize: 32, color: MUTED, marginLeft: 16 }}>/mo</span>
          </div>

          {/* Arrow */}
          <div
            style={{
              opacity: newCostSpring,
              fontSize: 48,
              color: AMBER,
              marginBottom: 20,
            }}
          >
            ↓
          </div>

          {/* New cost */}
          <div
            style={{
              transform: `scale(${newCostSpring})`,
              opacity: newCostSpring,
            }}
          >
            <span
              style={{
                fontSize: 120,
                fontWeight: 900,
                color: AMBER,
                textShadow: `0 0 40px ${AMBER}60`,
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              }}
            >
              ${newCost}
            </span>
            <span style={{ fontSize: 36, color: MUTED, marginLeft: 16 }}>/mo</span>
          </div>
        </div>
      </AbsoluteFill>

      {/* Stats row — VOX animated counters */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 80,
        }}
      >
        {[
          { value: 7, suffix: '', label: 'tools replaced', delay: 100 },
          { value: 10, suffix: '', label: 'AI features', delay: 130 },
          { value: savingsPercent, suffix: '%', label: 'cost savings', delay: 160 },
          { value: 1, suffix: '', label: 'platform', delay: 190 },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <VoxCounter
              to={stat.value}
              delay={stat.delay}
              duration={40}
              suffix={stat.suffix}
              fontSize={56}
              color={AMBER}
            />
            <div style={{ fontSize: 18, color: MUTED, marginTop: 8 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* VOX Lower Third */}
      <VoxLowerThird
        title="$485 → $99 per month"
        subtitle="79% savings. Same functionality. Better AI."
        delay={400}
        accentColor={AMBER}
      />

      <VoxFilmGrain opacity={0.03} />
    </AbsoluteFill>
  );
};

// ============================================================================
// ACT VI — THE FOUNDATION (65-75s, 300 frames)
// VOX Style: Technical breakdown, clean grid
// ============================================================================

const ActFoundation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const architecture = [
    { icon: <DatabaseIcon size={36} />, label: '12 Tables', desc: 'Full relational schema' },
    { icon: <LightningIcon size={36} />, label: '6 Function Stacks', desc: 'XanoScript business logic' },
    { icon: <PlugIcon size={36} />, label: '6 API Endpoints', desc: 'REST v1 with API keys' },
    { icon: <RefreshIcon size={36} />, label: 'Scheduled Tasks', desc: 'Nightly insight refresh' },
    { icon: <DocumentIcon size={36} />, label: 'Audit Trail', desc: 'Every AI call logged' },
    { icon: <LockIcon size={36} />, label: 'Xano Auth', desc: 'Secure session management' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <VoxMotionBackground intensity={0.02} />
      <Particles count={35} color={AMBER} maxSize={2} seed={6} />

      {/* VOX Section Header */}
      <VoxSectionHeader number="THE ENGINE" title="The brain behind the beauty" />

      {/* Architecture grid */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          width: 800,
        }}
      >
        {architecture.map((item, i) => {
          const itemDelay = 60 + i * 40;
          const itemSpring = spring({
            frame: frame - itemDelay,
            fps,
            config: { damping: 14, stiffness: 80 },
          });

          return (
            <div
              key={item.label}
              style={{
                opacity: itemSpring,
                transform: `scale(${itemSpring}) translateY(${(1 - itemSpring) * 20}px)`,
                padding: '20px 16px',
                borderRadius: 8,
                backgroundColor: DARK_SURFACE,
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
            <div
              style={{
                ...TYPOGRAPHY.caption,
                fontWeight: 700,
                color: WHITE,
                marginBottom: 4,
              }}
            >
                {item.label}
              </div>
              <div style={{ ...TYPOGRAPHY.caption, fontSize: 13, color: MUTED, fontWeight: 400 }}>{item.desc}</div>
            </div>
          );
        })}
      </div>

      {/* VOX Lower Third */}
      <VoxLowerThird
        title="Xano is the brain"
        subtitle="Every AI call flows through function stacks."
        delay={120}
        accentColor={AMBER}
      />

      <VoxFilmGrain opacity={0.03} />
    </AbsoluteFill>
  );
};

// ============================================================================
// ACT VII — THE CLOSE (75-90s, 450 frames)
// VOX Style: Clean, memorable closing
// ============================================================================

const ActClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 8, stiffness: 40 },
  });

  const taglineOpacity = fadeIn(frame, 120, 60);
  const taglineY = slideUp(frame, 120, 60);

  const urlOpacity = fadeIn(frame, 240, 60);

  const xanoOpacity = fadeIn(frame, 360, 60);

  const burstActive = frame > 600;
  const burstProgress = burstActive
    ? interpolate(frame, [600, 760], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <VoxMotionBackground intensity={0.02} />
      <Particles count={60} color={AMBER} maxSize={4} seed={7} />

      {/* Logo */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            transform: `scale(${logoSpring * 2.5})`,
            opacity: logoSpring,
            marginBottom: 60,
          }}
        >
          <svg viewBox="-8 -8 80 80" width="140" height="140">
            <defs>
              <linearGradient id="close-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="close-grad-2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="close-glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#close-grad-2)" opacity="0.45" />
            <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#close-grad-2)" opacity="0.75" transform="translate(2, 0)" />
            <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#close-grad)" transform="translate(4, 0)" />
            <g transform="translate(32, 32)" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" filter="url(#close-glow)">
              <line x1="-22" y1="-10" x2="-6" y2="-10" />
              <line x1="-22" y1="0" x2="-6" y2="0" />
              <line x1="-22" y1="10" x2="-6" y2="10" />
              <line x1="-6" y1="0" x2="20" y2="0" />
              <polyline points="14,-6 22,0 14,6" fill="none" />
            </g>
          </svg>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              ...TYPOGRAPHY.hero,
              color: WHITE,
              margin: 0,
              textShadow: `0 0 40px ${AMBER}30`,
            }}
          >
            Reform
          </h1>
          <p
            style={{
              ...TYPOGRAPHY.subtitle,
              color: AMBER,
              marginTop: 12,
              fontWeight: 600,
            }}
          >
            The future of forms.
          </p>
        </div>

        {/* URL */}
        <div style={{ opacity: urlOpacity, marginTop: 48 }}>
          <span
            style={{
              ...TYPOGRAPHY.url,
              color: MUTED,
              padding: '10px 28px',
              borderRadius: 999,
              backgroundColor: DARK_SURFACE,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            reform-7jo8.onrender.com
          </span>
        </div>

        {/* Xano badge */}
        <div style={{ opacity: xanoOpacity, marginTop: 24 }}>
          <span
            style={{
              ...TYPOGRAPHY.caption,
              fontWeight: 700,
              color: AMBER_DEEP,
              backgroundColor: `${AMBER}10`,
              padding: '8px 24px',
              borderRadius: 999,
              border: `1px solid ${AMBER}30`,
            }}
          >
            ⚡ Built on Xano · Xano Hackathon 2026
          </span>
        </div>
      </AbsoluteFill>

      {/* Final particle burst */}
      {burstActive && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const dist = burstProgress * 600;
            const opacity = interpolate(burstProgress, [0, 0.2, 1], [0, 1, 0]);
            const size = 3 + (i % 3) * 2;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  backgroundColor: i % 3 === 0 ? AMBER : i % 3 === 1 ? '#fbbf24' : '#d97706',
                  transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`,
                  opacity,
                  boxShadow: `0 0 ${size * 4}px ${AMBER}`,
                }}
              />
            );
          })}
        </AbsoluteFill>
      )}

      <VoxFilmGrain opacity={0.03} />
    </AbsoluteFill>
  );
};

// ============================================================================
// MAIN COMPOSITION
// ============================================================================

export const ReformCinematic: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      {/* Background music */}
      <BackgroundMusic
        src={bgMusic}
        volume={0.35}
        fadeInDuration={2}
        fadeOutDuration={4}
      />

      {/* Sound effects */}
      <CinematicSFX />

      <Series>
        {/* ACT I — THE VOID (0-10s) */}
        <Series.Sequence durationInFrames={300}>
          <ActVoid />
        </Series.Sequence>

        {/* ACT II — THE CHAOS (10-30s) */}
        <Series.Sequence durationInFrames={600}>
          <ActChaos />
        </Series.Sequence>

        {/* ACT III — THE VISION (30-50s) */}
        <Series.Sequence durationInFrames={600}>
          <ActVision />
        </Series.Sequence>

        {/* ACT IV — THE POWER (50-100s) */}
        <Series.Sequence durationInFrames={1500}>
          <ActPower />
        </Series.Sequence>

        {/* ACT V — THE IMPACT (100-130s) */}
        <Series.Sequence durationInFrames={900}>
          <ActImpact />
        </Series.Sequence>

        {/* ACT VI — THE FOUNDATION (130-150s) */}
        <Series.Sequence durationInFrames={600}>
          <ActFoundation />
        </Series.Sequence>

        {/* ACT VII — THE CLOSE (150-180s) */}
        <Series.Sequence durationInFrames={900}>
          <ActClose />
        </Series.Sequence>
      </Series>

      {/* Global film grain overlay */}
      <VoxFilmGrain opacity={0.025} animated />
    </AbsoluteFill>
  );
};
