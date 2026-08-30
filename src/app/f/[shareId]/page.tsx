import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import type { Metadata } from 'next';
import { PublicFormRenderer } from '@/components/flowchart/public-form-renderer';
import type { GeneratedSchema } from '@/lib/flowchart/types';

/**
 * Public form page — /f/[shareId]
 *
 * This is the shareable link that form creators send to respondents.
 * It loads the form's schema from the database and renders it using
 * the PublicFormRenderer client component.
 */

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const form = await db.form.findUnique({
    where: { shareId },
    select: { name: true, description: true },
  });

  if (!form) {
    return { title: 'Form Not Found' };
  }

  return {
    title: `${form.name} | Reform`,
    description: form.description ?? undefined,
  };
}

export default async function PublicFormPage({ params }: PageProps) {
  const { shareId } = await params;

  const form = await db.form.findUnique({
    where: { shareId },
  });

  if (!form || form.status !== 'published') {
    notFound();
  }

  let schema: GeneratedSchema;
  try {
    schema = JSON.parse(form.schema) as GeneratedSchema;
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rf-surface-base p-6 text-center">
        <div>
          <h1 className="text-[24px] font-bold text-rf-on-surface">
            Form Unavailable
          </h1>
          <p className="mt-2 text-[14px] text-rf-on-surface-variant">
            This form&apos;s schema could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PublicFormRenderer
      shareId={form.shareId}
      formName={form.name}
      formDescription={form.description ?? undefined}
      schema={schema}
    />
  );
}
