import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, clearSessionCookieOptions } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({success: true});
  res.cookies.set(SESSION_COOKIE_NAME, '', clearSessionCookieOptions());
  return res;
}
