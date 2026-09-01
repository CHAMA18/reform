/**
 * Particles — Cinematic floating particle system
 *
 * Renders subtle, slowly drifting particles that create depth and atmosphere.
 * Used as a background layer across multiple scenes.
 */
import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  phase: number;
}

interface ParticlesProps {
  count?: number;
  color?: string;
  maxSize?: number;
  seed?: number;
}

// Seeded random for deterministic particles
const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export const Particles: React.FC<ParticlesProps> = ({
  count = 60,
  color = '#f59e0b',
  maxSize = 4,
  seed = 42,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const particles = useMemo<Particle[]>(() => {
    const rng = seededRandom(seed);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rng() * width,
      y: rng() * height,
      size: 1 + rng() * maxSize,
      speed: 0.2 + rng() * 0.8,
      opacity: 0.05 + rng() * 0.2,
      drift: (rng() - 0.5) * 0.5,
      phase: rng() * Math.PI * 2,
    }));
  }, [count, width, height, maxSize, seed]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => {
        const t = frame / durationInFrames;
        const yOffset = (p.speed * frame * 0.5) % height;
        const xOffset = Math.sin(frame * 0.01 + p.phase) * 20 * p.drift;
        const pulse = interpolate(
          Math.sin(frame * 0.03 + p.phase),
          [-1, 1],
          [0.5, 1],
        );
        const fadeIn = interpolate(frame, [0, 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x + xOffset,
              top: (p.y - yOffset + height) % height,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: p.opacity * pulse * fadeIn,
              boxShadow: `0 0 ${p.size * 3}px ${color}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
