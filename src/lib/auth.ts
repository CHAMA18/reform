import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

/**
 * Authentication library — real database-backed auth.
 *
 * Uses SHA-256 password hashing (simple but functional for a prototype;
 * would use bcrypt/argon2 in production). Session tokens are 32-byte
 * random strings stored in a cookie and looked up in the Session table.
 */

export const SESSION_COOKIE = 'fep_session';
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Hash a password using SHA-256 with a per-user salt.
 * Format: salt:hash (both hex strings)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHash] = stored.split(':');
  if (!salt || !expectedHash) return false;
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}

/**
 * Generate a random session token (32 bytes = 64 hex chars).
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user and set the cookie.
 * Call this from a Server Component or Route Handler.
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  // Set the cookie (only works in Server Components / Route Handlers)
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_MS / 1000,
    });
  } catch {
    // Not in a Server Component context — caller handles cookie
  }

  return token;
}

/**
 * Get the current user from the session cookie.
 * Returns null if not authenticated or session expired.
 *
 * Call this from Server Components to get the logged-in user.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
      // Session expired — delete it
      await db.session.delete({ where: { id: session.id } });
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

/**
 * Destroy the current session (logout).
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      await db.session.deleteMany({ where: { token } }).catch(() => {});
      cookieStore.delete(SESSION_COOKIE);
    }
  } catch {
    // Not in a Server Component context
  }
}

/**
 * Validate an email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
