import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEffectivePermissions, normalizeRole } from '@/lib/access/permissions';
import { prisma } from '@/lib/prisma';

const PING_THROTTLE_MS = 45_000;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ permissions: null }, { status: 401 });

  // Presence heartbeat (throttled) so Super Admin can see who is online
  try {
    const row = await prisma.user.findUnique({
      where: { id: session.id },
      select: { lastSeenAt: true },
    });
    const stale =
      !row?.lastSeenAt || Date.now() - row.lastSeenAt.getTime() >= PING_THROTTLE_MS;
    if (stale) {
      await prisma.user.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }
  } catch {
    // non-blocking
  }

  const permissions = await getEffectivePermissions(session.id, session.role);
  return NextResponse.json({
    role: normalizeRole(session.role),
    permissions,
  });
}
