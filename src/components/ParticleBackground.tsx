'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';

const decorativeParticles = [
  { left: '8%', top: '18%', size: '10px', delay: '0s', duration: '11s', opacity: 0.36 },
  { left: '18%', top: '74%', size: '6px', delay: '-2s', duration: '14s', opacity: 0.28 },
  { left: '32%', top: '12%', size: '14px', delay: '-5s', duration: '16s', opacity: 0.22 },
  { left: '44%', top: '30%', size: '8px', delay: '-1s', duration: '13s', opacity: 0.34 },
  { left: '57%', top: '16%', size: '12px', delay: '-6s', duration: '15s', opacity: 0.26 },
  { left: '63%', top: '68%', size: '7px', delay: '-3s', duration: '12s', opacity: 0.31 },
  { left: '74%', top: '24%', size: '16px', delay: '-4s', duration: '17s', opacity: 0.2 },
  { left: '82%', top: '56%', size: '9px', delay: '-7s', duration: '10s', opacity: 0.4 },
  { left: '90%', top: '14%', size: '5px', delay: '-2.5s', duration: '15s', opacity: 0.26 },
  { left: '12%', top: '42%', size: '7px', delay: '-4.5s', duration: '18s', opacity: 0.24 },
  { left: '26%', top: '58%', size: '11px', delay: '-8s', duration: '16s', opacity: 0.29 },
  { left: '39%', top: '82%', size: '6px', delay: '-1.5s', duration: '12s', opacity: 0.33 },
  { left: '51%', top: '49%', size: '18px', delay: '-9s', duration: '20s', opacity: 0.16 },
  { left: '69%', top: '40%', size: '8px', delay: '-6.5s', duration: '14s', opacity: 0.37 },
  { left: '86%', top: '80%', size: '13px', delay: '-3.5s', duration: '19s', opacity: 0.19 },
  { left: '96%', top: '44%', size: '6px', delay: '-7.5s', duration: '13s', opacity: 0.25 },
];

const signalBeams = [
  { left: '-8%', top: '12%', width: '32%', rotate: '-10deg', opacity: 0.14, duration: '18s', delay: '-4s' },
  { left: '8%', top: '68%', width: '46%', rotate: '8deg', opacity: 0.1, duration: '24s', delay: '-11s' },
  { left: '56%', top: '16%', width: '30%', rotate: '14deg', opacity: 0.12, duration: '20s', delay: '-8s' },
  { right: '-10%', top: '42%', width: '34%', rotate: '-14deg', opacity: 0.1, duration: '22s', delay: '-6s' },
];

const signalRings = [
  { size: '34rem', left: '50%', top: '34%', delay: '0s', duration: '26s', opacity: 0.18 },
  { size: '46rem', left: '50%', top: '36%', delay: '-8s', duration: '34s', opacity: 0.1 },
];

/**
 * ParticleBackground
 *
 * Renders a full-viewport Three.js particle field behind the landing page.
 *
 * Two layers are used to make the background feel alive "all over":
 *   1. Ambient field — ~8,000 small drifting particles (mostly Surface Variant
 *      with a Hyper-Blue minority) filling a wide volumetric volume.
 *   2. Feature stars — ~500 larger, brighter Hyper-Blue particles that drift
 *      slowly and add visual depth/glow anchors.
 *
 * Both layers react to mouse movement with smooth damping (kinetic parallax)
 * and rotate ambiently. Boundary wrapping keeps the field continuously dense
 * with no empty edges.
 */
