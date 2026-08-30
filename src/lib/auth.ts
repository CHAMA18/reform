import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

/**
 * Authentication library — real database-backed auth.
 *
 * Uses SHA-256 password hashing (simple but functional for a prototype;
 * would use bcrypt/argon2 in production). Session tokens are 32-byte
 * random strings stored in a cookie and looked up in the Session table.
 *
 * Guest bypass: if the `fep_guest_id` cookie is present and no real
 * session exists, getCurrentUser() returns a synthetic guest user —
 * no database lookup, no async work. Clicking "Sign In As A Guest"
 * sets the cookie and redirects in <10ms with zero Xano calls.
 */

export const SESSION_COOKIE = 'fep_session';
export const GUEST_COOKIE = 'fep_guest_id';
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
 * Build a synthetic "guest" user object. The guest is not stored in the
 * user table — it's an in-memory identity materialised from the
 * `fep_guest_id` cookie. Forms and submissions created by the guest
 * will reference this ID as `owner_id`, which works because the column
 * is a free-text field with no enforced foreign key.
 */
function buildGuestUser(guestId: string) {
  // Derive a stable display name from the guest ID.
  // Format: guest_<8hex>_<4hex> → "Guest A1B2"
  const shortId = guestId.replace(/^guest_/, '').slice(0, 4).toUpperCase();
  return {
    id: guestId,
    email: `${guestId}@guest.reform.app`,
    name: `Guest ${shortId}`,
    passwordHash: '', // never set — guest has no password
    fullName: `Guest ${shortId}`,
    orgName: 'Guest',
    createdAt: new Date(0), // epoch — guests have no creation timestamp
    updatedAt: new Date(0),
    isGuest: true, // marker for code that wants to detect guests
  };
}

/**
 * Get the current user from the session cookie.
 * Returns null if not authenticated or session expired.
 *
 * GUEST BYPASS: if no real session exists but the `fep_guest_id` cookie
 * is present, returns a synthetic guest user with no database lookup.
 * This makes "Sign In As A Guest" instant — no Xano calls on click or
 * on subsequent page loads.
 *
 * Call this from Server Components to get the logged-in user.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();

    // 1. Try real session first (fast path for logged-in users)
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (sessionToken) {
      const session = await db.session.findUnique({
        where: { token: sessionToken },
        include: { user: true },
      });

      if (session) {
        if (session.expiresAt < new Date()) {
          // Session expired — delete it
          await db.session.delete({ where: { id: session.id } });
        } else {
          return session.user;
        }
      }
    }

    // 2. Guest bypass — check for the guest cookie. If present, return
    //    a synthetic guest user with no database lookup.
    const guestId = cookieStore.get(GUEST_COOKIE)?.value;
    if (guestId && guestId.startsWith('guest_')) {
      return buildGuestUser(guestId);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Destroy the current session (logout).
 *
 * For guest users, this just clears the guest cookie — there's no
 * session row to delete.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      await db.session.deleteMany({ where: { token } }).catch(() => {});
      cookieStore.delete(SESSION_COOKIE);
    }
    // Also clear the guest cookie if present
    const guestId = cookieStore.get(GUEST_COOKIE)?.value;
    if (guestId) {
      cookieStore.delete(GUEST_COOKIE);
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
