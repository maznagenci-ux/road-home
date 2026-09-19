import type { Locale } from '@/i18n/locale-config';

export type AccountKind = 'sale' | 'rental';
export type AccountStream = 'sale' | 'rental' | 'all';

export type AccountRow = {
  id: string;
  kind: AccountKind;
  refNo: string;
  name: string;
  propertyType: string;
  propertyTypeKey: string;
  commissionIqd: number;
  commissionSellerIqd: number;
  commissionBuyerIqd: number;
  /** USD mirrors at the contract/lease locked exchange rate. */
  commissionUsd: number;
  commissionSellerUsd: number;
  commissionBuyerUsd: number;
  exchangeRate: number;
  personName: string;
  propertyPriceIqd: number;
  propertyPriceUsd: number;
  sellerName: string;
  buyerName: string;
  intermediaryName: string;
  dealEmployeeId: string | null;
  currency: 'IQD' | 'USD';
  createdAt: string;
  /** Collected toward sale price (down + paid installments), IQD. */
  paidAmountIqd: number;
  remainingAmountIqd: number;
  paidCount: number;
  installmentCount: number;
};

export type AccountColumnKey =
  | 'refNo'
  | 'kind'
  | 'name'
  | 'propertyType'
  | 'commissionSeller'
  | 'commissionBuyer'
  | 'commission'
  | 'propertyPrice'
  | 'sellerName'
  | 'buyerName'
  | 'intermediaryName'
  | 'currency';

function iqdToUsd(iqd: number, rate: number) {
  const r = Math.max(1, rate);
  return Math.round((iqd / r) * 100) / 100;
}

/** Labels depend on stream so sale pages never show rental wording and vice versa. */
export function accountColumnLabels(
  locale: Locale,
  stream: AccountStream = 'all',
): Record<AccountColumnKey, string> {
  const sale = stream === 'sale';
  const rental = stream === 'rental';

  if (locale === 'ar') {
    return {
      refNo: 'الرقم',
      kind: 'النوع',
      name: sale ? 'اسم عقد البيع' : rental ? 'اسم عقد الإيجار' : 'اسم العقد / العقار',
      propertyType: 'نوع العقار',
      commissionSeller: sale
        ? 'عمولة من البائع'
        : rental
          ? 'عمولة من المؤجر'
          : 'من البائع / المؤجر',
      commissionBuyer: sale
        ? 'عمولة من المشتري'
        : rental
          ? 'عمولة من المستأجر'
          : 'من المشتري / المستأجر',
      commission: 'مجموع العمولة',
      propertyPrice: sale ? 'سعر البيع' : rental ? 'الإيجار الشهري' : 'سعر العقار',
      sellerName: sale ? 'البائع' : rental ? 'المؤجر' : 'البائع / المؤجر',
      buyerName: sale ? 'المشتري' : rental ? 'المستأجر' : 'المشتري / المستأجر',
      intermediaryName: 'اسم الموظف الوسيط',
      currency: 'العملة',
    };
  }

  if (locale === 'en') {
    return {
      refNo: 'Ref No.',
      kind: 'Type',
      name: sale ? 'Sale contract' : rental ? 'Rental contract' : 'Contract / Property',
      propertyType: 'Property type',
      commissionSeller: sale
        ? 'Commission from seller'
        : rental
          ? 'Commission from landlord'
          : 'From seller / landlord',
      commissionBuyer: sale
        ? 'Commission from buyer'
        : rental
          ? 'Commission from tenant'
          : 'From buyer / tenant',
      commission: 'Total commission',
      propertyPrice: sale ? 'Sale price' : rental ? 'Monthly rent' : 'Property price',
      sellerName: sale ? 'Seller' : rental ? 'Landlord' : 'Seller / Landlord',
      buyerName: sale ? 'Buyer' : rental ? 'Tenant' : 'Buyer / Tenant',
      intermediaryName: 'Intermediary employee',
      currency: 'Currency',
    };
  }

  return {
    refNo: 'ژمارە',
    kind: 'جۆر',
    name: sale ? 'ناوی گرێبەستی فرۆشتن' : rental ? 'ناوی گرێبەستی کرێ' : 'ناوی گرێبەست / موڵک',
    propertyType: 'جۆری موڵک',
    commissionSeller: sale
      ? 'دەستخۆشی لە فرۆشیار'
      : rental
        ? 'دەستخۆشی لە بەکرێدەر'
        : 'دەستخۆشی لە فرۆشیار / بەکرێدەر',
    commissionBuyer: sale
      ? 'دەستخۆشی لە کڕیار'
      : rental
        ? 'دەستخۆشی لە کرێچی'
        : 'دەستخۆشی لە کڕیار / کرێچی',
    commission: 'کۆی دەستخۆشی',
    propertyPrice: sale ? 'نرخی فرۆشتن' : rental ? 'کرێی مانگانە' : 'نرخی موڵک',
    sellerName: sale ? 'فرۆشیار' : rental ? 'بەکرێدەر' : 'فرۆشیار / بەکرێدەر',
    buyerName: sale ? 'کڕیار' : rental ? 'کرێچی' : 'کڕیار / کرێچی',
    intermediaryName: 'ناوی کارمەندی نێوەندگیر',
    currency: 'دراو',
  };
}

