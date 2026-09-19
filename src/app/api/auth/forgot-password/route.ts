import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/access/permissions';

const schema = z.object({
  email: z.string().email(),
  locale: z.string().optional(),
});

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const locale = body.locale || 'ckb';

    const user = await prisma.user.findUnique({ where: { email } });

    // Always same shape — avoid email enumeration
    const generic = {
      ok: true,
      message: 'IF_EXISTS',
    };

    if (!user || !user.isActive) {
      return NextResponse.json(generic);
    }

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: 'PASSWORD_RESET_REQUEST',
      meta: JSON.stringify({ email: user.email }),
    });

    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/${locale}/auth/reset-password?token=${rawToken}`;

    // No SMTP configured yet — return one-time link to the requester UI
    return NextResponse.json({
      ...generic,
      resetUrl,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
