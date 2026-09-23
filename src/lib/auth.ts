import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export const AUTH_COOKIE = 'raot-home-token';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

export interface SessionUser {
  id: string;
  phone: string;
  name: string;
  role: string;
  locale: string;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ sub: user.id, ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

/** Prefer attaching the cookie to the Route Handler response (Netlify/mobile-safe). */
export function attachSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE, token, cookieOptions);
  return res;
}

export async function createSession(user: SessionUser) {
  const token = await createSessionToken(user);
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, cookieOptions);
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.sub as string,
      phone: (payload.phone as string) || (payload.email as string) || '',
      name: payload.name as string,
      role: payload.role as string,
      locale: payload.locale as string,
    };
  } catch {
    return null;
  }
}
