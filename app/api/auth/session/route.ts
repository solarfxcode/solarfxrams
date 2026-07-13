import { NextResponse } from 'next/server'; import { cookies } from 'next/headers'; import { verifySession } from '@/lib/auth';
export async function GET(){const c=await cookies();const ok=await verifySession(c.get('solarfx_session')?.value);return NextResponse.json({ok})}
