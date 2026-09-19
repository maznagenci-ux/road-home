import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { getDashboardAccountingSnapshot, getMonthlyOwnerBundle } from '@/lib/accounting/reports';

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) return auth.error;
  await seedAccountingChart(prisma);

  const url = new URL(req.url);
  const month = Number(url.searchParams.get('month') || 0);
  const year = Number(url.searchParams.get('year') || 0);

  if (month >= 1 && month <= 12 && year >= 2000) {
    const bundle = await getMonthlyOwnerBundle(month, year);
    return NextResponse.json({ bundle });
  }

  const snapshot = await getDashboardAccountingSnapshot();
  return NextResponse.json({ snapshot });
}
