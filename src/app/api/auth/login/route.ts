import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { fromDbLocale } from '@/i18n/locale-config';
import { normalizeLoginPhone } from '@/lib/phone';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = body.password as string | undefined;
    const phone = normalizeLoginPhone(String(body.phone ?? body.email ?? ''));

    if (!phone || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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
  } catch (err) {
    console.error('login_error', err);
    const message = err instanceof Error ? err.message : 'Server error';
    // Surface connection/config failures clearly for hosted debugging
    const code =
      message.includes('JWT_SECRET')
        ? 'JWT_SECRET_MISSING'
        : message.includes("Can't reach database") || message.includes('P1001')
          ? 'DATABASE_UNREACHABLE'
          : message.includes('P1000') || message.includes('Authentication failed')
            ? 'DATABASE_AUTH'
            : 'SERVER_ERROR';
    return NextResponse.json({ error: code, detail: message.slice(0, 200) }, { status: 500 });
  }
}
