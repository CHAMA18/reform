import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

/**
 * POST /api/auth/logout
 *
 * Destroys the current session and clears the cookie.
 */
export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true });
}
