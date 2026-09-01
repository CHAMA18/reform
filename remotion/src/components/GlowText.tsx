/**
 * GlowText — Cinematic text with glow, reveal, and emphasis effects
 *
 * Supports: reveal (typewriter-style), glow pulse, scale spring, and
 * character-by-character stagger animations.
 */
import React from 'react';
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

interface GlowTextProps {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  glowColor?: string;
  delay?: number;
  reveal?: boolean;
  stagger?: boolean;
  glowIntensity?: number;
  letterSpacing?: string;
  textAlign?: React.CSSProperties['textAlign'];
  style?: React.CSSProperties;
}

export const GlowText: React.FC<GlowTextProps> = ({
  text,
  fontSize = 64,
  fontWeight = 800,
  color = '#ffffff',
  glowColor = '#f59e0b',
  delay = 0,
  reveal = false,
  stagger = false,
  glowIntensity = 20,
  letterSpacing = '-0.03em',
  textAlign = 'center',
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const baseOpacity = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const glowPulse = interpolate(
    Math.sin((frame - delay) * 0.05),
    [-1, 1],
    [0.6, 1],
  );

  if (stagger) {
    const chars = text.split('');
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: textAlign === 'center' ? 'center' : 'flex-start',
          gap: 0,
          ...style,
        }}
      >
        {chars.map((char, i) => {
          const charSpring = spring({
            frame: frame - delay - i * 2,
            fps,
            config: { damping: 14, stiffness: 100 },
          });
          return (
            <span
              key={i}
              style={{
                fontSize,
                fontWeight,
                color,
                letterSpacing,
                display: 'inline-block',
                opacity: charSpring,
                transform: `translateY(${(1 - charSpring) * 20}px)`,
                textShadow: `0 0 ${glowIntensity * glowPulse}px ${glowColor}, 0 0 ${glowIntensity * 2 * glowPulse}px ${glowColor}40`,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>
    );
  }

  if (reveal) {
    const charsToShow = Math.floor(
      interpolate(frame - delay, [0, text.length * 2], [0, text.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
    );
    const displayedText = text.slice(0, charsToShow);
    const cursorOpacity = Math.round(frame * 0.1) % 2 === 0 ? 1 : 0;

    return (
      <div style={{ textAlign, ...style }}>
        <span
          style={{
            fontSize,
            fontWeight,
            color,
            letterSpacing,
            opacity: baseOpacity,
            textShadow: `0 0 ${glowIntensity * glowPulse}px ${glowColor}, 0 0 ${glowIntensity * 2 * glowPulse}px ${glowColor}40`,
          }}
        >
          {displayedText}
          {charsToShow < text.length && (
            <span style={{ opacity: cursorOpacity, color: glowColor }}>|</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div style={{ textAlign, ...style }}>
      <span
        style={{
          fontSize,
          fontWeight,
          color,
          letterSpacing,
          opacity: baseOpacity,
          transform: `scale(${interpolate(baseOpacity, [0, 1], [0.9, 1])})`,
          display: 'inline-block',
          textShadow: `0 0 ${glowIntensity * glowPulse}px ${glowColor}, 0 0 ${glowIntensity * 2 * glowPulse}px ${glowColor}40`,
        }}
      >
        {text}
      </span>
    </div>
  );
};
