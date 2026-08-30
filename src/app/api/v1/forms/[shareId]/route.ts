import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiKey, requirePermission } from '@/lib/api-auth';
import type { GeneratedSchema } from '@/lib/flowchart/types';

/**
 * GET /api/v1/forms/[shareId]
 *
 * Get a single form's schema. Requires `forms:read`.
 *
 * Response: {
 *   id, shareId, name, description, status, schema: GeneratedSchema, createdAt
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const auth = await authenticateApiKey(request);
  const permCheck = requirePermission(auth, 'forms:read');
  if (permCheck) return permCheck;

  try {
    const { shareId } = await params;
    // Scope by ownerId so users can't read other users' forms by shareId.
    const form = await db.form.findFirst({
      where: { shareId, ownerId: auth.ownerId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    let schema: GeneratedSchema;
    try {
      schema = JSON.parse(form.schema) as GeneratedSchema;
    } catch {
      return NextResponse.json({ error: 'Form schema is corrupted' }, { status: 500 });
    }

    return NextResponse.json({
      id: form.id,
      shareId: form.shareId,
      name: form.name,
      description: form.description,
      status: form.status,
      schema,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/v1/forms/[shareId]] error:', error);
    return NextResponse.json({ error: 'Failed to get form' }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/forms/[shareId]
 *
 * Update a form's name, description, and/or flowchart via the public
 * REST API. Requires the `forms:write` scope. Only the API key's owner
 * can update their own forms.
 *
 * Body (all fields optional): {
 *   name?: string,
 *   description?: string | null,
 *   flowchart?: Flowchart,
 *   status?: 'draft' | 'published'
 * }
 *
 * Response: { id, shareId, name, description, status, updatedAt }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const auth = await authenticateApiKey(request);
  const permCheck = requirePermission(auth, 'forms:write');
  if (permCheck) return permCheck;

  try {
    const { shareId } = await params;
    let body: {
      name?: string;
      description?: string | null;
      flowchart?: unknown;
      status?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Scope by ownerId — users can only update their own forms.
    const existing = await db.form.findFirst({
      where: { shareId, ownerId: auth.ownerId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const data: {
      name?: string;
      description?: string | null;
      flowchart?: string;
      schema?: string;
      status?: string;
    } = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { error: 'Form name cannot be empty' },
          { status: 400 }
        );
      }
      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || null;
    }

    if (body.status !== undefined) {
      if (!['draft', 'published'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Status must be "draft" or "published"' },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    if (body.flowchart !== undefined) {
      const { validateFlowchart, generateSchema } = await import('@/lib/flowchart/schema-generator');
      const fc = body.flowchart as Parameters<typeof generateSchema>[0];

      const errors = validateFlowchart(fc);
      if (errors.length > 0) {
        return NextResponse.json(
          { error: `Flowchart validation failed: ${errors.join('; ')}` },
          { status: 400 }
        );
      }

      const nameForSchema = data.name ?? existing.name;
      const newSchema = generateSchema(fc, nameForSchema);
      data.flowchart = JSON.stringify(fc);
      data.schema = JSON.stringify(newSchema);
    }

    const updated = await db.form.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      shareId: updated.shareId,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[PATCH /api/v1/forms/[shareId]] error:', error);
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/forms/[shareId]
 *
 * Delete a form and all its submissions (cascade) via the public REST
 * API. Requires the `forms:write` scope. Only the API key's owner can
 * delete their own forms.
 *
 * Response: { id, shareId, deleted: true }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const auth = await authenticateApiKey(request);
  const permCheck = requirePermission(auth, 'forms:write');
  if (permCheck) return permCheck;

  try {
    const { shareId } = await params;
    // Scope by ownerId — users can only delete their own forms.
    const existing = await db.form.findFirst({
      where: { shareId, ownerId: auth.ownerId },
      select: { id: true, shareId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    await db.form.delete({ where: { id: existing.id } });

    return NextResponse.json({
      id: existing.id,
      shareId: existing.shareId,
      deleted: true,
    });
  } catch (error) {
    console.error('[DELETE /api/v1/forms/[shareId]] error:', error);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}
