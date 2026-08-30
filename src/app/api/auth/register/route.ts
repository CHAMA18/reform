import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession, isValidEmail } from '@/lib/auth';

/**
 * POST /api/auth/register
 *
 * Register a new user with email + password.
 * Creates the user in the database and starts a session.
 *
 * Body: { email, password, fullName?, orgName? }
 * Response: { user: { id, email, name }, token }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, orgName } = body as {
      email?: string;
      password?: string;
      fullName?: string;
      orgName?: string;
    };

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create the user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        name: fullName?.trim() || null,
        fullName: fullName?.trim() || null,
        orgName: orgName?.trim() || null,
      },
    });

    // Create session (sets the cookie)
    const token = await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('[POST /api/auth/register] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to register';
    return NextResponse.json(
      { error: `Failed to register: ${message}` },
      { status: 500 }
    );
  }
}
