import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { getDashboardAccountingSnapshot, getMonthlyOwnerBundle } from '@/lib/accounting/reports';
import { resolveAccountingBranchScope } from '@/lib/access/accounting-branch';

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) return auth.error;
  await seedAccountingChart(prisma);

  const url = new URL(req.url);
  const month = Number(url.searchParams.get('month') || 0);
  const year = Number(url.searchParams.get('year') || 0);
  const branchScope = resolveAccountingBranchScope(
    auth.session,
    url.searchParams.get('branchId'),
  );

  if (month >= 1 && month <= 12 && year >= 2000) {
    const bundle = await getMonthlyOwnerBundle(month, year, branchScope);
    return NextResponse.json({ bundle, branchId: branchScope });
  }

  const [snapshot, branches] = await Promise.all([
    getDashboardAccountingSnapshot(branchScope),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    }),
  ]);
  return NextResponse.json({ snapshot, branchId: branchScope, branches });
}
