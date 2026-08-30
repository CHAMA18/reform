import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/setup-db
 * 
 * One-time setup endpoint to set the database password.
 * Body: { currentPassword: string, newPassword: string }
 * 
 * This connects to the Render PostgreSQL database using the current password,
 * then changes it to the new password. After running this, update the
 * DATABASE_URL env var to use the new password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'currentPassword and newPassword are required' },
        { status: 400 }
      );
    }

    // Dynamically import pg
    const { Client } = await import('pg');

    // Parse the DATABASE_URL to get connection details
    const dbUrl = process.env.DATABASE_URL || '';
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid DATABASE_URL format' },
        { status: 400 }
      );
    }

    const [, user, , host, port, database] = match;

    // Connect with the provided current password
    const client = new Client({
      host,
      port: parseInt(port),
      user,
      password: currentPassword,
      database,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    await client.connect();

    // Change the password
    await client.query(`ALTER USER "${user}" WITH PASSWORD '${newPassword}'`);
    await client.end();

    return NextResponse.json({
      success: true,
      message: `Password for user "${user}" has been changed. Update DATABASE_URL to use the new password.`,
      newConnectionString: `postgresql://${user}:${newPassword}@${host}:${port}/${database}`,
    });
  } catch (error) {
    console.error('[POST /api/setup-db] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Setup failed' },
      { status: 500 }
    );
  }
}
