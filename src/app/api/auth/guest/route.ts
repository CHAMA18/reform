import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { getPublicOrigin } from '@/lib/url';
import { randomBytes } from 'crypto';

/**
 * GET /api/auth/guest
 *
 * Signs the user in as a guest — no email, no password, no friction.
 *
 * Design:
 *   - Each guest gets a UNIQUE account — no shared "guest@reform.app"
 *     identity. This ensures every guest's forms, submissions, and API
 *     keys are entirely separate from every other guest's data.
 *   - To make repeat visits from the same browser reuse the same guest
 *     account (so the guest sees the forms they created previously),
 *     we store the guest user ID in a long-lived cookie. If the cookie
 *     is present, we look up the existing guest account; otherwise we
 *     create a new one and set the cookie.
 *   - The guest user has a random password hash that is never disclosed,
 *     so the email/password login path cannot accidentally authenticate
 *     a guest without setting a real password first.
 *   - After creating the session, redirects to the `redirect` query
 *     param (defaults to /dashboard).
 *
 * Why unique accounts (not a shared guest):
 *   Previously all guests shared a single "guest@reform.app" account,
 *   which meant every visitor saw every other visitor's forms and
 *   submissions. That's a data-isolation failure. Unique accounts ensure
 *   each guest's workspace is private.
 *
 * Usage:
 *   <a href="/api/auth/guest">Sign In As A Guest</a>
 */

/** Name of the cookie that stores the guest user ID for repeat visits. */
const GUEST_ID_COOKIE = 'fep_guest_id';
const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, in seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') || '/dashboard';
  const origin = getPublicOrigin(request);

  try {
    // Check for an existing guest ID in the cookies (repeat visit).
    const existingGuestId = request.cookies.get(GUEST_ID_COOKIE)?.value;
    let userId: string;

    if (existingGuestId) {
      // Verify the guest account still exists in the database.
      const existing = await db.user.findUnique({
        where: { id: existingGuestId },
        select: { id: true },
      });
      if (existing) {
        userId = existing.id;
      } else {
        // Cookie is stale (account was deleted) — create a fresh one.
        userId = await createUniqueGuest();
      }
    } else {
      // First visit — create a new unique guest account.
      userId = await createUniqueGuest();
    }

    // Create the session and set the guest ID cookie for repeat visits.
    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.redirect(`${origin}${redirect}`);

    // createSession() sets the fep_session cookie via next/headers, but
    // since we're returning a redirect response we need to also set the
    // guest-id cookie on the SAME response. We do that here.
    await createSession(userId);

    // Re-fetch the cookies set by createSession (it used next/headers)
    // and copy them onto our redirect response. This is the Next.js 14/15
    // pattern for setting cookies in route handlers that return redirects.
    // Actually, createSession already set the session cookie via the
    // cookies() API which mutates the outgoing response — so we just need
    // to add the guest-id cookie on top.
    response.cookies.set({
      name: GUEST_ID_COOKIE,
      value: userId,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: GUEST_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('[Guest Auth] error:', error);
    return NextResponse.redirect(`${origin}/signin?error=guest_failed`);
  }
}

/**
 * Create a brand-new unique guest account with a random email.
 * Returns the new user's ID.
 */
async function createUniqueGuest(): Promise<string> {
  const id = randomBytes(8).toString('hex');
  const email = `guest_${id}@reform.app`;
  const name = `Guest ${id.slice(0, 4).toUpperCase()}`;

  const user = await db.user.create({
    data: {
      email,
      passwordHash: hashPassword(randomBytes(32).toString('hex')),
      name,
      fullName: name,
      orgName: 'Guest',
    },
  });

  return user.id;
}
