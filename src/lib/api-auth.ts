import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  hashApiKey,
  isValidKeyFormat,
  parsePermissions,
  hasPermission,
  type PermissionScope,
} from '@/lib/api-key-crypto';

/**
 * API key authentication result.
 */
export interface AuthResult {
  authenticated: boolean;
  keyId?: string;
  keyName?: string;
  ownerId?: string;
  permissions?: string[];
  error?: string;
  statusCode?: number;
}

/**
 * Extract and validate an API key from a request.
 *
 * Supports two header formats:
 *   - Authorization: Bearer fep_live_...
 *   - x-api-key: fep_live_...
 *
 * Returns the key record if valid, or an error result.
 * Also updates lastUsedAt on the key (fire-and-forget, non-blocking).
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<AuthResult> {
  // Extract the key from headers
  let rawKey: string | null = null;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7).trim();
  }

  if (!rawKey) {
    rawKey = request.headers.get('x-api-key');
  }

  if (!rawKey) {
    return {
      authenticated: false,
      error: 'Missing API key. Provide it via Authorization: Bearer <key> or x-api-key: <key> header.',
      statusCode: 401,
    };
  }

  // Validate format before hitting the database
  if (!isValidKeyFormat(rawKey)) {
    return {
      authenticated: false,
      error: 'Invalid API key format. Keys start with "fep_live_".',
      statusCode: 401,
    };
  }

  // Hash and look up
  const keyHash = hashApiKey(rawKey);
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Invalid or revoked API key.',
      statusCode: 401,
    };
  }

  if (apiKey.status !== 'active') {
    return {
      authenticated: false,
      error: 'This API key has been revoked.',
      statusCode: 401,
    };
  }

  // Fire-and-forget: update lastUsedAt
  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Non-critical — don't fail the request if this update fails
    });

  return {
    authenticated: true,
    keyId: apiKey.id,
    keyName: apiKey.name,
    ownerId: apiKey.ownerId,
    permissions: parsePermissions(apiKey.permissions),
  };
}

/**
 * Require a specific permission scope. Returns an error response if the
 * authenticated key doesn't have the required scope.
 *
 * Usage in a route handler:
 *   const auth = await authenticateApiKey(request);
 *   const permCheck = requirePermission(auth, 'forms:read');
 *   if (permCheck) return permCheck;
 */
export function requirePermission(
  auth: AuthResult,
  required: PermissionScope
): NextResponse | null {
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error ?? 'Unauthorized' },
      { status: auth.statusCode ?? 401 }
    );
  }

  if (!auth.permissions || !hasPermission(auth.permissions, required)) {
    return NextResponse.json(
      {
        error: `Insufficient permissions. Required scope: "${required}".`,
        keyName: auth.keyName,
      },
      { status: 403 }
    );
  }

  return null;
}
