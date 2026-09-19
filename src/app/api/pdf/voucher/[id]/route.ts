import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, localeFromUser, type Locale } from '@/i18n/locale-config';
import { renderOfficeVoucherHtml } from '@/lib/pdf/office-voucher';

const CATEGORY_KEYS: Record<string, string> = {
  OFFICE_RENT: 'catOfficeRent',
  OFFICE_UTILITIES: 'catOfficeUtilities',
  OFFICE_SUPPLIES: 'catOfficeSupplies',
  OFFICE_TRANSPORT: 'catOfficeTransport',
  OFFICE_COMM: 'catOfficeComm',
  OTHER_OFFICE: 'catOtherOffice',
  SALARY: 'catSalary',
  BONUS: 'catBonus',
  ALLOWANCE: 'catAllowance',
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const localeParam = url.searchParams.get('locale');
  const locale: Locale =
    localeParam && hasLocale(localeParam) ? localeParam : localeFromUser(session.locale);
  const autoPrint = url.searchParams.get('print') === '1';

  const item = await prisma.voucher.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      employeeUser: { select: { name: true } },
    },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.accountType !== 'OFFICE_EXPENSE' && item.accountType !== 'EMPLOYEE_SALARY') {
    return NextResponse.json({ error: 'NOT_OFFICE_VOUCHER' }, { status: 400 });
  }

  const t = await getDictionary(locale);
  const o = (t.pages as { officeExpenses?: Record<string, string> }).officeExpenses ?? {};
  const catKey = item.category ? CATEGORY_KEYS[item.category] : null;
  const categoryLabel =
    (catKey && o[catKey]) || item.category || (o.category ?? '—');

  const partyName =
    item.partyName?.trim() ||
    item.employeeUser?.name?.trim() ||
    '—';

  let yearToDateIqd: number | undefined;
  let yearLabel: number | undefined;
  if (item.accountType === 'EMPLOYEE_SALARY') {
    const year = item.createdAt.getFullYear();
    yearLabel = year;
    const yearPrefix = String(year);
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const salaryRows = await prisma.voucher.findMany({
      where: {
        status: 'POSTED',
        accountType: 'EMPLOYEE_SALARY',
        OR: [
          ...(item.employeeUserId ? [{ employeeUserId: item.employeeUserId }] : []),
          { partyName },
        ],
      },
      select: { amountIqd: true, periodLabel: true, createdAt: true },
    });
    yearToDateIqd = salaryRows
      .filter(
        (v) =>
          (v.periodLabel && v.periodLabel.startsWith(yearPrefix)) ||
          (v.createdAt >= yearStart && v.createdAt < yearEnd),
      )
      .reduce((s, v) => s + v.amountIqd, 0);
  }

  const html = renderOfficeVoucherHtml(locale, t, {
    voucherNo: item.voucherNo,
    kind: item.accountType === 'EMPLOYEE_SALARY' ? 'salary' : 'office',
    categoryLabel,
    partyName,
    periodLabel: item.periodLabel,
    amountIqd: item.amountIqd,
    deductionIqd: item.deductionIqd,
    paymentMethod: item.paymentMethod,
    note: item.note,
    issuedAt: item.createdAt,
    createdByName: item.createdBy?.name ?? null,
    yearToDateIqd,
    yearLabel,
    autoPrint,
    assetBase: url.origin,
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
