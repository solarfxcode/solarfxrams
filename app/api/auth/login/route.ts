import { NextResponse } from 'next/server';
import { PROTECTED_REDIRECT, SESSION_COOKIE_NAME, createSession, sessionCookieOptions } from '@/lib/auth';

const attempts = new Map<string, {count: number; until: number}>();
const INVALID_CODE_MESSAGE = 'Incorrect access code.';
const SIGN_IN_ERROR_MESSAGE = 'Unable to sign in. Please try again.';

type LoginBody = {code?: unknown};

function normaliseCode(value: unknown) {
  return String(value ?? '').replace(/D/g, '').slice(0, 4);
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const state = attempts.get(ip);

  if (state && state.until > now) {
    return NextResponse.json({success: false, error: 'Access temporarily unavailable.'}, {status: 429});
  }

  let body: LoginBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({success: false, error: INVALID_CODE_MESSAGE}, {status: 400});
  }

  const expected = process.env.RAMS_ACCESS_CODE;
  if (!expected) {
    return NextResponse.json({success: false, error: SIGN_IN_ERROR_MESSAGE}, {status: 500});
  }

  const code = normaliseCode(body.code);
  if (code.length !== 4 || code !== expected) {
    const count = (state?.count || 0) + 1;
    attempts.set(ip, {count, until: count >= 5 ? now + 10 * 60_000 : 0});
    return NextResponse.json({success: false, error: INVALID_CODE_MESSAGE}, {status: 401});
  }

  attempts.delete(ip);
  const token = await createSession();
  const res = NextResponse.json({success: true, redirectTo: PROTECTED_REDIRECT});
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return res;
}
