import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { PublicFormRenderer } from '@/components/flowchart/public-form-renderer';
import { ConversationalFormRenderer } from '@/components/conversational/conversational-form-renderer';
import type { GeneratedSchema } from '@/lib/flowchart/types';

/**
 * /embed/[shareId]
 *
 * Embed-friendly version of the public form — no app shell, no nav, no
 * branding footer. Designed to be loaded inside an iframe by the
 * ReformForm widget (or by any third-party site).
 *
 * Query params:
 *   mode=standard (default) | conversational | voice
 */
interface PageProps {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function EmbedPage({ params, searchParams }: PageProps) {
  const { shareId } = await params;
  const { mode } = await searchParams;
  const form = await db.form.findUnique({ where: { shareId } });

  if (!form || form.status !== 'published') notFound();

  // Conversational / voice mode renders the chat UI
  if (mode === 'conversational' || mode === 'voice') {
    return (
      <ConversationalFormRenderer
        shareId={form.shareId}
        formName={form.name}
        formDescription={form.description ?? undefined}
      />
    );
  }

  // Standard mode renders the form
  let schema: GeneratedSchema;
  try {
    schema = JSON.parse(form.schema as string);
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rf-surface-base p-6 text-center">
        <div>
          <h1 className="text-[20px] font-bold text-rf-on-surface">Form Unavailable</h1>
          <p className="mt-2 text-[13px] text-rf-on-surface-variant">
            This form&apos;s schema could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="embedded">
      <PublicFormRenderer
        shareId={form.shareId}
        formName={form.name}
        formDescription={form.description ?? undefined}
        schema={schema}
      />
      <script
        // Notify the parent window once the form renders. In a real
        // implementation we'd also send height updates on resize.
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function sendHeight() {
                var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
                window.parent.postMessage({ type: 'reform:height', height: h }, '*');
              }
              if (window.parent && window.parent !== window) {
                window.addEventListener('load', sendHeight);
                setTimeout(sendHeight, 100);
                setTimeout(sendHeight, 500);
                setTimeout(sendHeight, 1500);
              }
            })();
          `,
        }}
      />
    </div>
  );
}
