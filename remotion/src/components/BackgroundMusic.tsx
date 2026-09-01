/**
 * BackgroundMusic — Cinematic audio layer with volume envelope
 *
 * Features:
 *   - Fade in at start, fade out at end
 *   - Per-act volume mapping (quieter during dialogue moments, louder during reveals)
 *   - Optional mute for previewing without audio
 *   - Automatic looping if track is shorter than video
 *
 * Usage:
 *   Place your music file at remotion/public/music/background.mp3
 *   Then import and use in ReformCinematic:
 *     <BackgroundMusic src="./public/music/background.mp3" />
 *
 * Supported formats: mp3, wav, ogg, m4a
 */
import React from 'react';
import {
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

interface BackgroundMusicProps {
  /** Imported audio source (use require() or import) */
  src?: any;
  /** Path relative to remotion/public/ (fallback) */
  srcPath?: string;
  /** Base volume (0-1), default 0.35 */
  volume?: number;
  /** Fade in duration in seconds */
  fadeInDuration?: number;
  /** Fade out duration in seconds */
  fadeOutDuration?: number;
  /** Custom volume envelope: array of {frame, volume} keyframes */
  envelope?: Array<{ frame: number; volume: number }>;
  /** Whether audio is muted (for preview) */
  muted?: boolean;
}

/**
 * Default cinematic volume envelope:
 *   - Low during The Void (atmospheric)
 *   - Building during The Chaos
 *   - Rising during The Vision
 *   - Full during The Power
 *   - Slightly pulled back during The Impact (let numbers breathe)
 *   - Building during The Foundation
 *   - Full during The Close, fading out at the end
 */
const DEFAULT_ENVELOPE: Array<{ frame: number; volume: number }> = [
  // ACT I — THE VOID (0-150): atmospheric, low
  { frame: 0, volume: 0 },
  { frame: 30, volume: 0.15 },
  { frame: 150, volume: 0.25 },

  // ACT II — THE CHAOS (150-450): building tension
  { frame: 200, volume: 0.3 },
  { frame: 350, volume: 0.4 },
  { frame: 430, volume: 0.5 },  // "The old way is broken" crescendo
  { frame: 450, volume: 0.35 },

  // ACT III — THE VISION (450-750): hopeful rise
  { frame: 500, volume: 0.3 },
  { frame: 580, volume: 0.2 },  // "What if..." moment — pull back
  { frame: 650, volume: 0.45 }, // "Introducing Reform" — swell
  { frame: 750, volume: 0.5 },

  // ACT IV — THE POWER (750-1500): full energy
  { frame: 800, volume: 0.55 },
  { frame: 1100, volume: 0.5 },
  { frame: 1400, volume: 0.55 },

  // ACT V — THE IMPACT (1500-1950): pull back for numbers
  { frame: 1500, volume: 0.4 },
  { frame: 1650, volume: 0.35 }, // $485 → $99 moment
  { frame: 1800, volume: 0.45 },
  { frame: 1950, volume: 0.5 },

  // ACT VI — THE FOUNDATION (1950-2250): steady
  { frame: 2000, volume: 0.45 },
  { frame: 2200, volume: 0.5 },

  // ACT VII — THE CLOSE (2250-2700): final swell + fade out
  { frame: 2300, volume: 0.55 },
  { frame: 2500, volume: 0.6 },  // climax
  { frame: 2600, volume: 0.45 },
  { frame: 2670, volume: 0.15 }, // fade out
  { frame: 2700, volume: 0 },
];

/**
 * Interpolate volume at a given frame using the envelope keyframes.
 */
function getVolumeAtFrame(
  frame: number,
  envelope: Array<{ frame: number; volume: number }>,
): number {
  // Before first keyframe
  if (frame <= envelope[0].frame) return envelope[0].volume;
  // After last keyframe
  if (frame >= envelope[envelope.length - 1].frame)
    return envelope[envelope.length - 1].volume;

  // Find surrounding keyframes
  for (let i = 0; i < envelope.length - 1; i++) {
    const a = envelope[i];
    const b = envelope[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const t = (frame - a.frame) / (b.frame - a.frame);
      // Smooth interpolation using cubic easing
      const smooth = t * t * (3 - 2 * t); // smoothstep
      return a.volume + (b.volume - a.volume) * smooth;
    }
  }

  return envelope[envelope.length - 1].volume;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
  src,
  srcPath = 'music/background.mp3',
  volume = 0.35,
  fadeInDuration = 1.5,
  fadeOutDuration = 3,
  envelope,
  muted = false,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const envelopeToUse = envelope || DEFAULT_ENVELOPE;
  const envelopeVolume = getVolumeAtFrame(frame, envelopeToUse);

  // Apply global fade in/out on top of envelope
  const fadeInFrames = fadeInDuration * fps;
  const fadeOutFrames = fadeOutDuration * fps;

  const globalFadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const globalFadeOut = interpolate(
    frame,
    [durationInFrames - fadeOutFrames, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    },
  );

  const finalVolume = muted ? 0 : volume * envelopeVolume * globalFadeIn * globalFadeOut;

  return (
    <Audio
      src={src || srcPath}
      volume={finalVolume}
      loop
    />
  );
};

/**
 * Helper: Generate a simple sine-wave tone as a placeholder audio file.
 * Run this script to create a 90-second silent tone at remotion/public/music/placeholder.mp3
 *
 * Usage: npx ts-node remotion/src/components/generate-placeholder-audio.ts
 */
export const PLACEHOLDER_INFO = `
To add background music:

1. Place your music file at: remotion/public/music/background.mp3
   (Supports mp3, wav, ogg, m4a)

2. The component is already wired into ReformCinematic.tsx
   with a cinematic volume envelope that:
   - Fades in during the opening void
   - Builds tension through the chaos scene
   - Swells at the "Introducing Reform" reveal
   - Pulls back during the cost comparison
   - Peaks at the final close
   - Fades out smoothly

3. Adjust volume with the \`volume\` prop (0-1, default 0.35):
   <BackgroundMusic volume={0.5} />

4. To preview without audio, set muted:
   <BackgroundMusic muted />

5. To use a custom volume envelope:
   <BackgroundMusic envelope={[
     { frame: 0, volume: 0 },
     { frame: 150, volume: 0.3 },
     { frame: 2700, volume: 0 },
   ]} />
`;
