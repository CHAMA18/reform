import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { ConversationalFormRenderer } from '@/components/conversational/conversational-form-renderer';

/**
 * Voice-first form page — /f/[shareId]/voice
 *
 * Same as the conversational form page, but with a more prominent mic UI
 * for voice-first input. Useful for mobile users or accessibility.
 */
interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default async function VoiceFormPage({ params }: PageProps) {
  const { shareId } = await params;
  const form = await db.form.findUnique({ where: { shareId } });
  if (!form || form.status !== 'published') notFound();

  return (
    <ConversationalFormRenderer
      shareId={form.shareId}
      formName={form.name}
      formDescription={form.description ?? undefined}
    />
  );
}
