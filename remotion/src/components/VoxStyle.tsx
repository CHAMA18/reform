/**
 * VoxStyle — VOX-inspired motion design components
 *
 * Key VOX design elements:
 *   1. Stuttered 12fps motion graphics
 *   2. Tracking transitions with blur
 *   3. Step-by-step lower thirds
 *   4. Motion texture backgrounds
 *   5. Chromatic aberration lens effects
 *   6. Clean, purposeful typography
 *   7. Film grain overlay
 *   8. Muted color palette with accent pops
 */
import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

// ============================================================================
// 1. STUTTERED TEXT — VOX's signature 12fps text animation
// ============================================================================

interface VoxStutteredTextProps {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  delay?: number;
  /** Frame rate for the stutter effect (default 12fps) */
  stutterFps?: number;
  style?: React.CSSProperties;
}

export const VoxStutteredText: React.FC<VoxStutteredTextProps> = ({
  text,
  fontSize = 48,
  fontWeight = 800,
  color = '#ffffff',
  delay = 0,
  stutterFps = 12,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convert to 12fps stuttered frames
  const stutterFrame = Math.floor(((frame - delay) * stutterFps) / fps);
  const charsToShow = Math.max(0, Math.min(stutterFrame, text.length));
  const displayedText = text.slice(0, charsToShow);

  // Stutter opacity
  const opacity = interpolate(frame - delay, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ ...style }}>
      <span
        style={{
          fontSize,
          fontWeight,
          color,
          letterSpacing: '-0.02em',
          opacity,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        {displayedText}
        {charsToShow < text.length && charsToShow > 0 && (
          <span style={{ opacity: Math.round(frame * 0.15) % 2 === 0 ? 1 : 0 }}>|</span>
        )}
      </span>
    </div>
  );
};

// ============================================================================
// 2. TRACKING TRANSITION — Smooth camera movement with blur
// ============================================================================

interface VoxTrackingTransitionProps {
  /** Direction of the tracking movement */
  direction?: 'left' | 'right' | 'up' | 'down';
  /** Duration in frames */
  duration?: number;
  /** Blur intensity during transition */
  blurIntensity?: number;
}

export const VoxTrackingTransition: React.FC<VoxTrackingTransitionProps> = ({
  direction = 'left',
  duration = 20,
  blurIntensity = 15,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const startFrame = durationInFrames - duration;
  const progress = interpolate(frame, [startFrame, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  const translateX = direction === 'left' ? -progress * 100 : direction === 'right' ? progress * 100 : 0;
  const translateY = direction === 'up' ? -progress * 100 : direction === 'down' ? progress * 100 : 0;
  const blur = interpolate(progress, [0, 0.5, 1], [0, blurIntensity, 0]);
  const scale = interpolate(progress, [0, 0.5, 1], [1, 1.1, 1.3]);
  const fadeOut = interpolate(progress, [0.6, 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0c0a09',
        opacity: fadeOut,
        transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
        filter: `blur(${blur}px)`,
      }}
    />
  );
};

// ============================================================================
// 3. STEP-BY-STEP LOWER THIRD — Jagged reveal VOX style
// ============================================================================

interface VoxLowerThirdProps {
  title: string;
  subtitle?: string;
  delay?: number;
  accentColor?: string;
  position?: 'left' | 'right';
}

export const VoxLowerThird: React.FC<VoxLowerThirdProps> = ({
  title,
  subtitle,
  delay = 0,
  accentColor = '#f59e0b',
  position = 'left',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;

  // Stuttered reveal (12fps feel)
  const revealProgress = interpolate(f, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Jagged mask reveal
  const maskWidth = interpolate(
    Math.floor(revealProgress * 8) / 8, // Quantized for jagged feel
    [0, 1],
    [0, 100],
  );

  const textOpacity = interpolate(f, [8, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtitleOpacity = interpolate(f, [14, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 120,
        left: position === 'left' ? 80 : undefined,
        right: position === 'right' ? 80 : undefined,
        maxWidth: 500,
      }}
    >
      {/* Background bar with jagged reveal */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${maskWidth}%`,
            height: 4,
            backgroundColor: accentColor,
            boxShadow: `0 0 20px ${accentColor}60`,
          }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          opacity: textOpacity,
          fontSize: 28,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.01em',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            opacity: subtitleOpacity,
            fontSize: 18,
            color: '#a8a29e',
            marginTop: 6,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. MOTION TEXTURE BACKGROUND — Subtle animated grain
// ============================================================================

interface VoxMotionBackgroundProps {
  color?: string;
  intensity?: number;
}

export const VoxMotionBackground: React.FC<VoxMotionBackgroundProps> = ({
  color = '#1c1917',
  intensity = 0.03,
}) => {
  const frame = useCurrentFrame();

  // Animated noise pattern
  const noiseOffset = frame * 0.5;

  return (
    <AbsoluteFill style={{ backgroundColor: color }}>
      {/* Animated scan lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,${intensity}) 2px,
            rgba(255,255,255,${intensity}) 3px
          )`,
          transform: `translateY(${noiseOffset % 4}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ============================================================================
// 5. FILM GRAIN OVERLAY — Subtle texture
// ============================================================================

interface VoxFilmGrainProps {
  opacity?: number;
  animated?: boolean;
}

export const VoxFilmGrain: React.FC<VoxFilmGrainProps> = ({
  opacity = 0.04,
  animated = true,
}) => {
  const frame = useCurrentFrame();

  // Deterministic grain pattern
  const seed = animated ? frame : 0;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity,
      }}
    >
      {/* SVG noise filter */}
      <svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <defs>
          <filter id={`grain-${seed}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              seed={seed}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect
          width="100%"
          height="100%"
          filter={`url(#grain-${seed})`}
        />
      </svg>
    </AbsoluteFill>
  );
};

// ============================================================================
// 6. CHROMATIC ABERRATION — Subtle RGB splitting
// ============================================================================

interface VoxChromaticAberrationProps {
  intensity?: number;
  children: React.ReactNode;
}

export const VoxChromaticAberration: React.FC<VoxChromaticAberrationProps> = ({
  intensity = 1.5,
  children,
}) => {
  return (
    <div style={{ position: 'relative' }}>
      {/* Red channel offset */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateX(${-intensity}px)`,
          mixBlendMode: 'screen',
          opacity: 0.5,
          filter: 'url(#red-channel)',
        }}
      >
        {children}
      </div>

      {/* Blue channel offset */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateX(${intensity}px)`,
          mixBlendMode: 'screen',
          opacity: 0.5,
          filter: 'url(#blue-channel)',
        }}
      >
        {children}
      </div>

      {/* Main content */}
      <div style={{ position: 'relative' }}>{children}</div>

      {/* SVG filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="red-channel">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="blue-channel">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

// ============================================================================
// 7. ANIMATED COUNTER — VOX-style number animation
// ============================================================================

interface VoxCounterProps {
  from?: number;
  to: number;
  delay?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
}

export const VoxCounter: React.FC<VoxCounterProps> = ({
  from = 0,
  to,
  delay = 0,
  duration = 60,
  prefix = '',
  suffix = '',
  fontSize = 72,
  color = '#f59e0b',
  fontWeight = 900,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const value = Math.round(from + (to - from) * progress);

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <span
      style={{
        fontSize,
        fontWeight,
        color,
        opacity,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
};

// ============================================================================
// 8. VOX SECTION HEADER — Documentary-style section divider
// ============================================================================

interface VoxSectionHeaderProps {
  number: string;
  title: string;
  delay?: number;
  accentColor?: string;
}

export const VoxSectionHeader: React.FC<VoxSectionHeaderProps> = ({
  number,
  title,
  delay = 0,
  accentColor = '#f59e0b',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;

  // Staggered reveal
  const numberOpacity = interpolate(f, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineWidth = interpolate(f, [5, 25], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const titleOpacity = interpolate(f, [15, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(f, [15, 25], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}
    >
      {/* Section number */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: accentColor,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          opacity: numberOpacity,
          marginBottom: 16,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {number}
      </div>

      {/* Animated line */}
      <div
        style={{
          width: `${lineWidth}%`,
          height: 2,
          backgroundColor: accentColor,
          margin: '0 auto 24px',
          boxShadow: `0 0 20px ${accentColor}40`,
        }}
      />

      {/* Title */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '-0.03em',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          maxWidth: 800,
        }}
      >
        {title}
      </div>
    </div>
  );
};
