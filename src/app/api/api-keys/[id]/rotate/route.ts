import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
} from '@/lib/api-key-crypto';

/**
 * POST /api/api-keys/[id]/rotate
 *
 * Rotate an API key. Generates a new key string, updates the stored hash
 * and prefix, and returns the new full key to the user.
 *
 * The old key immediately stops working (its hash is overwritten).
 * The key id, name, permissions, and metadata all stay the same.
 *
 * Only the key's owner can rotate it — keys belonging to other users
 * return 404 (not 403, to avoid leaking the existence of other users' keys).
 *
 * Response: {
 *   id: string,
 *   key: string,        // NEW full key — only returned here
 *   keyPrefix: string,
 *   rotatedAt: string
 * }
 */
export async function POST(
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
    // Scope by ownerId so users can't rotate each other's keys.
    const existing = await db.apiKey.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existing.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot rotate a revoked key. Create a new one instead.' },
        { status: 400 }
      );
    }

    // Generate the new key
    const newKey = generateApiKey();
    const newHash = hashApiKey(newKey);
    const newPrefix = getKeyPrefix(newKey);

    // Update the record — the old hash is overwritten, so the old key
    // immediately becomes invalid on the next lookup.
    await db.apiKey.update({
      where: { id },
      data: {
        keyHash: newHash,
        keyPrefix: newPrefix,
        lastRotatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id,
      key: newKey, // ONLY returned at rotation time
      keyPrefix: newPrefix,
      rotatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[POST /api/api-keys/[id]/rotate] error:', error);
    return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 });
  }
}
