import { NextRequest, NextResponse } from 'next/server';
import { getPublicOrigin } from '@/lib/url';
import { randomBytes } from 'crypto';

/**
 * GET /api/auth/guest
 *
 * Instant guest sign-in — bypasses authentication entirely.
 *
 * What this does:
 *   1. Generate a stable random guest ID (cuid-style)
 *   2. Set it as a long-lived cookie (`fep_guest_id`)
 *   3. Redirect to the `redirect` query param (defaults to /dashboard)
 *
 * What this DOES NOT do (on purpose, for instant response):
 *   - No Xano user-table insert
 *   - No Xano session-table insert
 *   - No password hashing
 *   - No network calls of any kind
 *
 * The synthetic user is materialised lazily by `getCurrentUser()` in
 * `src/lib/auth.ts` — it reads the cookie and returns a user-shaped object
 * without any database lookup. Forms and submissions created by the guest
 * are stored in Xano with the synthetic user's ID as the `owner_id`
 * (Xano doesn't enforce FK on this text column, so it works).
 *
 * Trade-off: the guest user has no row in the Xano `user` table, so:
 *   - Listing "all users" in admin views won't include guests (fine)
 *   - Login by email/password cannot accidentally auth a guest (fine —
 *     the guest email is never stored in the user table)
 *   - If a guest wants to "upgrade" to a real account later, a separate
 *     promotion flow would be needed (not in scope here)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') || '/dashboard';
  const origin = getPublicOrigin(request);

  // Generate a stable guest ID. Format matches the cuid-style IDs used
  // elsewhere in the app (so foreign-key-like text columns accept it).
  const id = generateGuestId();

  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.redirect(`${origin}${redirect}`);
  response.cookies.set({
    name: 'fep_guest_id',
    value: id,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
  return response;
}

/**
 * Generate a guest user ID. Format: `guest_<8hex>_<4hex>` — distinct
 * from cuid so it's easy to spot in DB queries, but still a valid
 * text ID for any column that stores user IDs.
 */
function generateGuestId(): string {
  const a = randomBytes(8).toString('hex');
  const b = randomBytes(2).toString('hex');
  return `guest_${a}_${b}`;
}
