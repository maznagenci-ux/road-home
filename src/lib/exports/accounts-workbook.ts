import ExcelJS from 'exceljs';
import type { Locale } from '@/i18n/locale-config';
import { BRAND_NAME } from '@/lib/brand';
import {
  accountColumnLabels,
  kindLabel,
  type AccountRow,
  type AccountStream,
} from '@/lib/exports/account-rows';

type BuildOpts = {
  rows: AccountRow[];
  locale: Locale;
  stream: AccountStream;
  title: string;
  subtitle: string;
};

const COLORS = {
  brand: '0F3D2E',
  brandSoft: 'E8F2ED',
  header: '1F4E3D',
  headerText: 'FFFFFF',
  seller: '0369A1',
  sellerBg: 'E0F2FE',
  buyer: '6D28D9',
  buyerBg: 'EDE9FE',
  total: '047857',
  totalBg: 'D1FAE5',
  price: '334155',
  priceBg: 'E2E8F0',
  paid: '0F766E',
  remain: 'B45309',
  remainBg: 'FEF3C7',
  zebra: 'F8FAF9',
  border: 'CBD5E1',
  muted: '64748B',
  white: 'FFFFFF',
};

function moneyIqd(n: number) {
  return Math.round(n || 0);
}

function moneyUsd(n: number) {
  return Math.round((n || 0) * 100) / 100;
}

function applyFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${argb}` },
  };
}

function applyFont(
  cell: ExcelJS.Cell,
  opts: Partial<ExcelJS.Font> & { color?: string },
) {
  cell.font = {
    name: 'Calibri',
    size: opts.size ?? 11,
    bold: opts.bold,
    color: opts.color ? { argb: `FF${opts.color}` } : undefined,
  };
}

function thinBorder(cell: ExcelJS.Cell) {
  const edge: ExcelJS.Border = {
    style: 'thin',
    color: { argb: `FF${COLORS.border}` },
  };
  cell.border = { top: edge, left: edge, bottom: edge, right: edge };
}

/** Polished commission workbook for sale / rental / all streams. */
export async function buildAccountsWorkbook(opts: BuildOpts): Promise<Buffer> {
  const { rows, locale, stream, title, subtitle } = opts;
  const L = accountColumnLabels(locale, stream);
  const showKind = stream === 'all';
  const showProgress = stream === 'sale' || stream === 'all';
  const rtl = locale === 'ckb' || locale === 'ar';

  const labels = {
    generated:
      locale === 'en'
        ? 'Generated'
        : locale === 'ar'
          ? 'تاريخ الإنشاء'
          : 'بەرواری دروستکردن',
    summary:
      locale === 'en' ? 'Summary' : locale === 'ar' ? 'الملخص' : 'کورتە',
    details:
      locale === 'en' ? 'Details' : locale === 'ar' ? 'التفاصيل' : 'وردەکاری',
    totalRow: locale === 'en' ? 'Total' : locale === 'ar' ? 'المجموع' : 'کۆ',
    paid: locale === 'en' ? 'Collected' : locale === 'ar' ? 'المحصل' : 'وەرگیراو',
    remain: locale === 'en' ? 'Remaining' : locale === 'ar' ? 'المتبقي' : 'ماوە',
    iqd: locale === 'en' ? 'IQD' : locale === 'ar' ? 'د.ع' : 'دینار',
    usd: locale === 'en' ? 'USD' : locale === 'ar' ? 'دولار' : 'دۆلار',
    records:
      locale === 'en' ? 'Records' : locale === 'ar' ? 'السجلات' : 'تۆمارەکان',
  };

  const totalSeller = rows.reduce((s, r) => s + (r.commissionSellerIqd || 0), 0);
  const totalBuyer = rows.reduce((s, r) => s + (r.commissionBuyerIqd || 0), 0);
  const totalComm = totalSeller + totalBuyer;
  const totalSellerUsd = rows.reduce((s, r) => s + (r.commissionSellerUsd || 0), 0);
  const totalBuyerUsd = rows.reduce((s, r) => s + (r.commissionBuyerUsd || 0), 0);
  const totalCommUsd = Math.round((totalSellerUsd + totalBuyerUsd) * 100) / 100;
  const totalPaid = rows.reduce((s, r) => s + (r.paidAmountIqd || 0), 0);
  const totalRemain = rows.reduce((s, r) => s + (r.remainingAmountIqd || 0), 0);
  const totalPriceIqd = rows.reduce((s, r) => s + (r.propertyPriceIqd || 0), 0);
  const totalPriceUsd = Math.round(
    rows.reduce((s, r) => s + (r.propertyPriceUsd || 0), 0) * 100,
  ) / 100;

  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND_NAME;
  wb.created = new Date();
  wb.modified = new Date();

  const sheetName =
    stream === 'sale'
      ? locale === 'en'
        ? 'Sales'
        : locale === 'ar'
          ? 'بيع'
          : 'فرۆشتن'
      : stream === 'rental'
        ? locale === 'en'
          ? 'Rentals'
          : locale === 'ar'
            ? 'إيجار'
            : 'کرێ'
        : locale === 'en'
          ? 'Accounts'
          : 'حیسابات';

  const ws = wb.addWorksheet(sheetName, {
    views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 0 }],
    properties: { defaultRowHeight: 18 },
  });

  const headers = [
    '#',
    L.refNo,
    ...(showKind ? [L.kind] : []),
    L.name,
    L.currency,
    `${L.propertyPrice} (${labels.iqd})`,
    `${L.propertyPrice} (${labels.usd})`,
    `${L.commissionSeller} (${labels.iqd})`,
    `${L.commissionSeller} (${labels.usd})`,
    `${L.commissionBuyer} (${labels.iqd})`,
    `${L.commissionBuyer} (${labels.usd})`,
    `${L.commission} (${labels.iqd})`,
    `${L.commission} (${labels.usd})`,
    ...(showProgress
      ? [`${labels.paid} (${labels.iqd})`, `${labels.remain} (${labels.iqd})`]
      : []),
    L.sellerName,
    L.buyerName,
    L.intermediaryName,
  ];
  const colCount = headers.length;

  // Title block
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  applyFill(titleCell, COLORS.brand);
  applyFont(titleCell, { bold: true, size: 16, color: COLORS.white });
  titleCell.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left' };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, colCount);
  const subCell = ws.getCell(2, 1);
  subCell.value = `${BRAND_NAME} · ${subtitle}`;
  applyFill(subCell, COLORS.brandSoft);
  applyFont(subCell, { size: 10, color: COLORS.brand });
  subCell.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left' };

  ws.mergeCells(3, 1, 3, colCount);
  const metaCell = ws.getCell(3, 1);
  const stamp = new Date().toLocaleString(
    locale === 'en' ? 'en-GB' : locale === 'ar' ? 'ar-IQ' : 'ckb-IQ',
  );
  metaCell.value = `${labels.generated}: ${stamp} · ${labels.records}: ${rows.length}`;
  applyFont(metaCell, { size: 9, color: COLORS.muted });
  metaCell.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left' };

  // Summary cards (row 5–6)
  ws.getCell(5, 1).value = labels.summary;
  applyFont(ws.getCell(5, 1), { bold: true, size: 12, color: COLORS.brand });

  const summaryDefs: {
    label: string;
    iqd: number;
    usd: number;
    color: string;
    bg: string;
  }[] = [
    {
      label: L.propertyPrice,
      iqd: totalPriceIqd,
      usd: totalPriceUsd,
      color: COLORS.price,
      bg: COLORS.priceBg,
    },
    {
      label: L.commissionSeller,
      iqd: totalSeller,
      usd: totalSellerUsd,
      color: COLORS.seller,
      bg: COLORS.sellerBg,
    },
    {
      label: L.commissionBuyer,
      iqd: totalBuyer,
      usd: totalBuyerUsd,
      color: COLORS.buyer,
      bg: COLORS.buyerBg,
    },
    {
      label: L.commission,
      iqd: totalComm,
      usd: totalCommUsd,
      color: COLORS.total,
      bg: COLORS.totalBg,
    },
  ];
  if (showProgress) {
    summaryDefs.push({
      label: labels.paid,
      iqd: totalPaid,
      usd: 0,
      color: COLORS.paid,
      bg: COLORS.totalBg,
    });
    summaryDefs.push({
      label: labels.remain,
      iqd: totalRemain,
      usd: 0,
      color: COLORS.remain,
      bg: COLORS.remainBg,
    });
  }

  summaryDefs.forEach((s, i) => {
    const c = 1 + i * 2;
    const labelCell = ws.getCell(6, c);
    const valueCell = ws.getCell(6, c + 1);
    labelCell.value = s.label;
    applyFill(labelCell, s.bg);
    applyFont(labelCell, { bold: true, size: 9, color: s.color });
    thinBorder(labelCell);
    labelCell.alignment = { vertical: 'middle', wrapText: true };

    valueCell.value =
      s.usd > 0
        ? `${moneyIqd(s.iqd).toLocaleString('en-US')} ${labels.iqd}\n$${moneyUsd(s.usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : `${moneyIqd(s.iqd).toLocaleString('en-US')} ${labels.iqd}`;
    applyFill(valueCell, s.bg);
    applyFont(valueCell, { bold: true, size: 11, color: s.color });
    thinBorder(valueCell);
    valueCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  ws.getRow(6).height = 36;

  // Details header
  const headerRowIdx = 8;
  ws.getCell(headerRowIdx - 1, 1).value = labels.details;
  applyFont(ws.getCell(headerRowIdx - 1, 1), { bold: true, size: 12, color: COLORS.brand });

  const headerRow = ws.getRow(headerRowIdx);
  headerRow.height = 26;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    applyFill(cell, COLORS.header);
    applyFont(cell, { bold: true, size: 10, color: COLORS.white });
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    thinBorder(cell);
  });

  // Tint money header subgroups
  const priceIqdCol = showKind ? 6 : 5;
  const priceUsdCol = priceIqdCol + 1;
  const sellerIqdCol = priceUsdCol + 1;
  const sellerUsdCol = sellerIqdCol + 1;
  const buyerIqdCol = sellerUsdCol + 1;
  const buyerUsdCol = buyerIqdCol + 1;
  const totalIqdCol = buyerUsdCol + 1;
  const totalUsdCol = totalIqdCol + 1;
  const paidCol = showProgress ? totalUsdCol + 1 : -1;
  const remainCol = showProgress ? paidCol + 1 : -1;

  [
    [priceIqdCol, COLORS.price],
    [priceUsdCol, COLORS.price],
    [sellerIqdCol, COLORS.seller],
    [sellerUsdCol, COLORS.seller],
    [buyerIqdCol, COLORS.buyer],
    [buyerUsdCol, COLORS.buyer],
    [totalIqdCol, COLORS.total],
    [totalUsdCol, COLORS.total],
  ].forEach(([col, color]) => {
    const cell = headerRow.getCell(col as number);
    applyFill(cell, color as string);
  });
  if (paidCol > 0) applyFill(headerRow.getCell(paidCol), COLORS.paid);
  if (remainCol > 0) applyFill(headerRow.getCell(remainCol), COLORS.remain);

  rows.forEach((r, idx) => {
    const rowIdx = headerRowIdx + 1 + idx;
    const values: (string | number)[] = [
      idx + 1,
      r.refNo,
      ...(showKind ? [kindLabel(r.kind, locale)] : []),
      r.name,
      r.currency,
      moneyIqd(r.propertyPriceIqd),
      moneyUsd(r.propertyPriceUsd),
      moneyIqd(r.commissionSellerIqd),
      moneyUsd(r.commissionSellerUsd),
      moneyIqd(r.commissionBuyerIqd),
      moneyUsd(r.commissionBuyerUsd),
      moneyIqd(r.commissionIqd),
      moneyUsd(r.commissionUsd),
      ...(showProgress ? [moneyIqd(r.paidAmountIqd), moneyIqd(r.remainingAmountIqd)] : []),
      r.sellerName,
      r.buyerName,
      r.intermediaryName,
    ];

    const excelRow = ws.getRow(rowIdx);
    excelRow.height = 20;
    values.forEach((v, i) => {
      const cell = excelRow.getCell(i + 1);
      cell.value = v;
      thinBorder(cell);
      applyFont(cell, { size: 10 });
      if (idx % 2 === 1) applyFill(cell, COLORS.zebra);

      const col = i + 1;
      if (col === 1 || col === (showKind ? 5 : 4)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (typeof v === 'number') {
        const isUsd =
          col === priceUsdCol ||
          col === sellerUsdCol ||
          col === buyerUsdCol ||
          col === totalUsdCol;
        cell.numFmt = isUsd ? '#,##0.00' : '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = {
          horizontal: rtl ? 'right' : 'left',
          vertical: 'middle',
        };
      }
    });

    applyFont(excelRow.getCell(priceIqdCol), { size: 10, color: COLORS.price, bold: true });
    applyFont(excelRow.getCell(priceUsdCol), { size: 10, color: COLORS.price });
    applyFont(excelRow.getCell(sellerIqdCol), { size: 10, color: COLORS.seller, bold: true });
    applyFont(excelRow.getCell(sellerUsdCol), { size: 10, color: COLORS.seller });
    applyFont(excelRow.getCell(buyerIqdCol), { size: 10, color: COLORS.buyer, bold: true });
    applyFont(excelRow.getCell(buyerUsdCol), { size: 10, color: COLORS.buyer });
    applyFont(excelRow.getCell(totalIqdCol), { size: 10, color: COLORS.total, bold: true });
    applyFont(excelRow.getCell(totalUsdCol), { size: 10, color: COLORS.total });
    if (paidCol > 0) {
      applyFont(excelRow.getCell(paidCol), { size: 10, color: COLORS.paid, bold: true });
    }
    if (remainCol > 0) {
      applyFont(excelRow.getCell(remainCol), { size: 10, color: COLORS.remain, bold: true });
    }
  });

  // Totals footer
  const footerIdx = headerRowIdx + 1 + rows.length;
  const footer = ws.getRow(footerIdx);
  footer.height = 24;
  for (let c = 1; c <= colCount; c++) {
    const cell = footer.getCell(c);
    applyFill(cell, COLORS.brandSoft);
    thinBorder(cell);
    applyFont(cell, { bold: true, size: 10, color: COLORS.brand });
  }
  footer.getCell(1).value = '';
  footer.getCell(showKind ? 4 : 3).value = labels.totalRow;
  footer.getCell(priceIqdCol).value = moneyIqd(totalPriceIqd);
  footer.getCell(priceIqdCol).numFmt = '#,##0';
  footer.getCell(priceUsdCol).value = moneyUsd(totalPriceUsd);
  footer.getCell(priceUsdCol).numFmt = '#,##0.00';
  footer.getCell(sellerIqdCol).value = moneyIqd(totalSeller);
  footer.getCell(sellerIqdCol).numFmt = '#,##0';
  footer.getCell(sellerUsdCol).value = moneyUsd(totalSellerUsd);
  footer.getCell(sellerUsdCol).numFmt = '#,##0.00';
  footer.getCell(buyerIqdCol).value = moneyIqd(totalBuyer);
  footer.getCell(buyerIqdCol).numFmt = '#,##0';
  footer.getCell(buyerUsdCol).value = moneyUsd(totalBuyerUsd);
  footer.getCell(buyerUsdCol).numFmt = '#,##0.00';
  footer.getCell(totalIqdCol).value = moneyIqd(totalComm);
  footer.getCell(totalIqdCol).numFmt = '#,##0';
  footer.getCell(totalUsdCol).value = moneyUsd(totalCommUsd);
  footer.getCell(totalUsdCol).numFmt = '#,##0.00';
  if (paidCol > 0) {
    footer.getCell(paidCol).value = moneyIqd(totalPaid);
    footer.getCell(paidCol).numFmt = '#,##0';
  }
  if (remainCol > 0) {
    footer.getCell(remainCol).value = moneyIqd(totalRemain);
    footer.getCell(remainCol).numFmt = '#,##0';
  }

  // Column widths
  const widths = [
    5,
    14,
    ...(showKind ? [10] : []),
    28,
    8,
    16,
    14,
    16,
    14,
    16,
    14,
    16,
    14,
    ...(showProgress ? [14, 14] : []),
    16,
    16,
    18,
  ];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Freeze below header
  ws.views = [
    {
      rightToLeft: rtl,
      state: 'frozen',
      ySplit: headerRowIdx,
      activeCell: 'A1',
    },
  ];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
