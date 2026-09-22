import { NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/access/permissions';
import { normalizeLoginPhone } from '@/lib/phone';
import { sendOtpiqVerification } from '@/lib/otpiq';

export const dynamic = 'force-dynamic';

const schema = z.object({
  phone: z.string().min(1),
});

function hashCode(phone: string, code: string) {
  return createHash('sha256').update(`reset:${phone}:${code}`).digest('hex');
}

function generateFourDigit() {
  return String(randomInt(1000, 9999));
}

/**
 * Forgot password: send a 4-digit WhatsApp OTP (OTPIQ).
 * POST { phone }
 */
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const body = schema.parse({ phone: raw.phone ?? raw.email });
    const phone = normalizeLoginPhone(body.phone);

    const generic = { ok: true, message: 'IF_EXISTS' };

    if (!phone) {
      return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive) {
      // Avoid enumeration
      return NextResponse.json(generic);
    }

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

    const code = generateFourDigit();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.loginOtp.deleteMany({ where: { phone, consumedAt: null } });
    await prisma.loginOtp.create({
      data: {
        phone,
        codeHash: hashCode(phone, code),
        expiresAt,
      },
    });

    // Prefer WhatsApp for password-reset verification
    const sent = await sendOtpiqVerification(phone, code, {
      provider: process.env.OTPIQ_RESET_PROVIDER?.trim() || 'whatsapp',
    });

    if (!sent.ok) {
      // Fallback: WhatsApp → SMS
      const fallback = await sendOtpiqVerification(phone, code, {
        provider: 'whatsapp-sms',
      });
      if (!fallback.ok) {
        console.error('[forgot-password otpiq]', sent.error, fallback.error);
        return NextResponse.json(
          { error: 'OTP_SEND_FAILED', detail: fallback.error || sent.error },
          { status: 502 },
        );
      }
    }

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: 'PASSWORD_RESET_OTP_SENT',
      meta: JSON.stringify({ phone: user.phone, channel: 'whatsapp' }),
    });

    const payload: Record<string, unknown> = {
      ...generic,
      channel: 'whatsapp',
      expiresInSec: 600,
      codeLength: 4,
    };
    if (process.env.NODE_ENV === 'development') {
      payload.devCode = code;
    }

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
    }
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
