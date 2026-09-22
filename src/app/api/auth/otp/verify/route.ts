import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { fromDbLocale } from '@/i18n/locale-config';
import { normalizeLoginPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

function hashCode(phone: string, code: string) {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

/** POST { phone, code } — verify OTP and create session. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizeLoginPhone(String(body.phone ?? ''));
    const code = String(body.code ?? '').replace(/\D/g, '');

    if (!phone || code.length !== 6) {
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

    const ok = otp.codeHash === hashCode(phone, code);
    if (!ok) {
      await prisma.loginOtp.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });
      return NextResponse.json({ error: 'INVALID' }, { status: 401 });
    }

    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    await createSession({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      locale: user.locale,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        locale: fromDbLocale(user.locale),
      },
    });
  } catch (e) {
    console.error('[otp/verify]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
