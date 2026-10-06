import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/access/permissions';
import { prisma } from '@/lib/prisma';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { getMonthlyOwnerBundle } from '@/lib/accounting/reports';
import { getPublicOrigin } from '@/lib/pdf/assets';
import { renderMonthlyOwnerReportHtml } from '@/lib/pdf/monthly-owner-report';
import { resolveAccountingBranchScope } from '@/lib/access/accounting-branch';
import { loadCompanyContact } from '@/lib/company-contact';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canReport = await hasPermission(session.id, session.role, 'VIEW_REPORTS');
  const canAccounting = await hasPermission(session.id, session.role, 'VIEW_ACCOUNTING');
  const canExport = await hasPermission(session.id, session.role, 'EXPORT_FINANCE');
  if (!canReport && !canAccounting && !canExport) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const url = new URL(req.url);
  const month = Number(url.searchParams.get('month') || new Date().getMonth() + 1);
  const year = Number(url.searchParams.get('year') || new Date().getFullYear());
  if (month < 1 || month > 12 || year < 2000) {
    return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 });
  }

  const branchScope = resolveAccountingBranchScope(session, url.searchParams.get('branchId'));

  await seedAccountingChart(prisma);
  await loadCompanyContact();
  const bundle = await getMonthlyOwnerBundle(month, year, branchScope);
  const html = renderMonthlyOwnerReportHtml(bundle, { assetBase: getPublicOrigin(req) });

  await prisma.monthlyReport.upsert({
    where: { year_month: { year, month } },
    update: {
      generatedAt: new Date(),
      generatedBy: session.id,
      snapshotJson: JSON.stringify(bundle),
      htmlPath: `/api/pdf/report/monthly?month=${month}&year=${year}`,
    },
    create: {
      year,
      month,
      generatedBy: session.id,
      snapshotJson: JSON.stringify(bundle),
      htmlPath: `/api/pdf/report/monthly?month=${month}&year=${year}`,
    },
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
