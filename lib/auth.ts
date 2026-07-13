import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'solarfx_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60;
export const PROTECTED_REDIRECT = '/dashboard';

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || 'development-only-change-me');

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}

export function clearSessionCookieOptions() {
  return {...sessionCookieOptions(), maxAge: 0};
}

export async function createSession() {
  return new SignJWT({role: 'solarfx'})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime(SESSION_MAX_AGE_SECONDS + 's')
    .sign(secret());
}

export async function verifySession(token?: string) {
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}
