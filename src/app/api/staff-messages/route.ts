import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/access/permissions';
import {
  parseStaffMessageMeta,
  STAFF_MESSAGE_ACTION,
  staffMessageVisibleTo,
  type StaffMessageMeta,
} from '@/lib/staff-messages';

const postSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  /** null / omit = هەموو کارمەندان */
  recipientId: z.string().min(1).nullable().optional(),
});

/** Super Admin: send message to all staff or one user. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const data = postSchema.parse(await req.json());
    let recipientName: string | null = null;
    let recipientPhone: string | null = null;

    if (data.recipientId) {
      const u = await prisma.user.findFirst({
        where: { id: data.recipientId, isActive: true },
        select: { id: true, name: true, phone: true },
      });
      if (!u) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
      recipientName = u.name;
      recipientPhone = u.phone;
    }

    const meta: StaffMessageMeta = {
      body: data.body,
      recipientId: data.recipientId ?? null,
      recipientName,
    };

    const log = await prisma.activityLog.create({
      data: {
        userId: session.id,
        userName: session.name,
        action: STAFF_MESSAGE_ACTION,
        projectCode: data.recipientId ? 'DM' : 'ALL',
        meta: JSON.stringify(meta),
      },
    });

    return NextResponse.json({
      ok: true,
      id: log.id,
      recipientId: meta.recipientId,
      recipientName,
      recipientPhone,
      body: meta.body,
      createdAt: log.createdAt,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

/** Inbox for staff; full history for Super Admin. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sa = isSuperAdmin(session.role);
  const logs = await prisma.activityLog.findMany({
    where: { action: STAFF_MESSAGE_ACTION },
    orderBy: { createdAt: 'desc' },
    take: 80,
  });

  const items = logs
    .map((l) => {
      const meta = parseStaffMessageMeta(l.meta);
      if (!meta) return null;
      if (!staffMessageVisibleTo(meta, session.id, sa)) return null;
      return {
        id: l.id,
        body: meta.body,
        recipientId: meta.recipientId,
        recipientName: meta.recipientName,
        broadcast: meta.recipientId === null,
        fromName: l.userName,
        fromId: l.userId,
        createdAt: l.createdAt,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items });
}
