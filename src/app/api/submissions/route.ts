import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateSubmission } from '@/lib/flowchart/validation-engine';
import type { GeneratedSchema } from '@/lib/flowchart/types';

/**
 * POST /api/submissions
 *
 * Submit a form response. Uses the dynamic validation engine to validate
 * the payload against the rules defined in the form config — NO validation
 * logic is hardcoded in this route handler.
 *
 * Body: { shareId: string, data: Record<string, unknown> }
 * Response: { id: string, status: string }
 *   422: { error: string, errors: Record<string, string> } (field-level)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shareId, data } = body as {
      shareId?: string;
      data?: Record<string, unknown>;
    };

    if (!shareId) {
      return NextResponse.json(
        { error: 'shareId is required' },
        { status: 400 }
      );
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Submission data is required' },
        { status: 400 }
      );
    }

    const form = await db.form.findUnique({
      where: { shareId },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    if (form.status !== 'published') {
      return NextResponse.json(
        { error: 'This form is not currently accepting submissions' },
        { status: 403 }
      );
    }

    // Parse the form's generated schema
    let schema: GeneratedSchema;
    try {
      schema = JSON.parse(form.schema) as GeneratedSchema;
    } catch {
      return NextResponse.json(
        { error: 'Form schema is corrupted' },
        { status: 500 }
      );
    }

    // --- DYNAMIC VALIDATION ---
    // Validation rules are read from the form config (schema) and evaluated
    // at runtime by the validation engine. No hardcoded rules here —
    // changing validation behavior requires only updating the form config.
    const validationResult = validateSubmission(schema, data);
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed. Please check the highlighted fields.',
          errors: validationResult.errors,
        },
        { status: 422 }
      );
    }

    // Get the submitter's IP (best-effort)
    const forwarded = request.headers.get('x-forwarded-for');
    const source = forwarded
      ? forwarded.split(',')[0].trim()
      : request.headers.get('x-real-ip') ?? 'unknown';

    // Persist the submission
    const submission = await db.submission.create({
      data: {
        formId: form.id,
        data: JSON.stringify(data),
        source,
        status: 'Live',
      },
    });

    return NextResponse.json({
      id: submission.id.toISOString(),
      status: 'Live',
    });
  } catch (error) {
    console.error('[POST /api/submissions] error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/submissions
 *
 * List all submissions for forms OWNED BY THE CURRENT USER. Submissions
 * belonging to other users' forms are not included. Optionally filter
 * by ?formId= or ?shareId= (the form must belong to the caller).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const shareId = searchParams.get('shareId');

    // Require authentication — submissions are scoped to the current user.
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to list submissions.' },
        { status: 401 }
      );
    }

    // Build the where clause — always scope to the current user's forms.
    const where: { form?: { ownerId: string }; formId?: string } = {
      form: { ownerId: user.id },
    };
    if (formId) where.formId = formId;

    if (shareId) {
      // Verify the form exists AND belongs to the caller.
      const form = await db.form.findFirst({
        where: { shareId, ownerId: user.id },
        select: { id: true },
      });
      if (!form) {
        return NextResponse.json({ submissions: [] });
      }
      where.formId = form.id;
    }

    const submissions = await db.submission.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 200,
      include: {
        form: {
          select: { id: true, name: true, shareId: true },
        },
      },
    });

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id.toISOString(),
        formId: s.formId,
        formName: s.form.name,
        data: JSON.parse(s.data),
        source: s.source,
        status: s.status,
        timestamp: s.id.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[GET /api/submissions] error:', error);
    return NextResponse.json(
      { error: 'Failed to list submissions' },
      { status: 500 }
    );
  }
}
