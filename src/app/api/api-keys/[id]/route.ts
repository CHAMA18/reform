import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { parsePermissions } from '@/lib/api-key-crypto';

/**
 * GET /api/api-keys/[id]
 *
 * Get a single API key's metadata (never the full key). Only the key's
 * owner can access it — keys belonging to other users return 404.
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
    // Scope by ownerId so a user can't access another user's key.
    const apiKey = await db.apiKey.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      status: apiKey.status,
      permissions: parsePermissions(apiKey.permissions),
      lastRotatedAt: apiKey.lastRotatedAt?.toISOString() ?? null,
      lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
      createdAt: apiKey.createdAt.toISOString(),
      updatedAt: apiKey.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/api-keys/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to get API key' }, { status: 500 });
  }
}

/**
 * PATCH /api/api-keys/[id]
 *
 * Update an API key's name or permissions. Only the owner can modify it.
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
    let body: { name?: string; permissions?: string[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }
    const { name, permissions } = body;

    // Scope by ownerId so users can't modify each other's keys.
    const existing = await db.apiKey.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const data: { name?: string; permissions?: string } = {};
    if (name && name.trim()) data.name = name.trim();
    if (permissions && Array.isArray(permissions)) {
      data.permissions = JSON.stringify(permissions);
    }

    const updated = await db.apiKey.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      status: updated.status,
      permissions: parsePermissions(updated.permissions),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[PATCH /api/api-keys/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}

/**
 * DELETE /api/api-keys/[id]
 *
 * Revoke (soft-delete) an API key. The key record is kept for audit but
 * its status is set to "revoked" so it immediately stops working. Only
 * the owner can revoke it.
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
    const existing = await db.apiKey.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await db.apiKey.update({
      where: { id },
      data: { status: 'revoked' },
    });

    return NextResponse.json({ id, status: 'revoked' });
  } catch (error) {
    console.error('[DELETE /api/api-keys/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
