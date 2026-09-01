import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { ConversationalFormRenderer } from '@/components/conversational/conversational-form-renderer';

/**
 * Public conversational form page — /f/[shareId]/chat
 *
 * Same form, presented as a chat. The user messages the bot, the bot asks
 * each question one at a time, and at the end the submission is created
 * automatically.
 */
interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default async function ConversationalFormPage({ params }: PageProps) {
  const { shareId } = await params;
  const form = await db.form.findUnique({ where: { shareId } });

  if (!form || form.status !== 'published') {
    notFound();
  }

  return (
    <ConversationalFormRenderer
      shareId={form.shareId}
      formName={form.name}
      formDescription={form.description ?? undefined}
    />
  );
}
