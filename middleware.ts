import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const session = request.cookies.get(ADMIN_COOKIE);
  const isAuthenticated = session?.value === 'authenticated';

  // Define protected API routes (method-specific)
  const protectedApiRoutes = [
    { path: '/api/fetch', methods: ['POST'] },
    { path: '/api/admin/retag', methods: ['POST'] },
    { path: '/api/content', methods: ['POST', 'DELETE'] },
  ];

  // Check if this is a protected API route
  const isProtectedApiRoute = protectedApiRoutes.some(
    (route) =>
      pathname === route.path && method && route.methods.includes(method)
  );

  // Also protect /api/content/[id] for PATCH and DELETE
  const isProtectedContentIdRoute =
    pathname.startsWith('/api/content/') &&
    pathname !== '/api/content' &&
    method &&
    ['PATCH', 'DELETE'].includes(method);

  // Handle unauthenticated requests
  if (!isAuthenticated) {
    // For API routes, return 401 JSON error
    if (isProtectedApiRoute || isProtectedContentIdRoute) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // For admin page routes, redirect to login
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/fetch/:path*',
    '/api/fetch',
    '/api/admin/:path*',
    '/api/content/:path*',
    '/api/content',
  ],
};
