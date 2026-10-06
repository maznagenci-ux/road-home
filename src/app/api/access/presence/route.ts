import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/access/permissions';
import { prisma } from '@/lib/prisma';

/** Consider online if seen within this window */
const ONLINE_MS = 2 * 60 * 1000;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_ONLY' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      lastSeenAt: true,
      branch: { select: { name: true, code: true } },
    },
  });

  const now = Date.now();
  const items = users.map((u) => {
    const last = u.lastSeenAt ? u.lastSeenAt.getTime() : 0;
    const online = last > 0 && now - last <= ONLINE_MS;
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      branchName: u.branch?.name ?? null,
      branchCode: u.branch?.code ?? null,
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      online,
    };
  });

  return NextResponse.json({
    items,
    onlineCount: items.filter((i) => i.online).length,
    offlineCount: items.filter((i) => !i.online).length,
  });
}
