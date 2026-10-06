import { NextResponse } from 'next/server';
import type { PermissionKey } from '@prisma/client';
import { getSession, type SessionUser } from '@/lib/auth';
import { hasPermission } from '@/lib/access/permissions';

export async function requireApiSession(): Promise<
  { session: SessionUser } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session };
}

export async function requireApiPermission(
  key: PermissionKey,
): Promise<{ session: SessionUser } | { error: NextResponse }> {
  const auth = await requireApiSession();
  if ('error' in auth) return auth;
  const ok = await hasPermission(auth.session.id, auth.session.role, key);
  if (!ok) {
    return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  }
  return auth;
}

/** Allow if the user has any of the listed permissions. */
export async function requireAnyApiPermission(
  keys: PermissionKey[],
): Promise<{ session: SessionUser } | { error: NextResponse }> {
  const auth = await requireApiSession();
  if ('error' in auth) return auth;
  for (const key of keys) {
    if (await hasPermission(auth.session.id, auth.session.role, key)) {
      return auth;
    }
  }
  return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
}
