import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_session';

export function middleware(request: NextRequest) {
  const session = request.cookies.get(ADMIN_COOKIE);

  // Check if authenticated
  if (session?.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/admin-login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
