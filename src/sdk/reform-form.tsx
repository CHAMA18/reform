'use client';

/**
 * ReformForm — embeddable React widget for embedding any published Reform
 * form into an external site.
 *
 * Usage:
 *
 *   import { ReformForm } from '@/sdk/reform-form';
 *
 *   <ReformForm
 *     shareId="c0mtfp67k8c8ea9ede2b7920f"
 *     host="https://your-reform-app.com"
 *     height={600}
 *     mode="standard" | "conversational" | "voice"
 *   />
 *
 * Or as a script tag (vanilla HTML):
 *
 *   <div id="reform-form"></div>
 *   <script src="https://your-reform-app.com/sdk/reform-form.js"
 *           data-share-id="..." data-host="..." data-mode="conversational">
 *   </script>
 *
 * The widget renders an iframe pointing at /embed/[shareId]?mode=...
 * which serves a minimal, embed-friendly version of the form (no app
 * shell, no nav, no branding footer). The iframe height auto-adjusts
 * based on the form's content via the postMessage API.
 */

import { useEffect, useRef, useState } from 'react';

interface ReformFormProps {
  /** The form's share ID (from /f/{shareId}) */
  shareId: string;
  /** Base URL of the Reform deployment. Defaults to the current origin. */
  host?: string;
  /** Embed mode: 'standard' (default), 'conversational' (chat), 'voice' (mic) */
  mode?: 'standard' | 'conversational' | 'voice';
  /** Fixed height in pixels. If omitted, auto-resizes to fit content. */
  height?: number;
  /** Optional CSS class to apply to the iframe wrapper */
  className?: string;
  /** Callback fired when the form is submitted successfully. Receives the
   * submission ID. */
  onSubmit?: (submissionId: string) => void;
  /** Callback fired when the form encounters an error. */
  onError?: (error: string) => void;
}

export function ReformForm({
  shareId,
  host,
  mode = 'standard',
  height,
  className,
  onSubmit,
  onError,
}: ReformFormProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [autoHeight, setAutoHeight] = useState(height ?? 600);

  // Default host to current origin (works for same-origin embeds)
  const baseUrl = host ?? (typeof window !== 'undefined' ? window.location.origin : '');

  // Build the embed URL — /embed/[shareId]?mode=...
  const modeParam = mode === 'standard' ? '' : `?mode=${mode}`;
  const src = `${baseUrl}/embed/${shareId}${modeParam}`;

  // Listen for postMessage events from the iframe (height + submission)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Verify origin for security
      if (baseUrl && event.origin !== baseUrl) return;

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'reform:height' && typeof data.height === 'number' && !height) {
        setAutoHeight(data.height);
      }

      if (data.type === 'reform:submitted' && typeof data.submissionId === 'string') {
        onSubmit?.(data.submissionId);
      }

      if (data.type === 'reform:error' && typeof data.message === 'string') {
        onError?.(data.message);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [baseUrl, height, onSubmit, onError]);

  return (
    <div
      className={`reform-embed-container ${className ?? ''}`}
      style={{
        width: '100%',
        height: height ?? autoHeight,
        maxWidth: '100%',
        overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        background: '#0c0a09',
      }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title="Reform form"
        style={{
          width: '100%',
          height: '100%',
          border: '0',
          display: 'block',
        }}
        allow="microphone"
        loading="lazy"
      />
    </div>
  );
}

export default ReformForm;
