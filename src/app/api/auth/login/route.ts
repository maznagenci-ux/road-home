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
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
