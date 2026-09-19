import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getHouseFinancials } from '@/lib/finance/engine';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const houses = await prisma.house.findMany({
    orderBy: { code: 'asc' },
    include: { property: true },
  });

  const items = await Promise.all(
    houses.map(async (h) => {
      const financials = await getHouseFinancials(h.id);
      return {
        id: h.id,
        code: h.code,
        name: h.name,
        location: h.location ?? h.property?.location ?? null,
        status: h.status,
        budgetIqd: h.budgetIqd,
        financials,
      };
    }),
  );

  return NextResponse.json({ items });
}
