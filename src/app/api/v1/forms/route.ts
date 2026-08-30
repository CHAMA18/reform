import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiKey, requirePermission } from '@/lib/api-auth';
import type { GeneratedSchema } from '@/lib/flowchart/types';

/**
 * GET /api/v1/forms
 *
 * List all published forms. Requires the `forms:read` scope.
 *
 * Headers: Authorization: Bearer <key>  (or x-api-key: <key>)
 *
 * Response: {
 *   forms: Array<{
 *     id, shareId, name, description, status, createdAt, submissionCount
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  const permCheck = requirePermission(auth, 'forms:read');
  if (permCheck) return permCheck;

  try {
    // Scope to the API key owner's forms — other users' forms are invisible.
    const forms = await db.form.findMany({
      where: { status: 'published', ownerId: auth.ownerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shareId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json({
      forms: forms.map((f) => ({
        id: f.id,
        shareId: f.shareId,
        name: f.name,
        description: f.description,
        status: f.status,
        submissionCount: f._count.submissions,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[GET /api/v1/forms] error:', error);
    return NextResponse.json({ error: 'Failed to list forms' }, { status: 500 });
  }
}

/**
 * POST /api/v1/forms
 *
 * Create a new form from a flowchart. Requires the `forms:write` scope.
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   flowchart: Flowchart
 * }
 *
 * Response: { id, shareId, name, status, createdAt }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  const permCheck = requirePermission(auth, 'forms:write');
  if (permCheck) return permCheck;

  try {
    let body: { name?: string; description?: string; flowchart?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }
    const { name, description, flowchart } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Form name is required' }, { status: 400 });
    }

    if (!flowchart || typeof flowchart !== 'object') {
      return NextResponse.json({ error: 'Valid flowchart is required' }, { status: 400 });
    }

    // Import the schema generator dynamically to avoid pulling client types
    const { generateSchema, validateFlowchart } = await import('@/lib/flowchart/schema-generator');
    const fc = flowchart as Parameters<typeof generateSchema>[0];

    const errors = validateFlowchart(fc);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Flowchart validation failed: ${errors.join('; ')}` },
        { status: 400 }
      );
    }

    const schema = generateSchema(fc, name);
    // auth.ownerId is guaranteed to exist because authenticateApiKey()
    // only returns authenticated: true when a valid key was found, and
    // every key has an ownerId. The `!` asserts this to TypeScript.
    const form = await db.form.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        flowchart: JSON.stringify(fc),
        schema: JSON.stringify(schema),
        status: 'published',
        ownerId: auth.ownerId!,
      },
    });

    return NextResponse.json({
      id: form.id,
      shareId: form.shareId,
      name: form.name,
      status: form.status,
      createdAt: form.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/v1/forms] error:', error);
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}
