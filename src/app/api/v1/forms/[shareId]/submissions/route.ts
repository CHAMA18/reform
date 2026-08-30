import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiKey, requirePermission } from '@/lib/api-auth';
import type { GeneratedSchema } from '@/lib/flowchart/types';

/**
 * GET /api/v1/forms/[shareId]/submissions
 *
 * List submissions for a form. Requires `submissions:read`.
 *
 * Query params: ?limit=50&offset=0
 *
 * Response: {
 *   form: { id, name, shareId },
 *   submissions: Array<{ id, data, source, status, timestamp }>,
 *   total: number
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const auth = await authenticateApiKey(request);
  const permCheck = requirePermission(auth, 'submissions:read');
  if (permCheck) return permCheck;

  try {
    const { shareId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;

    // Scope by ownerId so users can't list submissions for other users' forms.
    const form = await db.form.findFirst({
      where: { shareId, ownerId: auth.ownerId },
      select: { id: true, name: true, shareId: true },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const [submissions, total] = await Promise.all([
      db.submission.findMany({
        where: { formId: form.id },
        orderBy: { id: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.submission.count({ where: { formId: form.id } }),
    ]);

    return NextResponse.json({
      form: { id: form.id, name: form.name, shareId: form.shareId },
      submissions: submissions.map((s) => ({
        id: s.id.toISOString(),
        data: JSON.parse(s.data),
        source: s.source,
        status: s.status,
        timestamp: s.id.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[GET /api/v1/forms/[shareId]/submissions] error:', error);
    return NextResponse.json({ error: 'Failed to list submissions' }, { status: 500 });
  }
}

/**
 * POST /api/v1/forms/[shareId]/submissions
 *
 * Submit a form response via the API. Requires `submissions:write`.
 * Validates required fields and respects conditional visibility.
 *
 * Body: { data: Record<string, unknown> }
 *
 * Response: { id, status } (201 Created)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const auth = await authenticateApiKey(request);
  const permCheck = requirePermission(auth, 'submissions:write');
  if (permCheck) return permCheck;

  try {
    const { shareId } = await params;
    let body: { data?: Record<string, unknown> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }
    const { data } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Submission data is required' },
        { status: 400 }
      );
    }

    // Scope by ownerId so users can't submit to other users' forms via API.
    const form = await db.form.findFirst({
      where: { shareId, ownerId: auth.ownerId },
    });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (form.status !== 'published') {
      return NextResponse.json(
        { error: 'This form is not accepting submissions' },
        { status: 403 }
      );
    }

    // Validate against the schema
    let schema: GeneratedSchema;
    try {
      schema = JSON.parse(form.schema) as GeneratedSchema;
    } catch {
      return NextResponse.json({ error: 'Form schema is corrupted' }, { status: 500 });
    }

    // --- DYNAMIC VALIDATION ---
    // Uses the validation engine which reads rules from the form config.
    // No hardcoded validation logic in this route handler.
    const { validateSubmission } = await import('@/lib/flowchart/validation-engine');
    const validationResult = validateSubmission(schema, data);
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed.',
          errors: validationResult.errors,
        },
        { status: 422 }
      );
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const source =
      forwarded?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      `api:${auth.keyName ?? 'unknown'}`;

    const submission = await db.submission.create({
      data: {
        formId: form.id,
        data: JSON.stringify(data),
        source,
        status: 'Live',
      },
    });

    return NextResponse.json(
      {
        id: submission.id.toISOString(),
        status: 'Live',
        formId: form.id,
        formName: form.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/v1/forms/[shareId]/submissions] error:', error);
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 });
  }
}
