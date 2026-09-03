import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Interactive,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ReformDemo — the marketing "demo video" (homepage embed, 180s @ 30fps).
// Follows Remotion best practices:
//  - assets live in public/ and are referenced via staticFile()
//  - all animation is frame-driven (useCurrentFrame + interpolate / spring)
//  - scene boundaries come from <Series.Sequence>, with fade-in/out derived
//    from each sequence's own duration (no dead tail, no overflow)
//  - individual `scale` / `translate` style props instead of transform strings
//  - every scene is a named layer, editable in Remotion Studio
const W = 1920;
const H = 1080;
const FPS = 30;

const AMBER = '#f59e0b';
const BG = '#0c0a09';
const WHITE = '#f5f5f4';
const MUTED = '#a8a29e';
const GREEN = '#55d28c';
const BLUE = '#3b82f6';
const VIOLET = '#8b5cf6';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const easeOutCubic = Easing.out(Easing.cubic);

// Fade a scene in over the first `in` frames and out over the last `out` frames.
// `durationInFrames` is the sequence-local length, so every scene fits exactly.
const sceneOpacity = (frame: number, inF = 12, outF = 10) => {
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [0, inF, durationInFrames - outF, durationInFrames], [0, 1, 1, 0], clamp);
};

const drive = (frame: number, at: number, dur: number) => interpolate(frame - at, [0, dur], [0, 1], {
  ...clamp,
  easing: easeOutCubic,
});

const asset = (name: string) => staticFile(`reform-assets/${name}`);

/* ───────────────────────────────────────────── Shared chrome ─── */

const BrowserFrame: React.FC<{ url: string; children: React.ReactNode }> = ({ url, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = spring({ frame, fps, config: { damping: 22, stiffness: 90 }, durationInFrames: 24 });
  const opacity = sceneOpacity(frame);
  return (
    <AbsoluteFill name="Browser frame" style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          width: W - 400,
          height: H - 190,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #41362e',
          background: '#131110',
          boxShadow: '0 34px 90px rgba(0,0,0,.55)',
          scale: `${0.96 + 0.04 * grow}`,
        }}
      >
        <div
          style={{
            height: 46,
            background: '#24201c',
            borderBottom: '1px solid #40362e',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '0 16px',
          }}
        >
          <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#df705c' }} />
          <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#e5ad48' }} />
          <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#61b27d' }} />
          <div
            style={{
              marginLeft: 14,
              width: 560,
              borderRadius: 7,
              background: '#171411',
              padding: '7px 14px',
              color: '#9c9186',
              font: '13px monospace',
            }}
          >
            {url}
          </div>
        </div>
        <div style={{ width: W - 400, height: H - 236, overflow: 'hidden' }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};

const Cursor: React.FC<{ x: number; y: number; delay?: number }> = ({ x, y, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 80 } });
  const pulse = interpolate(frame - delay, [22, 26, 34, 46], [0, 0.9, 0.9, 0], clamp);
  return (
    <>
      <Interactive.Div
        name="Cursor"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          translate: `${interpolate(appear, [0, 1], [-80, 0])}px ${interpolate(appear, [0, 1], [46, 0])}px`,
          opacity: appear,
          zIndex: 8,
          filter: 'drop-shadow(0 2px 3px #000)',
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderBottom: '26px solid #fff',
            rotate: '-40deg',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 6,
            top: 3,
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: '18px solid #201910',
            rotate: '-40deg',
          }}
        />
      </Interactive.Div>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 54,
          height: 54,
          translate: '-50% -50%',
          borderRadius: '50%',
          border: `2px solid ${AMBER}`,
          opacity: pulse,
          zIndex: 7,
          boxShadow: `0 0 22px ${AMBER}`,
        }}
      />
    </>
  );
};

