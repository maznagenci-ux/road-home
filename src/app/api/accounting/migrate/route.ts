import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import { migrateLegacyFinanceToLedger } from '@/lib/accounting/bridge';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { prisma } from '@/lib/prisma';

/** Admin-only: migrate historical vouchers/receipts into ledger. */
export async function POST() {
  const auth = await requireApiPermission('MANAGE_USERS');
  if ('error' in auth) return auth.error;
  await seedAccountingChart(prisma);
  const result = await migrateLegacyFinanceToLedger();
  return NextResponse.json(result);
}
