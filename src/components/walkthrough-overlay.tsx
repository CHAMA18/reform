'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWalkthrough, TOUR_STEPS } from '@/lib/walkthrough';

/**
 * WalkthroughOverlay
 *
 * Renders the guided tour overlay: a darkened backdrop with a "spotlight"
 * cut out around the target element, plus a tooltip with navigation buttons.
 *
 * Handles route changes: if the current step is on a different route, the
 * overlay navigates there first, then waits for the target element to appear
 * before positioning the spotlight.
 */

type Side = 'top' | 'bottom' | 'left' | 'right';

export function WalkthroughOverlay() {
  const router = useRouter();
  const active = useWalkthrough((s) => s.active);
  const currentStep = useWalkthrough((s) => s.currentStep);
  const next = useWalkthrough((s) => s.next);
  const prev = useWalkthrough((s) => s.prev);
  const stop = useWalkthrough((s) => s.stop);
  const goTo = useWalkthrough((s) => s.goTo);

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [ready, setReady] = useState(false);

  const step = TOUR_STEPS[currentStep];
  const tooltipRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(step);
  stepRef.current = step;
  const pathname = usePathname();

  /**
   * Navigate to the step's route if needed, then find and highlight the target.
   */
  const positionForStep = useCallback(async () => {
    const currentStepData = stepRef.current;
    if (!currentStepData) return;

    const currentPath = window.location.pathname;
    const targetPath = currentStepData.route;
    const onCorrectRoute =
      currentPath === targetPath ||
      (targetPath !== '/' && currentPath.startsWith(targetPath));

    if (!onCorrectRoute) {
      setReady(false);
      setTargetRect(null);
      setTooltipPos(null);
      router.push(targetPath);
      return;
    }

    setReady(false);

    // Poll for the target element (up to 5 seconds)
    let el: Element | null = null;
    for (let i = 0; i < 50; i++) {
      el = document.querySelector(currentStepData.selector);
      if (el) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    if (!el) {
      setTargetRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: Math.max(16, window.innerWidth / 2 - 180),
      });
      setReady(true);
      return;
    }

    (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise((r) => setTimeout(r, 350));

    const rect = (el as HTMLElement).getBoundingClientRect();
    setTargetRect(rect);

    const side: Side = currentStepData.side ?? 'bottom';
    const tooltipWidth = 360;
    const tooltipHeight = 220;
    const gap = 16;
    const padding = 8;

    let top: number;
    let left: number;

    switch (side) {
      case 'top':
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        break;
    }

    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    setTooltipPos({ top, left });
    setReady(true);
  }, [router]);

  // Run positionForStep when step changes OR when the route changes
  useEffect(() => {
    if (!active || !step) return;
    positionForStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, currentStep, pathname]);

  // Reposition on resize
  useEffect(() => {
    if (!active) return;
    const handleResize = () => positionForStep();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active, positionForStep]);

  if (!active || !step) return null;

  return (
    <>
      {/* Dark overlay strips around the spotlight */}
      {targetRect ? (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: targetRect.top, background: 'rgba(5,7,10,0.85)', pointerEvents: 'auto', zIndex: 9998, transition: 'all 0.3s ease' }} />
          <div style={{ position: 'fixed', top: targetRect.top + targetRect.height, left: 0, right: 0, bottom: 0, background: 'rgba(5,7,10,0.85)', pointerEvents: 'auto', zIndex: 9998, transition: 'all 0.3s ease' }} />
          <div style={{ position: 'fixed', top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height, background: 'rgba(5,7,10,0.85)', pointerEvents: 'auto', zIndex: 9998, transition: 'all 0.3s ease' }} />
          <div style={{ position: 'fixed', top: targetRect.top, left: targetRect.left + targetRect.width, right: 0, height: targetRect.height, background: 'rgba(5,7,10,0.85)', pointerEvents: 'auto', zIndex: 9998, transition: 'all 0.3s ease' }} />
          {/* Highlight ring */}
          <div style={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 14,
            border: '2px solid #0066ff',
            boxShadow: '0 0 0 4px rgba(0,102,255,0.15), 0 0 30px rgba(0,102,255,0.3)',
            pointerEvents: 'none',
            zIndex: 9999,
            transition: 'all 0.3s ease',
          }} />
        </>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,10,0.85)', pointerEvents: 'auto', zIndex: 9998 }} />
      )}

      {/* Click catcher */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'auto' }}
        onClick={stop}
      />

      {/* Tooltip — shown whenever we have a position (even during loading) */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          style={{ position: 'fixed', top: tooltipPos.top, left: tooltipPos.left, width: 360, zIndex: 10000 }}
          className="rounded-2xl border border-white/10 bg-rf-surface-container shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 overflow-hidden rounded-t-2xl bg-white/5">
            <div
              className="h-full bg-rf-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-rf-primary">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              <button
                type="button"
                onClick={stop}
                className="rounded p-1 text-rf-on-surface-variant transition-colors hover:bg-white/5 hover:text-rf-on-surface"
                aria-label="Close tour"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {!ready ? (
              <div className="flex items-center gap-2 py-4 text-[13px] text-rf-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[18px] text-rf-primary">
                  progress_activity
                </span>
                Loading…
              </div>
            ) : (
              <>
                <h3 className="mb-2 text-[16px] font-bold text-rf-on-surface">{step.title}</h3>
                <p className="mb-4 text-[13px] leading-relaxed text-rf-on-surface-variant">{step.body}</p>
              </>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={prev}
                disabled={currentStep === 0}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-rf-on-surface-variant transition-colors hover:text-rf-on-surface disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back
              </button>

              <div className="flex items-center gap-1">
                {TOUR_STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentStep ? 'w-5 bg-rf-primary' : i < currentStep ? 'w-1.5 bg-rf-primary/50' : 'w-1.5 bg-white/15'
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              {currentStep + 1 >= TOUR_STEPS.length ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1 rounded-lg bg-rf-primary px-4 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-rf-primary/90"
                >
                  Finish
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1 rounded-lg bg-rf-primary px-4 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-rf-primary/90"
                >
                  Next
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={stop}
              className="mt-3 w-full text-center text-[11px] text-rf-on-surface-variant/60 transition-colors hover:text-rf-on-surface-variant"
            >
              Skip tour
            </button>
          </div>
        </div>
      )}
    </>
  );
}
