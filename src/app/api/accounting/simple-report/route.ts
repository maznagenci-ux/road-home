import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireApiPermission } from '@/lib/api-auth';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { prisma } from '@/lib/prisma';
import {
  getSimpleOwnerReport,
  resolveSimpleRange,
} from '@/lib/accounting/simple-report';
import { renderSimpleReportWordHtml } from '@/lib/pdf/simple-owner-report';

function fmt(n: number) {
  return Math.round(n);
}

function asciiStamp(from: Date, to: Date) {
  const a = from.toISOString().slice(0, 10);
  const b = to.toISOString().slice(0, 10);
  return `${a}_${b}`;
}

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) {
    // Also allow VIEW_REPORTS / EXPORT_FINANCE for owners who export
    const alt = await requireApiPermission('VIEW_REPORTS');
    if ('error' in alt) {
      const exp = await requireApiPermission('EXPORT_FINANCE');
      if ('error' in exp) return auth.error;
    }
  }

  try {
    await seedAccountingChart(prisma);

    const url = new URL(req.url);
    const format = (url.searchParams.get('format') || 'json').toLowerCase();
    const range = resolveSimpleRange({
      month: Number(url.searchParams.get('month') || 0) || undefined,
      year: Number(url.searchParams.get('year') || 0) || undefined,
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    });

    const report = await getSimpleOwnerReport(range);
    const stamp = asciiStamp(range.from, range.to);

    if (format === 'json') {
      return NextResponse.json({ report });
    }

    if (format === 'xlsx' || format === 'excel') {
      const book = XLSX.utils.book_new();

      // ASCII sheet names — Excel breaks on some Unicode sheet titles
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['Summary / پوختە'],
          ['From', range.from.toISOString().slice(0, 10)],
          ['To', range.to.toISOString().slice(0, 10)],
          [],
          ['Income / داهات', fmt(report.incomeIqd)],
          ['Expense / خەرجی', fmt(report.expenseIqd)],
          ['Profit / قازانج', fmt(report.profitIqd)],
        ]),
        'Summary',
      );

      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['Category', 'Amount IQD'],
          ...report.incomeByCategory.map((r) => [r.category, fmt(r.amountIqd)]),
        ]),
        'Income by source',
      );

      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['Date', 'Category', 'Party', 'Note', 'Amount IQD', 'Type'],
          ...report.incomeRows.map((r) => [
            r.date,
            r.category,
            r.partyName,
            r.description,
            fmt(r.amountIqd),
            r.source,
          ]),
        ]),
        'Income detail',
      );

      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['Category', 'Amount IQD'],
          ...report.expenseByCategory.map((r) => [r.category, fmt(r.amountIqd)]),
        ]),
        'Expense by category',
      );

      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['Date', 'Category', 'Party', 'Note', 'Amount IQD'],
          ...report.expenseRows.map((r) => [
            r.date,
            r.category,
            r.partyName,
            r.description,
            fmt(r.amountIqd),
          ]),
        ]),
        'Expense detail',
      );

      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['Date', 'Employee', 'Type', 'Period', 'Amount IQD', 'Voucher'],
          ...report.salaryRows.map((r) => [
            r.date,
            r.employeeName,
            r.category,
            r.periodLabel,
            fmt(r.amountIqd),
            r.voucherNo,
          ]),
        ]),
        'Salaries',
      );

      const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="hesabat-${stamp}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'doc' || format === 'word') {
      const html = renderSimpleReportWordHtml(report);
      // UTF-8 BOM so Word opens Kurdish correctly
      const bom = '\uFEFF';
      return new NextResponse(bom + html, {
        headers: {
          'Content-Type': 'application/msword; charset=utf-8',
          'Content-Disposition': `attachment; filename="hesabat-${stamp}.doc"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'pdf' || format === 'html') {
      const html = renderSimpleReportWordHtml(report).replace(
        '</head>',
        `<style>@media print{body{padding:0}} .print-bar{margin:0 0 16px;display:flex;gap:8px}
        .print-bar button{padding:8px 14px;border-radius:8px;border:1px solid #d6d3d1;background:#0f766e;color:#fff;cursor:pointer}
        @media print{.print-bar{display:none}}</style></head>`,
      ).replace(
        '<body>',
        `<body><div class="print-bar"><button onclick="window.print()">چاپ / PDF</button></div>`,
      );
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ error: 'UNKNOWN_FORMAT' }, { status: 400 });
  } catch (err) {
    console.error('simple-report export failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'EXPORT_FAILED' },
      { status: 500 },
    );
  }
}
