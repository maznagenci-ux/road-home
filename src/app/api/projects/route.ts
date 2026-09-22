import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getHouseFinancials } from '@/lib/finance/engine';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const houses = await prisma.house.findMany({
    orderBy: { code: 'asc' },
    include: {
      property: { select: { id: true, name: true, location: true } },
      constructionProject: { select: { status: true, closedAt: true } },
    },
  });

  const items = await Promise.all(
    houses.map(async (h) => {
      const financials = await getHouseFinancials(h.id);
      const salePriceIqd = h.price ?? 0;
      const spentIqd = financials.totalSpentIqd;
      const profitIqd = salePriceIqd - spentIqd;
      const finishAt =
        h.targetFinishAt?.toISOString() ??
        h.constructionProject?.closedAt?.toISOString() ??
        null;

      return {
        id: h.id,
        code: h.code,
        name: h.name,
        unitNumber: h.unitNumber,
        location: h.location ?? h.property?.location ?? null,
        status: h.status,
        budgetIqd: h.budgetIqd,
        salePriceIqd,
        spentIqd,
        profitIqd,
        remainingBudgetIqd: h.budgetIqd - spentIqd,
        finishAt,
        financials,
      };
    }),
  );

  return NextResponse.json({ items });
}
