import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/access/permissions';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, localeFromUser, type Locale } from '@/i18n/locale-config';
import { getPublicOrigin } from '@/lib/pdf/assets';
import { renderSupportHtml } from '@/lib/pdf/templates';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const localeParam = url.searchParams.get('locale');
  const locale: Locale =
    localeParam && hasLocale(localeParam) ? localeParam : localeFromUser(session.locale);
  const autoPrint = url.searchParams.get('print') === '1';

  const item = await prisma.supportLetter.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const t = await getDictionary(locale);
  const html = renderSupportHtml(locale, t, {
    supportNo: item.supportNo,
    recipientKind: item.recipientKind,
    purpose: item.purpose,
    applicant: item.applicant,
    beneficiaryName: item.beneficiaryName,
    beneficiaryIdNo: item.beneficiaryIdNo,
    beneficiaryPhone: item.beneficiaryPhone,
    fromName: item.fromName,
    toName: item.toName,
    recipientAddress: item.recipientAddress,
    subject: item.subject,
    content: item.content,
    propertyRef: item.propertyRef,
    managerName: item.managerName,
    managerTitle: item.managerTitle,
    branch: item.branch,
    issuedAt: item.issuedAt,
    autoPrint,
    assetBase: getPublicOrigin(req),
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