export default function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // HYDRATION SAFETY: Before mounted, always use 'dark' (the SSR default)
  // so server and client first-render produce identical HTML. After mount,
  // use the real resolved theme. This prevents the hydration mismatch
  // where the server renders dark styles but the client (reading from
  // localStorage) renders light styles.
  const currentTheme = mounted ? (resolvedTheme ?? 'dark') : 'dark';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isLight = currentTheme === 'light';

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // --- WebGL resilience ---
    // In some sandbox / preview iframe environments, WebGL is disabled or
    // WebGLRenderer construction throws. If that happens, we silently bail
    // out — the CSS-only decorative layers below (aurora, grid, beams, dust)
    // still render a rich background, so the page is never blank.
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    try {
      // Probe WebGL support before creating the renderer, so we fail fast
      // with a clean error instead of an uncaught exception inside three.js.
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl') || probe.getContext('experimental-webgl');
      if (!gl) {
        // WebGL unavailable — skip Three.js entirely, CSS layers remain.
        return;
      }
      // Discard the probe context (it will be GC'd).

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
    } catch {
      // Three.js initialization failed (WebGL blocked, context lost, etc.).
      // Bail out — the CSS decorative layers below still render.
      return;
    }

    // Brand palette
    const colorPrimary = new THREE.Color(isLight ? '#0066ff' : '#0066ff'); // Hyper-Blue
    const colorPrimaryBright = new THREE.Color(isLight ? '#4d8bff' : '#4d8bff'); // Lighter blue for feature stars
    const colorSecondary = new THREE.Color(isLight ? '#9aa7c0' : '#32343e'); // Surface Variant
    const colorTertiary = new THREE.Color(isLight ? '#b77b65' : '#ffb59d'); // Subtle warm accent (rare)

    /* ----------------------------- Layer 1: Ambient field ----------------------------- */
    const ambientCount = 8000;
    const ambientGeometry = new THREE.BufferGeometry();
    const ambientPositions = new Float32Array(ambientCount * 3);
    const ambientVelocities = new Float32Array(ambientCount * 3);
    const ambientColors = new Float32Array(ambientCount * 3);

    // Field bounds — wide enough to cover any viewport at any scroll position
    const FIELD_X = 30;
    const FIELD_Y = 20;
    const FIELD_Z = 14;
    const WRAP_X = 15;
    const WRAP_Y = 10;

    for (let i = 0; i < ambientCount; i++) {
      ambientPositions[i * 3] = (Math.random() - 0.5) * FIELD_X * 2;
      ambientPositions[i * 3 + 1] = (Math.random() - 0.5) * FIELD_Y * 2;
      ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * FIELD_Z * 2;

      ambientVelocities[i * 3] = (Math.random() - 0.5) * 0.012;
      ambientVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.012;
      ambientVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.006;

      // Brand-aligned color distribution — ~30% blue, ~68% surface, ~2% warm accent
      const mix = Math.random();
      let finalColor: THREE.Color;
      if (mix > 0.98) finalColor = colorTertiary;
      else if (mix > 0.7) finalColor = colorPrimary;
      else finalColor = colorSecondary;
      ambientColors[i * 3] = finalColor.r;
      ambientColors[i * 3 + 1] = finalColor.g;
      ambientColors[i * 3 + 2] = finalColor.b;
    }

    ambientGeometry.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
    ambientGeometry.setAttribute('color', new THREE.BufferAttribute(ambientColors, 3));

    const ambientMaterial = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: isLight ? 0.32 : 0.55,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const ambientPoints = new THREE.Points(ambientGeometry, ambientMaterial);
    scene.add(ambientPoints);

    /* ----------------------------- Layer 2: Feature stars ----------------------------- */
    const featureCount = 500;
    const featureGeometry = new THREE.BufferGeometry();
    const featurePositions = new Float32Array(featureCount * 3);
    const featureVelocities = new Float32Array(featureCount * 3);
    const featureColors = new Float32Array(featureCount * 3);

    for (let i = 0; i < featureCount; i++) {
      featurePositions[i * 3] = (Math.random() - 0.5) * FIELD_X * 2;
      featurePositions[i * 3 + 1] = (Math.random() - 0.5) * FIELD_Y * 2;
      featurePositions[i * 3 + 2] = (Math.random() - 0.5) * FIELD_Z * 2;

      // Slower drift for the feature layer — they feel more like distant stars
      featureVelocities[i * 3] = (Math.random() - 0.5) * 0.004;
      featureVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.004;
      featureVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;

      // Mix of bright and standard blue
      const mix = Math.random();
      const finalColor = mix > 0.5 ? colorPrimaryBright : colorPrimary;
      featureColors[i * 3] = finalColor.r;
      featureColors[i * 3 + 1] = finalColor.g;
      featureColors[i * 3 + 2] = finalColor.b;
    }

    featureGeometry.setAttribute('position', new THREE.BufferAttribute(featurePositions, 3));
    featureGeometry.setAttribute('color', new THREE.BufferAttribute(featureColors, 3));

    const featureMaterial = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: isLight ? 0.65 : 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const featurePoints = new THREE.Points(featureGeometry, featureMaterial);
    scene.add(featurePoints);

    /* ----------------------------- Interaction ----------------------------- */
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Smooth damping for mouse movement
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      // Update ambient field
      const aPos = ambientGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < ambientCount; i++) {
        aPos[i * 3] += ambientVelocities[i * 3];
        aPos[i * 3 + 1] += ambientVelocities[i * 3 + 1];
        aPos[i * 3 + 2] += ambientVelocities[i * 3 + 2];

        if (aPos[i * 3] > WRAP_X) aPos[i * 3] = -WRAP_X;
        if (aPos[i * 3] < -WRAP_X) aPos[i * 3] = WRAP_X;
        if (aPos[i * 3 + 1] > WRAP_Y) aPos[i * 3 + 1] = -WRAP_Y;
        if (aPos[i * 3 + 1] < -WRAP_Y) aPos[i * 3 + 1] = WRAP_Y;
      }
      ambientGeometry.attributes.position.needsUpdate = true;

      // Update feature stars
      const fPos = featureGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < featureCount; i++) {
        fPos[i * 3] += featureVelocities[i * 3];
        fPos[i * 3 + 1] += featureVelocities[i * 3 + 1];
        fPos[i * 3 + 2] += featureVelocities[i * 3 + 2];

        if (fPos[i * 3] > WRAP_X) fPos[i * 3] = -WRAP_X;
        if (fPos[i * 3] < -WRAP_X) fPos[i * 3] = WRAP_X;
        if (fPos[i * 3 + 1] > WRAP_Y) fPos[i * 3 + 1] = -WRAP_Y;
        if (fPos[i * 3 + 1] < -WRAP_Y) fPos[i * 3 + 1] = WRAP_Y;
      }
      featureGeometry.attributes.position.needsUpdate = true;

      // Kinetic parallax — feature layer moves slightly more for depth
      ambientPoints.rotation.y = mouseX * 0.2;
      ambientPoints.rotation.x = -mouseY * 0.2;
      ambientPoints.rotation.z += 0.0005;

      featurePoints.rotation.y = mouseX * 0.32;
      featurePoints.rotation.x = -mouseY * 0.32;
      featurePoints.rotation.z -= 0.0003;

      renderer.render(scene, camera);
    };

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      ambientGeometry.dispose();
      ambientMaterial.dispose();
      featureGeometry.dispose();
      featureMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentTheme]);

  const isLight = currentTheme === 'light';
  return (
    <div
      ref={containerRef}
      className="particle-backdrop fixed inset-0 w-full h-full pointer-events-none z-[-1] bg-transparent overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            isLight
              ? 'radial-gradient(circle at 20% 20%, rgba(0, 102, 255, 0.09), transparent 24%), radial-gradient(circle at 80% 24%, rgba(159, 98, 78, 0.07), transparent 18%), radial-gradient(circle at 50% 78%, rgba(178, 197, 255, 0.12), transparent 22%), linear-gradient(180deg, rgba(246, 248, 252, 0.98) 0%, rgba(239, 244, 251, 0.98) 48%, rgba(255, 255, 255, 1) 100%)'
              : 'radial-gradient(circle at 20% 20%, rgba(0, 102, 255, 0.12), transparent 24%), radial-gradient(circle at 80% 24%, rgba(159, 98, 78, 0.1), transparent 18%), radial-gradient(circle at 50% 78%, rgba(178, 197, 255, 0.06), transparent 22%), linear-gradient(180deg, rgba(5, 7, 10, 0.92) 0%, rgba(16, 19, 28, 0.96) 45%, rgba(10, 13, 19, 1) 100%)',
        }}
        suppressHydrationWarning
      />
      <div className="particle-vignette" />
      <div className="particle-aurora particle-aurora-a" />
      <div className="particle-aurora particle-aurora-b" />
      <div className="particle-aurora particle-aurora-c" />
      <div className="particle-grid-strong" />
      <div className="particle-diagonal-sheen" />
      <div className="particle-ribbons">
        <span className="particle-ribbon particle-ribbon-a" />
        <span className="particle-ribbon particle-ribbon-b" />
      </div>
      <div className="particle-rings">
        {signalRings.map((ring, index) => (
          <span
            key={`ring-${index}`}
            className="particle-ring"
            style={{
              width: ring.size,
              height: ring.size,
              left: ring.left,
              top: ring.top,
              opacity: ring.opacity,
              animationDelay: ring.delay,
              animationDuration: ring.duration,
            }}
          />
        ))}
      </div>
      <div className="particle-beams">
        {signalBeams.map((beam, index) => (
          <span
            key={`beam-${index}`}
            className="particle-beam"
            style={{
              left: beam.left,
              right: beam.right,
              top: beam.top,
              width: beam.width,
              transform: `rotate(${beam.rotate})`,
              opacity: beam.opacity,
              animationDuration: beam.duration,
              animationDelay: beam.delay,
            }}
          />
        ))}
      </div>
      <div className="particle-orb particle-orb-a" />
      <div className="particle-orb particle-orb-b" />
      <div className="particle-orb particle-orb-c" />
      <div className="particle-echo particle-echo-a" />
      <div className="particle-echo particle-echo-b" />
      <div className="particle-grid" />
      <div className="particle-noise" />
      <div className="particle-scanfield" />
      <div className="particle-links">
        <span className="particle-link particle-link-a" />
        <span className="particle-link particle-link-b" />
        <span className="particle-link particle-link-c" />
      </div>
      <div className="particle-dust">
        {decorativeParticles.map((particle, index) => (
          <span
            key={`${particle.left}-${particle.top}-${index}`}
            className="particle-dust-item"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>
      <div className="particle-corner-hud particle-corner-hud-a" />
      <div className="particle-corner-hud particle-corner-hud-b" />
    </div>
  );
}
