'use client';

import { useEffect } from 'react';

/**
 * error.tsx
 *
 * Route-level error boundary. Catches errors thrown by any Client Component
 * in the current route segment (e.g. ParticleBackground crashing because
 * WebGL is disabled in the preview iframe sandbox).
 *
 * Without this, a single client-side crash blanks the whole page. With it,
 * the user sees a friendly fallback and a "Try again" button.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[route-error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#05070a',
        color: '#e6e9ef',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '480px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', marginBottom: '12px' }}>
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: '14px',
            lineHeight: '22px',
            color: '#9aa7c0',
            marginBottom: '24px',
          }}
        >
          The page hit an unexpected error. You can try again — if the
          problem persists, refreshing the browser usually clears it.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            background: '#0066ff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
