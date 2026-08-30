import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/auth/me
 *
 * Returns the currently logged-in user, or null if not authenticated.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        orgName: user.orgName,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
