'use client';

import { useWalkthrough } from '@/lib/walkthrough';

/**
 * StartTourButtonClient
 *
 * Client component that triggers the guided walkthrough. Used in the
 * Settings page (a server component) via the StartTourButton wrapper.
 */
export function StartTourButtonClient() {
  const start = useWalkthrough((s) => s.start);

  return (
    <button
      type="button"
      onClick={start}
      className="btn-primary flex items-center gap-2 rounded-lg px-6 py-3 text-[14px] font-bold"
    >
      <span className="material-symbols-outlined text-[18px]">tour</span>
      Start the Tour
    </button>
  );
}
