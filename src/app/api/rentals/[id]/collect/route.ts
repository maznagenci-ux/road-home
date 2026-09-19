import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createVoucher } from '@/lib/finance/engine';
import { logActivity } from '@/lib/access/permissions';
import { requireApiPermission } from '@/lib/api-auth';

const schema = z.object({
  periodLabel: z.string().min(1),
  amountIqd: z.number().positive().optional(),
  exchangeRate: z.number().positive().default(150_000),
});

/**
 * Posts a RENTAL_INCOME voucher — excluded from construction cost-center spend.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('MANAGE_RENTALS');
  if ('error' in auth) return auth.error;
  const { session } = auth;

  const { id } = await params;
  const lease = await prisma.lease.findUnique({ where: { id } });
  if (!lease) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  try {
    const data = schema.parse(await req.json());
    const amountIqd = data.amountIqd ?? lease.monthlyRentIqd;

    const existingPay = await prisma.rentPayment.findFirst({
      where: { leaseId: lease.id, periodLabel: data.periodLabel },
    });
    if (existingPay) {
      return NextResponse.json({ payment: existingPay, alreadyPaid: true });
    }

    let houseId = lease.houseId;
    if (!houseId) {
      const house = await prisma.house.findUnique({ where: { code: lease.propertyCode } });
      houseId = house?.id ?? null;
    }

    let voucherId: string | null = null;
    if (houseId) {
      const voucher = await createVoucher({
        houseId,
        accountType: 'RENTAL_INCOME',
        category: null,
        amountIqd,
        exchangeRate: data.exchangeRate,
        paymentMethod: 'CASH_VAULT',
        partyName: lease.tenantName,
        note: `Rent ${data.periodLabel} · ${lease.leaseNo}`,
        createdById: session.id,
      });
      voucherId = voucher.id;
    }

    const payment = await prisma.rentPayment.create({
      data: {
        leaseId: lease.id,
        periodLabel: data.periodLabel,
        amountIqd,
        voucherId,
      },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'RENTAL_INCOME_VOUCHER',
      projectCode: lease.propertyCode,
      amountIqd,
      meta: `${lease.leaseNo} · ${data.periodLabel}${voucherId ? '' : ' · no-house'}`,
    });

    return NextResponse.json({ payment, voucherId }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
