import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createVoucher } from '@/lib/finance/engine';
import { hasPermission, logActivity } from '@/lib/access/permissions';

const bodySchema = z.object({
  houseCode: z.string().min(1),
  accountType: z.enum(['EXPENSE', 'VENDOR_PAYMENT', 'BUYER_PAYMENT', 'RECEIVABLE', 'PAYABLE', 'RENTAL_INCOME']),
  category: z
    .enum(['STEEL', 'CEMENT', 'LABOR', 'PERMITS', 'MATERIALS', 'EQUIPMENT', 'UTILITIES', 'OTHER'])
    .optional()
    .nullable(),
  amount: z.number().positive(),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  exchangeRate: z.number().positive(),
  paymentMethod: z.enum(['CASH_VAULT', 'CREDIT']),
  partyName: z.string().min(1),
  note: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await hasPermission(session.id, session.role, 'ADD_VOUCHERS');
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  try {
    const json = await req.json();
    const data = bodySchema.parse(json);

    const house = await prisma.house.findUnique({
      where: { code: data.houseCode.toUpperCase() },
    });
    if (!house) return NextResponse.json({ error: 'HOUSE_NOT_FOUND' }, { status: 404 });

    const amountIqd =
      data.currency === 'USD' ? data.amount * data.exchangeRate : data.amount;

    const voucher = await createVoucher({
      houseId: house.id,
      accountType: data.accountType,
      category: data.category ?? null,
      amountIqd,
      exchangeRate: data.exchangeRate,
      paymentMethod: data.paymentMethod,
      partyName: data.partyName,
      note: data.note ?? null,
      attachmentUrl: data.attachmentUrl ?? null,
      dueDate: data.dueDate
        ? new Date(data.dueDate.includes('T') ? data.dueDate : `${data.dueDate}T12:00:00.000Z`)
        : null,
      createdById: session.id,
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: `POST_${data.accountType}`,
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
