import { NextResponse } from 'next/server';
import { getSession, createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasLocale, toDbLocale, type Locale } from '@/i18n/locale-config';

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { locale } = await req.json();
  if (!locale || !hasLocale(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  const dbLocale = toDbLocale(locale as Locale);

  const user = await prisma.user.update({
    where: { id: session.id },
    data: { locale: dbLocale },
  });

  await createSession({
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    locale: user.locale,
  });

  return NextResponse.json({ locale: locale as Locale });
}
