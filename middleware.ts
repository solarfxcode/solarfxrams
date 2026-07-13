import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/auth';

const LOGIN_PATH = '/';
const PROTECTED_PREFIXES = ['/dashboard'];
const BYPASS_PATHS = ['/', '/login', '/favicon.ico', '/api/auth/login', '/api/auth/logout', '/api/auth/session'];
const BYPASS_PREFIXES = ['/_next/static', '/_next/image', '/branding'];

export function shouldBypassMiddleware(pathname: string) {
  return BYPASS_PATHS.includes(pathname) || BYPASS_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (shouldBypassMiddleware(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const authenticated = await verifySession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (authenticated) return NextResponse.next();

  const loginUrl = new URL(LOGIN_PATH, req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!login|api/auth/login|api/auth/logout|api/auth/session|_next/static|_next/image|favicon.ico|branding).*)']
};
