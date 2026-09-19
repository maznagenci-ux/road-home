import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/access/permissions';

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(6).max(100),
});

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const tokenHash = hashToken(body.token);

    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
    }

    if (!row.user.isActive) {
      return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      }),
    ]);

    await logActivity({
      userId: row.userId,
      userName: row.user.name,
      action: 'PASSWORD_RESET_DONE',
      meta: JSON.stringify({ email: row.user.email }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
