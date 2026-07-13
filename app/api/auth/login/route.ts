import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
const attempts=new Map<string,{count:number;until:number}>();
export async function POST(req:Request){
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local'; const now=Date.now(); const state=attempts.get(ip);
  if(state&&state.until>now)return NextResponse.json({ok:false,error:'Access temporarily unavailable.'},{status:429});
  const {code}=await req.json(); const expected=process.env.RAMS_ACCESS_CODE;
  if(!expected||String(code)!==expected){const count=(state?.count||0)+1;attempts.set(ip,{count,until:count>=5?now+10*60_000:0});return NextResponse.json({ok:false,error:'Incorrect access code.'},{status:401});}
  attempts.delete(ip); const token=await createSession(); const res=NextResponse.json({ok:true});
  res.cookies.set('solarfx_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:3600}); return res;
}
