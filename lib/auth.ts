import { SignJWT, jwtVerify } from 'jose';
const secret=()=>new TextEncoder().encode(process.env.SESSION_SECRET || 'development-only-change-me');
export async function createSession(){return new SignJWT({role:'solarfx'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('60m').sign(secret())}
export async function verifySession(token?:string){if(!token)return false;try{await jwtVerify(token,secret());return true}catch{return false}}
