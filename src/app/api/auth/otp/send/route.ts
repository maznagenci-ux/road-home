import { NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import { normalizeLoginPhone } from '@/lib/phone';
import { sendOtpiqVerification } from '@/lib/otpiq';

export const dynamic = 'force-dynamic';

function hashCode(phone: string, code: string) {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

function generateCode() {
  return String(randomInt(100000, 999999));
}

/** POST { phone } — send OTP via OTPIQ to a registered active user. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizeLoginPhone(String(body.phone ?? ''));
    if (!phone) {
      return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    // Same response shape whether user exists — reduce enumeration
    const genericOk = { ok: true };

    if (!user || !user.isActive) {
      return NextResponse.json(genericOk);
    }

    // Rate limit: max 1 send / 45s per phone
    const recent = await prisma.loginOtp.findFirst({
      where: {
        phone,
        createdAt: { gt: new Date(Date.now() - 45_000) },
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return NextResponse.json({ error: 'TOO_SOON', retryAfterSec: 45 }, { status: 429 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.loginOtp.deleteMany({
      where: { phone, consumedAt: null },
    });

    await prisma.loginOtp.create({
      data: {
        phone,
        codeHash: hashCode(phone, code),
        expiresAt,
      },
    });

    const sent = await sendOtpiqVerification(phone, code);
    if (!sent.ok) {
      // Keep OTP row so we can still allow login if needed; but report failure
      console.error('[otpiq]', sent.error);
      return NextResponse.json(
        { error: 'OTP_SEND_FAILED', detail: sent.error },
        { status: 502 },
      );
    }

    const payload: Record<string, unknown> = {
      ...genericOk,
      expiresInSec: 300,
    };
    // Dev-only: show code in UI when SMS may not reach test numbers
    if (process.env.NODE_ENV === 'development') {
      payload.devCode = code;
    }

    return NextResponse.json(payload);
  } catch (e) {
    console.error('[otp/send]', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
