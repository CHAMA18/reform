import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiKey, requirePermission } from '@/lib/api-auth';

/**
 * GET /api/v1/submissions
 *
 * List all submissions across all forms. Requires `submissions:read`.
 *
 * Query params: ?limit=50&offset=0&formId=<id>
 *
 * Response: {
 *   submissions: Array<{
 *     id, formId, formName, data, source, status, timestamp
 *   }>,
 *   total: number
 * }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  const permCheck = requirePermission(auth, 'submissions:read');
  if (permCheck) return permCheck;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;
    const formId = searchParams.get('formId');

    // Scope to the API key owner's forms only — other users' submissions
    // are invisible. If formId is provided, it must belong to the owner.
    const where = formId
      ? { formId, form: { ownerId: auth.ownerId } }
      : { form: { ownerId: auth.ownerId } };

    const [submissions, total] = await Promise.all([
      db.submission.findMany({
        where,
        orderBy: { id: 'desc' },
        take: limit,
        skip: offset,
        include: {
          form: { select: { id: true, name: true, shareId: true } },
        },
      }),
      db.submission.count({ where }),
    ]);

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id.toISOString(),
        formId: s.formId,
        formName: s.form.name,
        formShareId: s.form.shareId,
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
    console.error('[GET /api/v1/submissions] error:', error);
    return NextResponse.json({ error: 'Failed to list submissions' }, { status: 500 });
  }
}
