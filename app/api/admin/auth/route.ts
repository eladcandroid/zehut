import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_COOKIE = 'admin_session';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE);

  return NextResponse.json({ authenticated: session?.value === 'authenticated' });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);

  return NextResponse.json({ success: true });
}
