import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';

/** Lightweight active-user directory for deal-employee / salary pickers. */
export async function GET() {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) {
    const alt = await requireApiPermission('MANAGE_RENTALS');
    if ('error' in alt) {
      const viewC = await requireApiPermission('VIEW_CONTRACTS');
      if ('error' in viewC) {
        const viewR = await requireApiPermission('VIEW_RENTALS');
        if ('error' in viewR) {
          const acc = await requireApiPermission('VIEW_ACCOUNTING');
          if ('error' in acc) {
            const add = await requireApiPermission('ADD_VOUCHERS');
            if ('error' in add) return add.error;
          }
        }
      }
    }
  }

  const items = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  });

  return NextResponse.json({ items });
}
