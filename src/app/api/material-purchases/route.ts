import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createVoucher } from '@/lib/finance/engine';
import { hasPermission, logActivity } from '@/lib/access/permissions';

const postSchema = z.object({
  houseCode: z.string().min(1),
  buyerName: z.string().min(1),
  partyName: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  exchangeRate: z.number().positive(),
  paymentMethod: z.enum(['CASH_VAULT', 'CREDIT']).default('CASH_VAULT'),
  note: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.voucher.findMany({
    where: {
      accountType: 'EXPENSE',
      category: 'MATERIALS',
      status: 'POSTED',
      reversesId: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      house: { select: { id: true, code: true, name: true, unitNumber: true } },
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json({
    items: items.map((v) => ({
      id: v.id,
      voucherNo: v.voucherNo,
      houseCode: v.house?.code ?? null,
      houseName: v.house?.name ?? null,
      unitNumber: v.house?.unitNumber ?? null,
      buyerName: v.buyerName,
      partyName: v.partyName,
      amountIqd: v.amountIqd,
      note: v.note,
      attachmentUrl: v.attachmentUrl,
      paymentMethod: v.paymentMethod,
      createdAt: v.createdAt.toISOString(),
      createdBy: v.createdBy?.name ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await hasPermission(session.id, session.role, 'ADD_VOUCHERS');
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  try {
    const data = postSchema.parse(await req.json());

    const house = await prisma.house.findUnique({
      where: { code: data.houseCode.toUpperCase() },
    });
    if (!house) return NextResponse.json({ error: 'HOUSE_NOT_FOUND' }, { status: 404 });

    const amountIqd =
      data.currency === 'USD' ? data.amount * data.exchangeRate : data.amount;

    const voucher = await createVoucher({
      houseId: house.id,
      accountType: 'EXPENSE',
      category: 'MATERIALS',
      amountIqd,
      exchangeRate: data.exchangeRate,
      paymentMethod: data.paymentMethod,
      partyName: data.partyName,
      buyerName: data.buyerName,
      note: data.note ?? null,
      attachmentUrl: data.attachmentUrl ?? null,
      dueDate:
        data.paymentMethod === 'CREDIT' && data.dueDate
          ? new Date(
              data.dueDate.includes('T') ? data.dueDate : `${data.dueDate}T12:00:00.000Z`,
            )
          : null,
      createdById: session.id,
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'POST_MATERIAL_PURCHASE',
      projectCode: house.code,
      amountIqd,
      meta: voucher.voucherNo,
    });

    return NextResponse.json({ voucher }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'SERVER_ERROR';
    const status =
      message === 'DUE_DATE_REQUIRED' || message === 'HOUSE_CODE_REQUIRED' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
