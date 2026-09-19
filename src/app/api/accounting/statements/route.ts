import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import {
  calcSaleCommission,
  getCustomerStatement,
  getOverdueInstallments,
  getOwnerCapitalMovements,
  getPropertyFinancialProfile,
  getSupplierStatement,
} from '@/lib/accounting/statements';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) return auth.error;
  await seedAccountingChart(prisma);

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind');

  try {
    if (kind === 'customer') {
      const id = url.searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
      return NextResponse.json(await getCustomerStatement(id));
    }
    if (kind === 'supplier') {
      const id = url.searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
      return NextResponse.json(await getSupplierStatement(id));
    }
    if (kind === 'property') {
      const id = url.searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
      return NextResponse.json(await getPropertyFinancialProfile(id));
    }
    if (kind === 'owner-capital') {
      return NextResponse.json(await getOwnerCapitalMovements());
    }
    if (kind === 'overdue-installments') {
      return NextResponse.json({ items: await getOverdueInstallments() });
    }
    if (kind === 'commission') {
      const amount = Number(url.searchParams.get('amount') || 0);
      return NextResponse.json(await calcSaleCommission(amount));
    }
    if (kind === 'lists') {
      const [customers, suppliers, properties] = await Promise.all([
        prisma.customer.findMany({ orderBy: { name: 'asc' }, take: 500 }),
        prisma.supplier.findMany({ orderBy: { name: 'asc' }, take: 500 }),
        prisma.property.findMany({ orderBy: { name: 'asc' }, take: 500 }),
      ]);
      return NextResponse.json({ customers, suppliers, properties });
    }
    return NextResponse.json({ error: 'UNKNOWN_KIND' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'SERVER_ERROR' },
      { status: 400 },
    );
  }
}
