/**
 * LogoReveal — Epic cinematic logo reveal animation
 *
 * Three-phase reveal:
 *   1. Lines converge from edges into the logo shape
 *   2. Logo layers stack and pulse with amber glow
 *   3. "Reform" wordmark slides in with spring physics
 */
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

interface LogoRevealProps {
  showWordmark?: boolean;
  size?: number;
  delay?: number;
}

export const LogoReveal: React.FC<LogoRevealProps> = ({
  showWordmark = true,
  size = 200,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;

  // Phase 1: Converging lines (0-40 frames)
  const lineProgress = interpolate(f, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Phase 2: Layer stack (30-60 frames)
  const layer1 = spring({
    frame: f - 25,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const layer2 = spring({
    frame: f - 32,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const layer3 = spring({
    frame: f - 39,
    fps,
    config: { damping: 10, stiffness: 70 },
  });

  // Phase 3: Glow pulse
  const glowPulse = interpolate(
    Math.sin(f * 0.06),
    [-1, 1],
    [0.4, 1],
  );

  // Phase 4: Wordmark (60-90 frames)
  const wordmarkSpring = spring({
    frame: f - 65,
    fps,
    config: { damping: 14, stiffness: 60 },
  });

  // Converging lines data
  const lines = [
    { startX: -200, startY: -100, angle: 30 },
    { startX: 200, startY: -100, angle: -30 },
    { startX: -200, startY: 100, angle: -30 },
    { startX: 200, startY: 100, angle: 30 },
    { startX: 0, startY: -300, angle: 0 },
    { startX: 0, startY: 300, angle: 180 },
  ];

  const logoScale = size / 64;

  return (
    <AbsoluteFill
      style={{ justifyContent: 'center', alignItems: 'center' }}
    >
      <div style={{ position: 'relative', width: size + 200, height: size + 100 }}>
        {/* Phase 1: Converging lines */}
        {lines.map((line, i) => {
          const lineOpacity = interpolate(f, [i * 3, i * 3 + 15, 35, 45], [0, 0.6, 0.6, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const lineX = interpolate(lineProgress, [0, 1], [line.startX, 0]);
          const lineY = interpolate(lineProgress, [0, 1], [line.startY, 0]);

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 120,
                height: 2,
                backgroundColor: '#f59e0b',
                opacity: lineOpacity,
                transform: `translate(${lineX - 60}px, ${lineY}px) rotate(${line.angle}deg)`,
                boxShadow: '0 0 20px #f59e0b, 0 0 40px #f59e0b60',
              }}
            />
          );
        })}

        {/* Phase 2: Logo mark */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${logoScale})`,
          }}
        >
          <svg viewBox="-8 -8 80 80" width={size} height={size}>
            <defs>
              <linearGradient id="reveal-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="reveal-grad-2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="logo-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Back layer */}
            <rect
              x="0"
              y="0"
              width="64"
              height="64"
              rx="12"
              fill="url(#reveal-grad-2)"
              opacity={0.45 * layer1}
              transform={`translate(${(1 - layer1) * -20}, 0)`}
            />

            {/* Middle layer */}
            <rect
              x="0"
              y="0"
              width="64"
              height="64"
              rx="12"
              fill="url(#reveal-grad-2)"
              opacity={0.75 * layer2}
              transform={`translate(${(1 - layer2) * -10 + 2}, 0)`}
            />

            {/* Front layer */}
            <rect
              x="0"
              y="0"
              width="64"
              height="64"
              rx="12"
              fill="url(#reveal-grad)"
              opacity={layer3}
              transform={`translate(${4}, 0)`}
            />

            {/* Flow symbol */}
            <g
              transform="translate(32, 32)"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              opacity={layer3}
              filter="url(#logo-glow)"
            >
              <line
                x1={interpolate(lineProgress, [0, 1], [-22, -22])}
                y1="-10"
                x2={interpolate(lineProgress, [0, 1], [-22, -6])}
                y2="-10"
              />
              <line
                x1={interpolate(lineProgress, [0, 1], [-22, -22])}
                y1="0"
                x2={interpolate(lineProgress, [0, 1], [-22, -6])}
                y2="0"
              />
              <line
                x1={interpolate(lineProgress, [0, 1], [-22, -22])}
                y1="10"
                x2={interpolate(lineProgress, [0, 1], [-22, -6])}
                y2="10"
              />
              <line x1="-6" y1="0" x2="20" y2="0" />
              <polyline points="14,-6 22,0 14,6" fill="none" />
            </g>
          </svg>
        </div>

        {/* Glow ring behind logo */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: '50%',
            border: `2px solid rgba(245, 158, 11, ${0.2 * glowPulse * layer3})`,
            boxShadow: `0 0 ${40 * glowPulse}px rgba(245, 158, 11, ${0.15 * glowPulse * layer3}), inset 0 0 ${40 * glowPulse}px rgba(245, 158, 11, ${0.05 * glowPulse * layer3})`,
            opacity: layer3,
          }}
        />

        {/* Phase 3: Wordmark */}
        {showWordmark && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -20,
              transform: `translateX(-50%) translateY(${(1 - wordmarkSpring) * 30}px)`,
              opacity: wordmarkSpring,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.03em',
                textShadow: `0 0 ${30 * glowPulse}px rgba(245, 158, 11, 0.4)`,
              }}
            >
              Reform
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
