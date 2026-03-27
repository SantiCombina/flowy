import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const routeToFeature: Record<string, string> = {
  '/products': 'FEATURE_PRODUCTS',
  '/sellers': 'FEATURE_SELLERS',
  '/assignments': 'FEATURE_ASSIGNMENTS',
  '/history': 'FEATURE_HISTORY',
  '/sales': 'FEATURE_SALES',
  '/statistics': 'FEATURE_STATISTICS',
  '/settings': 'FEATURE_SETTINGS',
};

const publicRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const token = request.cookies.get('payload-token');
  const isAuthenticated = !!token?.value;

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const featureEnvKey = routeToFeature[pathname];

  if (featureEnvKey) {
    const isEnabled = process.env[featureEnvKey] === 'true';

    if (!isEnabled) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/products',
    '/sellers',
    '/assignments',
    '/history',
    '/sales',
    '/statistics',
    '/settings',
    '/profile',
    '/clients',
    '/mobile-inventory',
    '/login',
    '/register',
  ],
};
