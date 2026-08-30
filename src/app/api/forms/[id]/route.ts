import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateSchema, validateFlowchart } from '@/lib/flowchart/schema-generator';
import type { Flowchart } from '@/lib/flowchart/types';

/**
 * GET /api/forms/[id]
 *
 * Get a single form by its internal ID (not shareId). Only the form's
 * owner can access it. Used by the flowchart builder's edit mode to
 * load an existing form for editing.
 *
 * Response: {
 *   id, shareId, name, description, status, flowchart, schema,
 *   createdAt, updatedAt
 * }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'You must be signed in.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    // Scope by ownerId so users can't read other users' forms.
    const form = await db.form.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: form.id,
      shareId: form.shareId,
      name: form.name,
      description: form.description,
      status: form.status,
      flowchart: form.flowchart,
      schema: form.schema,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/forms/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to get form' }, { status: 500 });
  }
}

/**
 * PATCH /api/forms/[id]
 *
 * Update a form's name, description, and/or flowchart. Only the form's
 * owner can update it. When the flowchart changes, the schema is
 * re-generated automatically.
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
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'You must be signed in.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    let body: {
      name?: string;
      description?: string | null;
      flowchart?: Flowchart;
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

    // Scope by ownerId so users can't modify each other's forms.
    const existing = await db.form.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Build the update data — only fields that were provided.
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

    // If the flowchart is being updated, validate it and regenerate the schema.
    if (body.flowchart !== undefined) {
      if (!body.flowchart.nodes || !Array.isArray(body.flowchart.nodes)) {
        return NextResponse.json(
          { error: 'Valid flowchart is required' },
          { status: 400 }
        );
      }

      const errors = validateFlowchart(body.flowchart);
      if (errors.length > 0) {
        return NextResponse.json(
          { error: `Flowchart validation failed: ${errors.join('; ')}` },
          { status: 400 }
        );
      }

      // Regenerate the schema from the updated flowchart. Use the new
      // name if provided, otherwise keep the existing name.
      const nameForSchema = data.name ?? existing.name;
      const newSchema = generateSchema(body.flowchart, nameForSchema);

      data.flowchart = JSON.stringify(body.flowchart);
      data.schema = JSON.stringify(newSchema);
    }

    const updated = await db.form.update({
      where: { id },
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
    console.error('[PATCH /api/forms/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
  }
}

/**
 * DELETE /api/forms/[id]
 *
 * Delete a form and all its submissions (cascade). Only the form's
 * owner can delete it. This is a hard delete — the form and its
 * submissions are permanently removed from the database.
 *
 * Response: { id, deleted: true }
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'You must be signed in.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    // Scope by ownerId so users can't delete each other's forms.
    const existing = await db.form.findFirst({
      where: { id, ownerId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // The Submission table has onDelete: Cascade on the form relation,
    // so deleting the form automatically deletes all its submissions.
    await db.form.delete({ where: { id } });

    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    console.error('[DELETE /api/forms/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}