const Callout: React.FC<{ title: string; body: string; accent?: string; position?: [number, number] }> = ({
  title,
  body,
  accent = AMBER,
  position = [0, 0],
}) => {
  const frame = useCurrentFrame();
  const opacity = drive(frame, 16, 20);
  return (
    <AbsoluteFill
      name="Callout"
      style={{
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: '0 150px 120px',
        opacity,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          maxWidth: 820,
          translate: `${position[0]}px ${position[1]}px`,
        }}
      >
        <div style={{ width: 4, height: 52, borderRadius: 2, background: accent, boxShadow: `0 0 16px ${accent}` }} />
        <div>
          <div style={{ font: '700 26px "Space Grotesk", sans-serif', letterSpacing: '-0.01em', color: WHITE }}>
            {title}
          </div>
          <div style={{ marginTop: 4, font: '17px "DM Sans", sans-serif', color: MUTED, lineHeight: 1.45 }}>{body}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScreenImg: React.FC<{ img: string; zoom: [number, number]; pan?: [number, number] }> = ({
  img,
  zoom: [z0, z1],
  pan = [0, 0],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 6));
  const z = z0 + (z1 - z0) * p;
  return (
    <AbsoluteFill name="Screen" style={{ background: '#050707' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          scale: String(z),
          translate: `${pan[0]}px ${pan[1]}px`,
        }}
      >
        <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.06,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </AbsoluteFill>
  );
};

/* ───────────────────────────────────────────── Scene templates ─── */

const ScreenScene: React.FC<{
  name: string;
  img: string;
  url: string;
  title: string;
  body: string;
  accent?: string;
  cursor?: [number, number];
  zoom?: [number, number];
  calloutPosition?: [number, number];
}> = ({ name, img, url, title, body, accent = AMBER, cursor, zoom = [1.01, 1.07], calloutPosition }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill name={name} style={{ background: BG }}>
      <BrowserFrame url={url}>
        <ScreenImg img={img} zoom={zoom} />
      </BrowserFrame>
      <Callout title={title} body={body} accent={accent} position={calloutPosition} />
      {cursor && <Cursor x={cursor[0]} y={cursor[1]} delay={fps} />}
    </AbsoluteFill>
  );
};

