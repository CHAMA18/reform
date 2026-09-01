/**
 * CinematicTransition — Professional scene transitions
 *
 * Provides: fade, zoom-blur, light-leak, and wipe transitions
 * with configurable duration and easing.
 */
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

type TransitionType = 'fade' | 'zoom-blur' | 'light-leak' | 'wipe';

interface CinematicTransitionProps {
  type?: TransitionType;
  duration?: number;
  color?: string;
}

export const CinematicTransition: React.FC<CinematicTransitionProps> = ({
  type = 'fade',
  duration = 15,
  color = '#f59e0b',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Transition happens in the last `duration` frames of this sequence
  const startFrame = durationInFrames - duration;
  const progress = interpolate(frame, [startFrame, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  if (type === 'fade') {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0c0a09',
          opacity: progress,
        }}
      />
    );
  }

  if (type === 'zoom-blur') {
    const scale = interpolate(progress, [0, 1], [1, 1.5]);
    const blur = interpolate(progress, [0, 1], [0, 20]);
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0c0a09',
          opacity: progress,
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
        }}
      />
    );
  }

  if (type === 'light-leak') {
    const leakOpacity = interpolate(progress, [0, 0.5, 1], [0, 0.8, 1]);
    const leakX = interpolate(progress, [0, 1], [-100, 100]);
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {/* Background darkening */}
        <AbsoluteFill
          style={{
            backgroundColor: '#0c0a09',
            opacity: progress,
          }}
        />
        {/* Light leak sweep */}
        <div
          style={{
            position: 'absolute',
            left: `${leakX}%`,
            top: '-20%',
            width: '40%',
            height: '140%',
            background: `linear-gradient(90deg, transparent, ${color}40, ${color}80, ${color}40, transparent)`,
            opacity: leakOpacity,
            transform: 'rotate(-15deg)',
            filter: 'blur(40px)',
          }}
        />
      </AbsoluteFill>
    );
  }

  if (type === 'wipe') {
    const wipeX = interpolate(progress, [0, 1], [-100, 0]);
    return (
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0c0a09',
            transform: `translateX(${wipeX}%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 4,
            height: '100%',
            backgroundColor: color,
            transform: `translateX(${wipeX + 100}%)`,
            boxShadow: `0 0 30px ${color}, 0 0 60px ${color}60`,
            opacity: progress < 1 ? 1 : 0,
          }}
        />
      </AbsoluteFill>
    );
  }

  return null;
};
