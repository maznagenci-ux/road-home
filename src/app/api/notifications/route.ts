import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/access/permissions';
import {
  parseStaffMessageMeta,
  STAFF_MESSAGE_ACTION,
} from '@/lib/staff-messages';

/** Recent activity + Super Admin staff messages for the current user. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sa = isSuperAdmin(session.role);

  const [logs, staffLogs] = await Promise.all([
    prisma.activityLog.findMany({
      where: { action: { not: STAFF_MESSAGE_ACTION } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        userName: true,
        action: true,
        projectCode: true,
        amountIqd: true,
        createdAt: true,
      },
    }),
    prisma.activityLog.findMany({
      where: { action: STAFF_MESSAGE_ACTION },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  const staffItems = staffLogs
    .map((l) => {
      const meta = parseStaffMessageMeta(l.meta);
      if (!meta) return null;

      // Staff: broadcasts + DMs to them. SA: also see own sent messages in bell.
      const isBroadcast = meta.recipientId === null;
      const isDmToMe = meta.recipientId === session.id;
      const isSentByMe = l.userId === session.id;
      if (!isBroadcast && !isDmToMe && !(sa && isSentByMe)) return null;

      const scope = isBroadcast
        ? 'بۆ هەموو کارمەندان'
        : isDmToMe
          ? 'بۆ تۆ'
          : `بۆ ${meta.recipientName ?? 'کارمەند'}`;

      return {
        id: `staff-${l.id}`,
        title: meta.body.length > 140 ? `${meta.body.slice(0, 140)}…` : meta.body,
        subtitle: `نامەی سوپەر ئەدمین · ${l.userName} · ${scope}`,
        amountIqd: null as number | null,
        createdAt: l.createdAt,
      };
    })
    .filter(Boolean);

  const activityItems = logs.map((l) => ({
    id: l.id,
    title: l.action,
    subtitle: [l.userName, l.projectCode].filter(Boolean).join(' · '),
    amountIqd: l.amountIqd,
    createdAt: l.createdAt,
  }));

  const items = [...staffItems, ...activityItems]
    .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime())
    .slice(0, 30);

  return NextResponse.json({ items });
}