export function kindLabel(kind: AccountKind, locale: Locale) {
  if (locale === 'ar') return kind === 'sale' ? 'بيع' : 'إيجار';
  if (locale === 'en') return kind === 'sale' ? 'Sale' : 'Rental';
  return kind === 'sale' ? 'فرۆشتن' : 'کرێ';
}

/** Keep each page strictly on its own dataset. */
export function filterRowsByStream(rows: AccountRow[], stream: AccountStream): AccountRow[] {
  if (stream === 'sale') return rows.filter((r) => r.kind === 'sale');
  if (stream === 'rental') return rows.filter((r) => r.kind === 'rental');
  return rows;
}

type SaleSource = {
  id: string;
  contractNo: string;
  title: string;
  propertyType: string;
  commissionSellerIqd: number;
  commissionBuyerIqd: number;
  totalAmount: number;
  totalAmountUsd?: number;
  downPayment?: number;
  sellerName: string | null;
  buyerName: string | null;
  organizerName: string | null;
  dealEmployeeId?: string | null;
  dealEmployeeName?: string | null;
  dealEmployee?: { name: string } | null;
  currency: 'IQD' | 'USD';
  exchangeRate?: number;
  createdAt: Date | string;
  house?: { code: string; name: string } | null;
  installments?: { amount: number; status: string }[];
};

type RentalSource = {
  id: string;
  leaseNo: string;
  propertyCode: string;
  propertyName: string | null;
  propertyType: string;
  commissionTenantIqd: number;
  commissionLandlordIqd: number;
  monthlyRentIqd: number;
  landlordName: string | null;
  tenantName: string;
  organizerName: string | null;
  dealEmployeeId?: string | null;
  dealEmployeeName?: string | null;
  dealEmployee?: { name: string } | null;
  currency: 'IQD' | 'USD';
  exchangeRate?: number;
  createdAt: Date | string;
};

function resolveIntermediary(c: {
  dealEmployeeName?: string | null;
  dealEmployee?: { name: string } | null;
  organizerName?: string | null;
}) {
  return (
    c.dealEmployeeName?.trim() ||
    c.dealEmployee?.name?.trim() ||
    c.organizerName?.trim() ||
    '—'
  );
}

export function mapSaleAccount(
  c: SaleSource,
  typeLabel: (key: string) => string,
): AccountRow {
  const rate = Math.max(1, c.exchangeRate || 150_000);
  const commissionSellerIqd = c.commissionSellerIqd || 0;
  const commissionBuyerIqd = c.commissionBuyerIqd || 0;
  const commissionIqd = commissionSellerIqd + commissionBuyerIqd;
  const commissionSellerUsd = iqdToUsd(commissionSellerIqd, rate);
  const commissionBuyerUsd = iqdToUsd(commissionBuyerIqd, rate);
  const propertyPriceIqd = c.totalAmount || 0;
  const propertyPriceUsd =
    c.totalAmountUsd && c.totalAmountUsd > 0
      ? c.totalAmountUsd
      : iqdToUsd(propertyPriceIqd, rate);

  const installments = c.installments ?? [];
  const paidInstallments = installments.filter((i) => i.status === 'PAID');
  const paidAmountIqd =
    (c.downPayment || 0) + paidInstallments.reduce((s, i) => s + (i.amount || 0), 0);
  const remainingAmountIqd = Math.max(0, propertyPriceIqd - paidAmountIqd);

  return {
    id: c.id,
    kind: 'sale',
    refNo: c.contractNo,
    name: c.title || c.house?.name || c.contractNo,
    propertyType: typeLabel(c.propertyType),
    propertyTypeKey: c.propertyType,
    commissionIqd,
    commissionSellerIqd,
    commissionBuyerIqd,
    commissionUsd: commissionSellerUsd + commissionBuyerUsd,
    commissionSellerUsd,
    commissionBuyerUsd,
    exchangeRate: rate,
    personName: c.buyerName?.trim() || c.sellerName?.trim() || '—',
    propertyPriceIqd,
    propertyPriceUsd,
    sellerName: c.sellerName?.trim() || '—',
    buyerName: c.buyerName?.trim() || '—',
    intermediaryName: resolveIntermediary(c),
    dealEmployeeId: c.dealEmployeeId ?? null,
    currency: c.currency === 'USD' ? 'USD' : 'IQD',
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : c.createdAt.toISOString(),
    paidAmountIqd,
    remainingAmountIqd,
    paidCount: paidInstallments.length,
    installmentCount: installments.length,
  };
}

