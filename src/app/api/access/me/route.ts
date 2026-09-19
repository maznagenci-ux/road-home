import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEffectivePermissions, normalizeRole } from '@/lib/access/permissions';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ permissions: null }, { status: 401 });

  const permissions = await getEffectivePermissions(session.id, session.role);
  return NextResponse.json({
    role: normalizeRole(session.role),
    permissions,
  });
}
