import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, localeFromUser, type Locale } from '@/i18n/locale-config';
import {
  filterRowsByStream,
  mapRentalAccount,
  mapSaleAccount,
  type AccountKind,
  type AccountRow,
} from '@/lib/exports/account-rows';
import { buildAccountsWorkbook } from '@/lib/exports/accounts-workbook';
import { renderAccountsReportHtml } from '@/lib/pdf/accounts-report';
import { requireApiPermission } from '@/lib/api-auth';

function typeLabelFactory(locale: Locale, t: Awaited<ReturnType<typeof getDictionary>>) {
  const map: Record<string, string> = {
    HOUSE: t.pages.contractGen.typeHouse,
    APARTMENT: t.pages.contractGen.typeApartment,
    LAND: t.pages.contractGen.typeLand,
    SHOP: t.pages.contractGen.typeShop,
    BUILDING: t.pages.contractGen.typeBuilding,
  };
  return (key: string) => map[key] ?? key;
}

async function loadRows(
  type: 'sale' | 'rental' | 'all',
  id: string | null,
  label: (key: string) => string,
): Promise<AccountRow[]> {
  const rows: AccountRow[] = [];
  const saleInclude = {
    house: { select: { code: true, name: true } },
    dealEmployee: { select: { name: true } },
    installments: { select: { amount: true, status: true } },
  } as const;

  if (type === 'sale' || type === 'all') {
    if (id && type === 'sale') {
      const c = await prisma.contract.findUnique({
        where: { id },
        include: saleInclude,
      });
      if (c) rows.push(mapSaleAccount(c, label));
    } else if (!id || type === 'all') {
      const list = await prisma.contract.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: saleInclude,
      });
      const filtered = id ? list.filter((c) => c.id === id) : list;
      rows.push(...filtered.map((c) => mapSaleAccount(c, label)));
    }
  }

  if (type === 'rental' || type === 'all') {
    const rentalInclude = { dealEmployee: { select: { name: true } } } as const;
    if (id && type === 'rental') {
      const l = await prisma.lease.findUnique({
        where: { id },
        include: rentalInclude,
      });
      if (l) rows.push(mapRentalAccount(l, label));
    } else if (!id || type === 'all') {
      const list = await prisma.lease.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: rentalInclude,
      });
      const filtered = id ? list.filter((l) => l.id === id) : list;
      rows.push(...filtered.map((l) => mapRentalAccount(l, label)));
    }
  }

  return rows;
}

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_CONTRACTS');
    if ('error' in alt) return alt.error;
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const typeParam = url.searchParams.get('type') || 'all';
  const type = (['sale', 'rental', 'all'].includes(typeParam)
    ? typeParam
    : 'all') as 'sale' | 'rental' | 'all';
  const id = url.searchParams.get('id');
  const format = url.searchParams.get('format') || 'json';
  const localeParam = url.searchParams.get('locale');
  const locale: Locale =
    localeParam && hasLocale(localeParam) ? localeParam : localeFromUser(session.locale);
  const autoPrint = url.searchParams.get('print') === '1';

  const t = await getDictionary(locale);
  const label = typeLabelFactory(locale, t);
  const rows = filterRowsByStream(await loadRows(type, id, label), type);

  if (format === 'json') {
    return NextResponse.json({ items: rows });
  }

  const ae = (t.pages as { accountsExport?: Record<string, string> }).accountsExport ?? {};
  const titleMap: Record<string, string> = {
    sale: ae.titleSale ?? (locale === 'en' ? 'Sales commission accounts' : locale === 'ar' ? 'حسابات عمولة البيع' : 'حیساباتی دەستخۆشی فرۆشتن'),
    rental: ae.titleRental ?? (locale === 'en' ? 'Rental commission accounts' : locale === 'ar' ? 'حسابات عمولة الإيجار' : 'حیساباتی دەستخۆشی کرێ'),
    all: ae.titleAll ?? (locale === 'en' ? 'Sale & rental commission accounts' : locale === 'ar' ? 'حسابات عمولة البيع والإيجار' : 'حیساباتی دەستخۆشی — فرۆشتن و کرێ'),
  };
  const title = titleMap[type] ?? titleMap.all;
  const subtitle =
    id
      ? locale === 'en'
        ? 'Single record'
        : locale === 'ar'
          ? 'سجل واحد'
          : 'یەک تۆمار'
      : type === 'sale'
        ? ae.subtitleSale ??
          (locale === 'en'
            ? 'Sale contracts only'
            : locale === 'ar'
              ? 'عقود البيع فقط'
              : 'تەنها گرێبەستی کڕین و فرۆشتن')
        : type === 'rental'
          ? ae.subtitleRental ??
            (locale === 'en'
              ? 'Rental contracts only'
              : locale === 'ar'
                ? 'عقود الإيجار فقط'
                : 'تەنها گرێبەستی کرێ')
          : ae.subtitle ??
            (locale === 'en'
              ? 'All contracts'
              : locale === 'ar'
                ? 'كل العقود'
                : 'هەموو گرێبەستەکان');

  if (format === 'html' || format === 'print') {
    const html = renderAccountsReportHtml(locale, t, {
      title,
      subtitle,
      rows,
      stream: type,
      autoPrint: autoPrint || format === 'print',
      assetBase: url.origin,
    });
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (format === 'xlsx') {
    const buffer = await buildAccountsWorkbook({
      rows,
      locale,
      stream: type,
      title,
      subtitle,
    });
    const filename = `accounts-${type}${id ? `-${id.slice(0, 8)}` : ''}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: 'BAD_FORMAT' }, { status: 400 });
}

export type { AccountKind };