export function mapRentalAccount(
  l: RentalSource,
  typeLabel: (key: string) => string,
): AccountRow {
  const rate = Math.max(1, l.exchangeRate || 150_000);
  const commissionSellerIqd = l.commissionLandlordIqd || 0;
  const commissionBuyerIqd = l.commissionTenantIqd || 0;
  const commissionIqd = commissionSellerIqd + commissionBuyerIqd;
  const commissionSellerUsd = iqdToUsd(commissionSellerIqd, rate);
  const commissionBuyerUsd = iqdToUsd(commissionBuyerIqd, rate);
  const propertyPriceIqd = l.monthlyRentIqd || 0;

  return {
    id: l.id,
    kind: 'rental',
    refNo: l.leaseNo,
    name: l.propertyName?.trim() || l.propertyCode || l.leaseNo,
    propertyType: typeLabel(l.propertyType),
    propertyTypeKey: l.propertyType,
    commissionIqd,
    commissionSellerIqd,
    commissionBuyerIqd,
    commissionUsd: commissionSellerUsd + commissionBuyerUsd,
    commissionSellerUsd,
    commissionBuyerUsd,
    exchangeRate: rate,
    personName: l.tenantName?.trim() || l.landlordName?.trim() || '—',
    propertyPriceIqd,
    propertyPriceUsd: iqdToUsd(propertyPriceIqd, rate),
    sellerName: l.landlordName?.trim() || '—',
    buyerName: l.tenantName?.trim() || '—',
    intermediaryName: resolveIntermediary(l),
    dealEmployeeId: l.dealEmployeeId ?? null,
    currency: l.currency === 'USD' ? 'USD' : 'IQD',
    createdAt: typeof l.createdAt === 'string' ? l.createdAt : l.createdAt.toISOString(),
    paidAmountIqd: 0,
    remainingAmountIqd: propertyPriceIqd,
    paidCount: 0,
    installmentCount: 0,
  };
}

export function rowsToSheetMatrix(
  rows: AccountRow[],
  locale: Locale,
  stream: AccountStream = 'all',
): (string | number)[][] {
  const L = accountColumnLabels(locale, stream);
  const showKind = stream === 'all';
  const iqdSuffix = locale === 'en' ? ' (IQD)' : locale === 'ar' ? ' (د.ع)' : ' (دینار)';
  const usdSuffix = locale === 'en' ? ' (USD)' : locale === 'ar' ? ' (دولار)' : ' (دۆلار)';
  const header = [
    L.refNo,
    ...(showKind ? [L.kind] : []),
    L.name,
    L.currency,
    L.commissionSeller + iqdSuffix,
    L.commissionSeller + usdSuffix,
    L.commissionBuyer + iqdSuffix,
    L.commissionBuyer + usdSuffix,
    L.commission + iqdSuffix,
    L.commission + usdSuffix,
    L.propertyPrice + iqdSuffix,
    L.propertyPrice + usdSuffix,
    locale === 'en' ? 'Paid (IQD)' : locale === 'ar' ? 'المدفوع (د.ع)' : 'وەرگیراو (دینار)',
    locale === 'en' ? 'Remaining (IQD)' : locale === 'ar' ? 'المتبقي (د.ع)' : 'ماوە (دینار)',
    L.sellerName,
    L.buyerName,
    L.intermediaryName,
  ];
  const body = rows.map((r) => [
    r.refNo,
    ...(showKind ? [kindLabel(r.kind, locale)] : []),
    r.name,
    r.currency,
    Math.round(r.commissionSellerIqd),
    r.commissionSellerUsd,
    Math.round(r.commissionBuyerIqd),
    r.commissionBuyerUsd,
    Math.round(r.commissionIqd),
    r.commissionUsd,
    Math.round(r.propertyPriceIqd),
    r.propertyPriceUsd,
    Math.round(r.paidAmountIqd),
    Math.round(r.remainingAmountIqd),
    r.sellerName,
    r.buyerName,
    r.intermediaryName,
  ]);
  return [header, ...body];
}