const TextScene: React.FC<{
  name: string;
  eyebrow: string;
  title: string;
  body: string;
  fade?: boolean;
}> = ({ name, eyebrow, title, body, fade = false }) => {
  const frame = useCurrentFrame();
  const opacity = fade ? sceneOpacity(frame, 18, 16) : 1;
  const y = interpolate(frame, [0, 30], [36, 0], { ...clamp, easing: easeOutCubic });
  return (
    <AbsoluteFill
      name={name}
      style={{ background: BG, opacity, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
    >
      <div style={{ translate: `0px ${y}px`, maxWidth: 1150 }}>
        <div style={{ color: AMBER, letterSpacing: '.24em', font: '700 17px "DM Sans", sans-serif', textTransform: 'uppercase' }}>
          {eyebrow}
        </div>
        <div style={{ font: '700 74px/1.06 "Space Grotesk", sans-serif', letterSpacing: '-0.04em', margin: '26px 0 20px' }}>
          {title}
        </div>
        <p style={{ color: MUTED, font: '26px/1.5 "DM Sans", sans-serif', margin: '0 auto', maxWidth: 940 }}>{body}</p>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────────────────────────── Composition ─── */

export const ReformDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG, color: WHITE, fontFamily: '"DM Sans", sans-serif' }}>
      <Series>
        <Series.Sequence name="Hook — title" durationInFrames={11 * FPS}>
          <TextScene
            name="Hook"
            eyebrow="Reform"
            title="The form stack, rebuilt."
            body="Generate, design, ship, and understand every response — one platform, built on Xano."
            fade
          />
        </Series.Sequence>

        <Series.Sequence name="Landing" durationInFrames={9 * FPS}>
          <ScreenScene
            name="Landing page"
            img={asset('landing.png')}
            url="reform-7jo8.onrender.com/"
            title="Start with the real product"
            body="A focused entry point for teams building better customer experiences."
            cursor={[560, 500]}
          />
        </Series.Sequence>

        <Series.Sequence name="Dashboard" durationInFrames={23 * FPS}>
          <ScreenScene
            name="Dashboard"
            img={asset('dashboard.png')}
            url="reform-7jo8.onrender.com/dashboard"
            title="Everything starts here"
            body="Forms, submissions, completion rate, and AI activity in one command center."
            cursor={[600, 300]}
            zoom={[1.0, 1.05]}
          />
        </Series.Sequence>

        <Series.Sequence name="AI generator" durationInFrames={18 * FPS}>
          <ScreenScene
            name="AI Form Generator"
            img={asset('ai-gen.png')}
            url="reform-7jo8.onrender.com/forms/ai"
            title="Describe the form in plain English"
            body="Reform turns a prompt into a validated structure — fields, options, and logic included."
            cursor={[640, 470]}
            zoom={[1.02, 1.09]}
          />
        </Series.Sequence>

        <Series.Sequence name="Visual builder" durationInFrames={18 * FPS}>
          <ScreenScene
            name="Flowchart Builder"
            img={asset('builder.png')}
            url="reform-7jo8.onrender.com/forms/new"
            title="See the logic, not just the UI"
            body="The visual builder makes every branch explicit and keeps the experience editable."
            accent={GREEN}
            cursor={[700, 420]}
            zoom={[1.0, 1.06]}
          />
        </Series.Sequence>

        <Series.Sequence name="Conversational" durationInFrames={11 * FPS}>
          <ScreenScene
            name="Conversational form"
            img={asset('chat.png')}
            url="reform-7jo8.onrender.com/f/demo/chat"
            title="Answer by conversation"
            body="One question at a time — the AI follows the flow and captures the submission."
            accent={BLUE}
            zoom={[1.03, 1.08]}
            calloutPosition={[0, -60]}
          />
        </Series.Sequence>

        <Series.Sequence name="Voice" durationInFrames={10 * FPS}>
          <ScreenScene
            name="Voice mode"
            img={asset('voice.png')}
            url="reform-7jo8.onrender.com/f/demo/voice"
            title="Answer hands-free"
            body="Speak naturally — local transcription turns speech into structured answers."
            accent={AMBER}
            zoom={[1.02, 1.08]}
            calloutPosition={[0, -60]}
          />
        </Series.Sequence>

        <Series.Sequence name="Translation" durationInFrames={10 * FPS}>
          <ScreenScene
            name="Translation"
            img={asset('translate.png')}
            url="reform-7jo8.onrender.com/forms/demo/translate"
            title="Every visitor, in their language"
            body="One click translates the whole form — the visitor's language is detected automatically."
            accent={VIOLET}
            zoom={[1.04, 1.09]}
            calloutPosition={[0, -60]}
          />
        </Series.Sequence>

        <Series.Sequence name="Submissions" durationInFrames={16 * FPS}>
          <ScreenScene
            name="Submissions"
            img={asset('submissions.png')}
            url="reform-7jo8.onrender.com/submissions"
            title="Every response becomes signal"
            body="Inspect real submissions and move from raw answers to useful decisions."
            accent={VIOLET}
            cursor={[700, 400]}
            zoom={[1.0, 1.05]}
          />
        </Series.Sequence>

        <Series.Sequence name="Analytics" durationInFrames={12 * FPS}>
          <ScreenScene
            name="Drop-off analytics"
            img={asset('analytics.png')}
            url="reform-7jo8.onrender.com/forms/demo/analytics"
            title="AI finds the drop-off — and the fix"
            body="Per-field events become a readable report with concrete recommendations."
            accent={GREEN}
            zoom={[1.03, 1.08]}
          />
        </Series.Sequence>

        <Series.Sequence name="API keys" durationInFrames={12 * FPS}>
          <ScreenScene
            name="API keys"
            img={asset('api-keys.png')}
            url="reform-7jo8.onrender.com/api-keys"
            title="Built for developers too"
            body="Scoped API keys make the same workflow programmable and secure."
            accent={BLUE}
            cursor={[700, 330]}
            zoom={[1.0, 1.05]}
          />
        </Series.Sequence>

        <Series.Sequence name="Closing statement" durationInFrames={12 * FPS}>
          <TextScene
            name="Closing"
            eyebrow="One intelligent workflow"
            title="From prompt to production signal."
            body="Build the experience, publish it, and understand what comes back — without stitching together seven tools."
            fade
          />
        </Series.Sequence>

        <Series.Sequence name="End card" durationInFrames={18 * FPS}>
          <EndCard />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 18, stiffness: 70 } });
  const mark = interpolate(appear, [0, 1], [0.82, 1], clamp);
  const fade = sceneOpacity(frame, 20, 20);
  return (
    <AbsoluteFill name="End card" style={{ background: BG, opacity: fade, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ scale: String(mark), opacity: appear }}>
        <img
          src={asset('reform-mark.png')}
          alt="Reform"
          style={{ width: 132, height: 132, margin: '0 auto', display: 'block', filter: 'drop-shadow(0 0 44px rgba(245,158,11,.4))' }}
        />
        <div style={{ font: '700 88px/1 "Space Grotesk", sans-serif', letterSpacing: '-0.05em', marginTop: 28 }}>Reform</div>
        <div style={{ color: AMBER, font: '600 26px "DM Sans", sans-serif', marginTop: 12 }}>
          The operating system for better forms.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 34 }}>
          <span style={{ color: AMBER, border: `1px solid ${AMBER}66`, padding: '9px 17px', borderRadius: 999, font: '600 15px "DM Sans"' }}>
            AI-native
          </span>
          <span style={{ color: AMBER, border: `1px solid ${AMBER}66`, padding: '9px 17px', borderRadius: 999, font: '600 15px "DM Sans"' }}>
            Powered by Xano
          </span>
        </div>
        <div style={{ marginTop: 30, color: MUTED, font: '18px monospace' }}>reform-7jo8.onrender.com</div>
        <div style={{ marginTop: 44, color: '#78716c', font: '600 13px "DM Sans", sans-serif', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Made with Remotion
        </div>
      </div>
    </AbsoluteFill>
  );
};