import ExcelJS from 'exceljs';
import type { SimpleOwnerReport, ReportCurrency } from '@/lib/accounting/simple-report';
import { BRAND_NAME, BRAND_NAME_KU } from '@/lib/brand';
import { companyAddressLine, companyContact } from '@/lib/company-contact';

const C = {
  brand: '0B1F38',
  teal: '0F766E',
  headerText: 'FFFFFF',
  soft: 'F8FAFC',
  border: 'CBD5E1',
  income: 'ECFDF5',
  expense: 'FFF1F2',
  profit: 'EFF6FF',
  muted: '64748B',
};

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${argb}` } };
}

function font(cell: ExcelJS.Cell, opts: Partial<ExcelJS.Font> & { color?: string }) {
  cell.font = {
    name: 'Calibri',
    size: opts.size ?? 11,
    bold: opts.bold,
    color: opts.color ? { argb: `FF${opts.color}` } : undefined,
  };
}

function border(cell: ExcelJS.Cell) {
  const e: ExcelJS.Border = { style: 'thin', color: { argb: `FF${C.border}` } };
  cell.border = { top: e, left: e, bottom: e, right: e };
}

function moneyLabel(amount: number, currency: ReportCurrency) {
  if (currency === 'USD') return Math.round(amount * 100) / 100;
  return Math.round(amount);
}

/** Polished Excel export — dual currency + company contact. */
export async function buildSimpleOwnerWorkbook(report: SimpleOwnerReport): Promise<Buffer> {
  const contact = companyContact();
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND_NAME;
  wb.created = new Date();

  const summary = wb.addWorksheet('پوختە', {
    views: [{ rightToLeft: true }],
    properties: { defaultRowHeight: 20 },
  });
  summary.columns = [{ width: 28 }, { width: 22 }, { width: 18 }, { width: 18 }];

  summary.mergeCells('A1:D1');
  summary.getCell('A1').value = BRAND_NAME_KU;
  font(summary.getCell('A1'), { bold: true, size: 18, color: C.brand });

  summary.mergeCells('A2:D2');
  summary.getCell('A2').value = `${BRAND_NAME} · ڕاپۆرتی دارایی خاوەن`;
  font(summary.getCell('A2'), { size: 11, color: C.muted });

  summary.mergeCells('A3:D3');
  summary.getCell('A3').value = companyAddressLine(contact);
  font(summary.getCell('A3'), { size: 10, color: C.brand });

  summary.mergeCells('A4:D4');
  summary.getCell('A4').value = contact.phones.join('  ·  ') || '—';
  font(summary.getCell('A4'), { size: 10, color: C.teal });
  summary.getCell('A4').alignment = { horizontal: 'left', readingOrder: 'ltr' };

  summary.getCell('A6').value = 'لە';
  summary.getCell('B6').value = report.from.slice(0, 10);
  summary.getCell('C6').value = 'بۆ';
  summary.getCell('D6').value = report.to.slice(0, 10);

  const cards = [
    ['داهات (دینار)', report.incomeIqd, 'داهات (دۆلار)', report.incomeUsd, C.income],
    ['خەرجی (دینار)', report.expenseIqd, 'خەرجی (دۆلار)', report.expenseUsd, C.expense],
    ['قازانج (دینار)', report.profitIqd, 'قازانج (دۆلار)', report.profitUsd, C.profit],
  ] as const;

  let row = 8;
  for (const [l1, v1, l2, v2, bg] of cards) {
    summary.getCell(`A${row}`).value = l1;
    summary.getCell(`B${row}`).value = Math.round(v1);
    summary.getCell(`C${row}`).value = l2;
    summary.getCell(`D${row}`).value = Math.round(v2 * 100) / 100;
    for (const col of ['A', 'B', 'C', 'D']) {
      fill(summary.getCell(`${col}${row}`), bg);
      border(summary.getCell(`${col}${row}`));
      font(summary.getCell(`${col}${row}`), { bold: col === 'A' || col === 'C', size: 11 });
    }
    summary.getCell(`B${row}`).numFmt = '#,##0';
    summary.getCell(`D${row}`).numFmt = '#,##0.00';
    row += 1;
  }

  summary.getCell(`A${row + 1}`).value =
    'تێبینی: هەر مامەڵەیەک بە دراوی خۆی — دۆلار وەک دۆلار، دینار وەک دینار';
  font(summary.getCell(`A${row + 1}`), { size: 10, color: C.muted });
  summary.mergeCells(`A${row + 1}:D${row + 1}`);

  function detailSheet(
    name: string,
    headers: string[],
    rows: (string | number)[][],
  ) {
    const ws = wb.addWorksheet(name, {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
    });
    ws.addRow(headers);
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      fill(cell, C.brand);
      font(cell, { bold: true, color: C.headerText, size: 11 });
      border(cell);
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
    headerRow.height = 24;
    rows.forEach((r, i) => {
      const excelRow = ws.addRow(r);
      excelRow.eachCell((cell) => {
        border(cell);
        if (i % 2 === 1) fill(cell, C.soft);
      });
    });
    ws.columns.forEach((col) => {
      col.width = 16;
    });
    if (ws.columns[0]) ws.columns[0].width = 12;
    if (ws.columns[3]) ws.columns[3].width = 28;
  }

  detailSheet(
    'داهات',
    ['بەروار', 'پۆل', 'لایەن', 'تێبینی', 'بڕ', 'دراو'],
    report.incomeRows.map((r) => [
      r.date,
      r.category,
      r.partyName,
      r.description,
      moneyLabel(r.amount, r.currency),
      r.currency,
    ]),
  );

  detailSheet(
    'خەرجی',
    ['بەروار', 'پۆل', 'لایەن', 'تێبینی', 'بڕ', 'دراو'],
    report.expenseRows.map((r) => [
      r.date,
      r.category,
      r.partyName,
      r.description,
      moneyLabel(r.amount, r.currency),
      r.currency,
    ]),
  );

  detailSheet(
    'مووچە',
    ['بەروار', 'کارمەند', 'جۆر', 'ماوە', 'بڕ', 'دراو', 'وەسڵ'],
    report.salaryRows.map((r) => [
      r.date,
      r.employeeName,
      r.category,
      r.periodLabel || '—',
      moneyLabel(r.amount, r.currency),
      r.currency,
      r.voucherNo,
    ]),
  );

  const cat = wb.addWorksheet('پۆلەکان', { views: [{ rightToLeft: true }] });
  cat.addRow(['جۆر', 'پۆل', 'دینار', 'دۆلار']);
  cat.getRow(1).eachCell((cell) => {
    fill(cell, C.teal);
    font(cell, { bold: true, color: C.headerText });
    border(cell);
  });
  for (const r of report.incomeByCategory) {
    cat.addRow(['داهات', r.category, Math.round(r.amountIqd), Math.round(r.amountUsd * 100) / 100]);
  }
  for (const r of report.expenseByCategory) {
    cat.addRow(['خەرجی', r.category, Math.round(r.amountIqd), Math.round(r.amountUsd * 100) / 100]);
  }
  cat.columns = [{ width: 12 }, { width: 22 }, { width: 16 }, { width: 14 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
