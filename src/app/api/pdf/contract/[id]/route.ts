import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, localeFromUser, type Locale } from '@/i18n/locale-config';
import { getFixedSaleClauses } from '@/lib/contracts/sale-clauses';
import { renderContractHtml } from '@/lib/pdf/templates';
import { formatCurrency } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/brand';

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

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      house: { select: { code: true, name: true, area: true, location: true } },
      installments: { orderBy: { dueDate: 'asc' }, take: 1 },
    },
  });
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const t = await getDictionary(locale);
  const typeMap: Record<string, string> = {
    HOUSE: t.pages.contractGen.typeHouse,
    APARTMENT: t.pages.contractGen.typeApartment,
    LAND: t.pages.contractGen.typeLand,
    SHOP: t.pages.contractGen.typeShop,
    BUILDING: t.pages.contractGen.typeBuilding,
  };

  const cur = contract.currency === 'USD' ? 'USD' : 'IQD';
  const rate = Math.max(1, contract.exchangeRate || 150_000);
  const money = (iqd: number) => {
    const amount = cur === 'USD' ? iqd / rate : iqd;
    return formatCurrency(amount, locale, cur);
  };

  const remainingIqd = Math.max(0, contract.totalAmount - contract.downPayment);
  const remainingDue =
    contract.remainingDueDate ??
    contract.installments[0]?.dueDate ??
    contract.endDate ??
    null;
  const signing = contract.signingDate ?? contract.startDate ?? contract.createdAt;
  const propertyCode =
    contract.house?.code || contract.tapuCode || contract.house?.name || '—';
  const location =
    contract.description || contract.house?.location || contract.house?.name || '—';
  const areaSqm =
    contract.areaSqm != null
      ? String(contract.areaSqm)
      : contract.house?.area != null
        ? String(contract.house.area)
        : '';

  const clauses = getFixedSaleClauses(
    {
      sellerName: contract.sellerName ?? '',
      buyerName: contract.buyerName ?? '',
      propertyType: typeMap[contract.propertyType] ?? contract.propertyType,
      propertyCode,
      location,
      areaSqm,
      totalPrice: money(contract.totalAmount),
      downPayment: money(contract.downPayment),
      remaining: money(remainingIqd),
      remainingDueDate: remainingDue ? remainingDue.toISOString().slice(0, 10) : '—',
      cancelFee: money(contract.cancelFeeIqd ?? 0),
      dailyPenalty: money(contract.dailyPenaltyIqd ?? 0),
      commissionSeller: money(contract.commissionSellerIqd ?? 0),
      commissionBuyer: money(contract.commissionBuyerIqd ?? 0),
      signingDate: signing.toISOString().slice(0, 10),
      organizerName: contract.organizerName || BRAND_NAME,
      lawyerName: contract.lawyerName ?? '',
      lawyerPhone: contract.lawyerPhone ?? '',
    },
    locale,
  ).map((c) => c.text);

  const html = renderContractHtml(locale, t, {
    contractNo: contract.contractNo,
    title: contract.title,
    kind: contract.kind,
    propertyType: contract.propertyType,
    propertyCode,
    location,
    sellerName: contract.sellerName,
    sellerPhone: contract.sellerPhone,
    buyerName: contract.buyerName,
    buyerPhone: contract.buyerPhone,
    witness1Name: contract.witness1Name,
    witness1Phone: contract.witness1Phone,
    witness2Name: contract.witness2Name,
    witness2Phone: contract.witness2Phone,
    guarantorName: contract.guarantorName,
    guarantorPhone: contract.guarantorPhone,
    lawyerName: contract.lawyerName,
    lawyerPhone: contract.lawyerPhone,
    signingDate: signing,
    isExternal: contract.isExternal,
    clauses,
    autoPrint,
    assetBase: url.origin,
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
