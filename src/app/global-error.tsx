'use client';

import { useEffect } from 'react';

/**
 * global-error.tsx
 *
 * Next.js's top-level error boundary. Catches errors that escape the root
 * layout itself (e.g. a crash during root layout render, or a hydration
 * error in a component that the layout mounts).
 *
 * This MUST be a Client Component and MUST define its own <html> and <body>
 * tags because it replaces the root layout entirely when it triggers.
 *
 * The fallback is intentionally minimal and dependency-free so that it can
 * still render even if the rest of the app's JS is broken.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging — server logs won't capture client errors.
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
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
      </body>
    </html>
  );
}
