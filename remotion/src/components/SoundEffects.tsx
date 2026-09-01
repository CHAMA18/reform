/**
 * SoundEffects — Cinematic audio punctuation for key moments
 *
 * Provides pre-built sound effect triggers that sync with visual events.
 * Uses Web Audio API to generate tones programmatically (no external files needed).
 *
 * Usage:
 *   <SoundEffects>
 *     <WhooshTrigger frame={150} />
 *     <RevealTrigger frame={650} />
 *     <ImpactTrigger frame={1650} />
 *   </SoundEffects>
 */
import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface SoundEffectProps {
  /** Frame at which the sound should play */
  frame: number;
  /** Volume (0-1) */
  volume?: number;
  /** Duration in frames */
  duration?: number;
}

/**
 * Generates a whoosh sound using oscillator frequency sweep
 */
const useWhoosh = (frame: number, volume: number, duration: number) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasPlayedRef = useRef(false);
  const { fps } = useVideoConfig();
  const currentFrame = useCurrentFrame();

  useEffect(() => {
    if (currentFrame !== frame || hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Whoosh: frequency sweep from high to low
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration / fps);

      // Low-pass filter for smoothness
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration / fps);

      // Volume envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.15, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / fps);

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / fps);

      // Cleanup
      setTimeout(() => ctx.close(), (duration / fps) * 1000 + 100);
    } catch (e) {
      // Audio not available (SSR, headless, etc.) — silently skip
    }
  }, [currentFrame]);
};

/**
 * Generates a reveal/chime sound
 */
const useReveal = (frame: number, volume: number) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasPlayedRef = useRef(false);
  const { fps } = useVideoConfig();
  const currentFrame = useCurrentFrame();

  useEffect(() => {
    if (currentFrame !== frame || hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      // Two-tone chime
      [523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(volume * 0.12, ctx.currentTime + i * 0.1 + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.5);
      });

      setTimeout(() => ctx.close(), 800);
    } catch (e) {
      // Silently skip
    }
  }, [currentFrame]);
};

/**
 * Generates a deep impact/boom sound
 */
const useImpact = (frame: number, volume: number) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasPlayedRef = useRef(false);
  const { fps } = useVideoConfig();
  const currentFrame = useCurrentFrame();

  useEffect(() => {
    if (currentFrame !== frame || hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      // Deep impact
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);

      // Second harmonic for texture
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(60, ctx.currentTime);
      gain2.gain.setValueAtTime(volume * 0.08, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.4);

      setTimeout(() => ctx.close(), 1000);
    } catch (e) {
      // Silently skip
    }
  }, [currentFrame]);
};

// === Exported trigger components ===

export const WhooshTrigger: React.FC<SoundEffectProps> = ({
  frame,
  volume = 0.5,
  duration = 20,
}) => {
  useWhoosh(frame, volume, duration);
  return null;
};

export const RevealTrigger: React.FC<SoundEffectProps> = ({
  frame,
  volume = 0.5,
}) => {
  useReveal(frame, volume);
  return null;
};

export const ImpactTrigger: React.FC<SoundEffectProps> = ({
  frame,
  volume = 0.5,
}) => {
  useImpact(frame, volume);
  return null;
};

/**
 * SoundEffects wrapper — place inside the composition to add all SFX.
 *
 * Key moments mapped to the 7-act structure:
 *   - Frame 150:  Logo reveal (ACT I → ACT II transition)
 *   - Frame 430:  "The old way is broken" impact
 *   - Frame 450:  ACT II → ACT III transition whoosh
 *   - Frame 650:  "Introducing Reform" reveal
 *   - Frame 750:  ACT III → ACT IV transition whoosh
 *   - Frame 1500: ACT IV → ACT V transition whoosh
 *   - Frame 1650: $485 → $99 impact
 *   - Frame 1950: ACT V → ACT VI transition whoosh
 *   - Frame 2250: ACT VI → ACT VII transition whoosh
 *   - Frame 2500: Final logo climax reveal
 */
export const CinematicSFX: React.FC = () => {
  return (
    <>
      {/* ACT I → II: Logo reveal */}
      <RevealTrigger frame={140} volume={0.4} />

      {/* "The old way is broken" */}
      <ImpactTrigger frame={430} volume={0.5} />

      {/* ACT II → III transition */}
      <WhooshTrigger frame={450} volume={0.3} duration={25} />

      {/* "Introducing Reform" */}
      <RevealTrigger frame={650} volume={0.6} />

      {/* ACT III → IV transition */}
      <WhooshTrigger frame={750} volume={0.3} duration={25} />

      {/* ACT IV → V transition */}
      <WhooshTrigger frame={1500} volume={0.3} duration={25} />

      {/* $485 → $99 impact */}
      <ImpactTrigger frame={1650} volume={0.6} />

      {/* ACT V → VI transition */}
      <WhooshTrigger frame={1950} volume={0.3} duration={25} />

      {/* ACT VI → VII transition */}
      <WhooshTrigger frame={2250} volume={0.3} duration={25} />

      {/* Final logo climax */}
      <RevealTrigger frame={2500} volume={0.7} />
    </>
  );
};
