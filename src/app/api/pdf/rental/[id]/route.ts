import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, localeFromUser, type Locale } from '@/i18n/locale-config';
import { getFixedRentalClauses } from '@/lib/contracts/rental-clauses';
import { renderLeaseHtml } from '@/lib/pdf/templates';
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

  const lease = await prisma.lease.findUnique({ where: { id } });
  if (!lease) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const t = await getDictionary(locale);
  const typeMap: Record<string, string> = {
    HOUSE: t.pages.contractGen.typeHouse,
    APARTMENT: t.pages.contractGen.typeApartment,
    LAND: t.pages.contractGen.typeLand,
    SHOP: t.pages.contractGen.typeShop,
    BUILDING: t.pages.contractGen.typeBuilding,
  };

  const cur = lease.currency === 'USD' ? 'USD' : 'IQD';
  const rate = Math.max(1, lease.exchangeRate || 150_000);
  const money = (iqd: number) => {
    const amount = cur === 'USD' ? iqd / rate : iqd;
    return formatCurrency(amount, locale, cur);
  };

  const clauses = getFixedRentalClauses({
    landlordName: lease.landlordName ?? '',
    tenantName: lease.tenantName,
    propertyType: typeMap[lease.propertyType] ?? lease.propertyType,
    propertyCode: lease.propertyCode,
    propertyName: lease.propertyName ?? lease.propertyCode,
    areaSqm: lease.areaSqm != null ? String(lease.areaSqm) : '',
    monthlyRent: money(lease.monthlyRentIqd),
    advancePayment: money(lease.advancePaymentIqd),
    securityDeposit: money(lease.securityDepositIqd),
    commissionLandlord: money(lease.commissionLandlordIqd),
    commissionTenant: money(lease.commissionTenantIqd),
    dailyPenalty: money(lease.dailyPenaltyIqd),
    cancelFee: money(lease.cancelFeeIqd),
    durationMonths: lease.durationMonths != null ? String(lease.durationMonths) : '',
    startDate: lease.startDate.toISOString().slice(0, 10),
    endDate: lease.endDate.toISOString().slice(0, 10),
    signingDate: (lease.signingDate ?? lease.startDate).toISOString().slice(0, 10),
    organizerName: lease.organizerName ?? BRAND_NAME,
  }, locale).map((c) => c.text);

  const html = renderLeaseHtml(locale, t, {
    leaseNo: lease.leaseNo,
    propertyCode: lease.propertyCode,
    propertyName: lease.propertyName,
    propertyType: lease.propertyType,
    areaSqm: lease.areaSqm,
    landlordName: lease.landlordName,
    landlordPhone: lease.landlordPhone,
    tenantName: lease.tenantName,
    tenantPhone: lease.tenantPhone,
    witness1Name: lease.witness1Name,
    witness1Phone: lease.witness1Phone,
    witness2Name: lease.witness2Name,
    witness2Phone: lease.witness2Phone,
    guarantorName: lease.guarantorName,
    guarantorPhone: lease.guarantorPhone,
    startDate: lease.startDate,
    endDate: lease.endDate,
    signingDate: lease.signingDate,
    durationMonths: lease.durationMonths,
    currency: lease.currency === 'USD' ? 'USD' : 'IQD',
    exchangeRate: lease.exchangeRate,
    monthlyRentIqd: lease.monthlyRentIqd,
    advancePaymentIqd: lease.advancePaymentIqd,
    securityDepositIqd: lease.securityDepositIqd,
    dailyPenaltyIqd: lease.dailyPenaltyIqd,
    cancelFeeIqd: lease.cancelFeeIqd,
    commissionTenantIqd: lease.commissionTenantIqd,
    commissionLandlordIqd: lease.commissionLandlordIqd,
    organizerName: lease.organizerName,
    showOrganizer: lease.showOrganizer,
    clauses,
    autoPrint,
    assetBase: url.origin,
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
