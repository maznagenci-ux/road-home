import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { prisma } from '@/lib/prisma';
import {
  getSimpleOwnerReport,
  resolveSimpleRange,
} from '@/lib/accounting/simple-report';
import { renderSimpleReportWordHtml } from '@/lib/pdf/simple-owner-report';
import { buildSimpleOwnerWorkbook } from '@/lib/exports/simple-owner-workbook';
import { getPublicOrigin } from '@/lib/pdf/assets';
import { resolveAccountingBranchScope } from '@/lib/access/accounting-branch';
import { loadCompanyContact } from '@/lib/company-contact';

function asciiStamp(from: Date, to: Date) {
  const a = from.toISOString().slice(0, 10);
  const b = to.toISOString().slice(0, 10);
  return `${a}_${b}`;
}

export async function GET(req: Request) {
  let auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_REPORTS');
    if ('error' in alt) {
      const exp = await requireApiPermission('EXPORT_FINANCE');
      if ('error' in exp) return auth.error;
      auth = exp;
    } else {
      auth = alt;
    }
  }

  try {
    await seedAccountingChart(prisma);
    await loadCompanyContact();

    const url = new URL(req.url);
    const format = (url.searchParams.get('format') || 'json').toLowerCase();
    const range = resolveSimpleRange({
      month: Number(url.searchParams.get('month') || 0) || undefined,
      year: Number(url.searchParams.get('year') || 0) || undefined,
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    });

    const branchScope = resolveAccountingBranchScope(
      auth.session,
      url.searchParams.get('branchId'),
    );

    const report = await getSimpleOwnerReport(range, branchScope);
    const stamp = asciiStamp(range.from, range.to);

    if (format === 'json') {
      return NextResponse.json({ report });
    }

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await buildSimpleOwnerWorkbook(report);
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
      const html = renderSimpleReportWordHtml(report, { assetBase: getPublicOrigin(req) });
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
      const html = renderSimpleReportWordHtml(report, { assetBase: getPublicOrigin(req) })
        .replace(
          '</head>',
          `<style>@media print{body{padding:0}} .print-bar{margin:0 0 16px;display:flex;gap:8px}
        .print-bar button{padding:8px 14px;border-radius:8px;border:1px solid #d6d3d1;background:#0f766e;color:#fff;cursor:pointer}
        @media print{.print-bar{display:none}}</style></head>`,
        )
        .replace(
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
