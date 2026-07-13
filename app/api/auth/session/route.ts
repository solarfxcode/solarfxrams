import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PROTECTED_REDIRECT, SESSION_COOKIE_NAME, verifySession } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const authenticated = await verifySession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  console.info('[SolarFX auth] session loaded', {authenticated});
  return NextResponse.json({ok: authenticated, authenticated, redirectTo: authenticated ? PROTECTED_REDIRECT : null});
}
