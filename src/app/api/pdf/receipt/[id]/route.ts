import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, localeFromUser, type Locale } from '@/i18n/locale-config';
import { getPublicOrigin } from '@/lib/pdf/assets';
import { renderReceiptHtml } from '@/lib/pdf/templates';
import { assertReceiptInBranch } from '@/lib/access/branch-scope';
import { loadCompanyContact } from '@/lib/company-contact';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ok = await assertReceiptInBranch(session, id);
  if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  await loadCompanyContact();

  const url = new URL(req.url);
  const localeParam = url.searchParams.get('locale');
  const locale: Locale =
    localeParam && hasLocale(localeParam) ? localeParam : localeFromUser(session.locale);
  const autoPrint = url.searchParams.get('print') === '1';

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      contract: {
        include: {
          customer: true,
          house: { include: { property: true } },
        },
      },
      lease: true,
    },
  });

  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const purpose =
    receipt.purpose === 'SECURITY_DEPOSIT' ||
    receipt.purpose === 'RENT' ||
    receipt.purpose === 'GENERAL'
      ? receipt.purpose
      : /تأمینات|تەئمینات|security deposit/i.test(receipt.description || '')
        ? 'SECURITY_DEPOSIT'
        : 'GENERAL';

  const t = await getDictionary(locale);
  const html = renderReceiptHtml(locale, t, {
    receiptNo: receipt.receiptNo,
    type: receipt.type,
    currency: receipt.currency === 'USD' ? 'USD' : 'IQD',
    amount: receipt.amount,
    totalAmount: receipt.totalAmount,
    remainingAmount: receipt.remainingAmount,
    partyName:
      receipt.partyName ||
      receipt.contract?.buyerName ||
      receipt.contract?.customer?.name ||
      receipt.lease?.tenantName,
    issuedAt: receipt.issuedAt,
    description: receipt.description,
    customerName: receipt.contract?.customer?.name || receipt.lease?.tenantName,
    propertyName:
      receipt.contract?.house?.property?.name ||
      receipt.lease?.propertyName ||
      receipt.lease?.propertyCode,
    houseName: receipt.contract?.house?.name || receipt.lease?.propertyCode,
    purpose,
    autoPrint,
    assetBase: getPublicOrigin(req),
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
