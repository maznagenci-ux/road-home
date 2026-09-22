import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/access/permissions';
import { normalizeLoginPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

const otpSchema = z.object({
  phone: z.string().min(1),
  code: z.string().min(4).max(6),
  password: z.string().min(6).max(100),
});

const legacyTokenSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6).max(100),
});

function hashResetCode(phone: string, code: string) {
  return createHash('sha256').update(`reset:${phone}:${code}`).digest('hex');
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Reset password via WhatsApp OTP: { phone, code, password }
 * Legacy link token still supported: { token, password }
 */
export async function POST(req: Request) {
  try {
    const raw = await req.json();

    if (raw.phone && raw.code) {
      return resetWithOtp(raw);
    }
    return resetWithToken(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
    }
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

async function resetWithOtp(raw: unknown) {
  const body = otpSchema.parse(raw);
  const phone = normalizeLoginPhone(body.phone);
  const code = String(body.code).replace(/\D/g, '');

  if (!phone || (code.length !== 4 && code.length !== 6)) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'INVALID' }, { status: 401 });
  }

  const otp = await prisma.loginOtp.findFirst({
    where: {
      phone,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    return NextResponse.json({ error: 'EXPIRED' }, { status: 401 });
  }

  if (otp.attempts >= 5) {
    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
    return NextResponse.json({ error: 'TOO_MANY' }, { status: 429 });
  }

  if (otp.codeHash !== hashResetCode(phone, code)) {
    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { attempts: otp.attempts + 1 },
    });
    return NextResponse.json({ error: 'INVALID' }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.loginOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  await logActivity({
    userId: user.id,
    userName: user.name,
    action: 'PASSWORD_RESET_DONE',
    meta: JSON.stringify({ phone: user.phone, via: 'whatsapp_otp' }),
  });

  return NextResponse.json({ ok: true });
}

async function resetWithToken(raw: unknown) {
  const body = legacyTokenSchema.parse(raw);
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
    meta: JSON.stringify({ phone: row.user.phone }),
  });

  return NextResponse.json({ ok: true });
}
