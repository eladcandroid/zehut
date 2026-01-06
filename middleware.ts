import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect /admin routes
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const [type, credentials] = authHeader.split(' ');

    if (type === 'Basic' && credentials) {
      const decoded = atob(credentials);
      const [user, pass] = decoded.split(':');

      if (
        user === process.env.ADMIN_USER &&
        pass === process.env.ADMIN_PASS
      ) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin Area"',
    },
  });
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
