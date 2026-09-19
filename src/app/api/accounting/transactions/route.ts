import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { LedgerTxnType } from '@prisma/client';
import { requireApiPermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { postTransaction, softDeleteTransaction } from '@/lib/accounting/post';

const TXN_TYPES = [
  'INCOME',
  'EXPENSE',
  'CUSTOMER_PAYMENT',
  'CUSTOMER_REFUND',
  'SUPPLIER_PAYMENT',
  'CUSTOMER_DEBT',
  'SUPPLIER_DEBT',
  'PROPERTY_PURCHASE',
  'PROPERTY_SALE',
  'PROPERTY_RENTAL',
  'INSTALLMENT',
  'COMMISSION',
  'EMPLOYEE_COMMISSION',
  'INVESTMENT',
  'OWNER_CAPITAL',
  'OWNER_WITHDRAWAL',
  'CASH_DEPOSIT',
  'CASH_WITHDRAWAL',
  'BANK_DEPOSIT',
  'BANK_WITHDRAWAL',
  'TRANSFER',
  'ADJUSTMENT',
  'SALARY',
] as const;

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) return auth.error;
  await seedAccountingChart(prisma);

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const type = url.searchParams.get('type') as LedgerTxnType | null;
  const q = url.searchParams.get('q')?.trim();

  const items = await prisma.ledgerTransaction.findMany({
    where: {
      deletedAt: null,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { txnNo: { contains: q } },
              { receiptNo: { contains: q } },
              { voucherNo: { contains: q } },
              { partyName: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { date: 'desc' },
    take: 300,
    include: {
      cashAccount: { select: { name: true, code: true } },
      bankAccount: { select: { name: true, code: true } },
      house: { select: { code: true, name: true } },
      property: { select: { name: true } },
    },
  });

  const [cashAccounts, bankAccounts] = await Promise.all([
    prisma.cashAccount.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }),
    prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }),
  ]);

  return NextResponse.json({ items, cashAccounts, bankAccounts });
}

const postSchema = z.object({
  date: z.string().optional(),
  type: z.enum(TXN_TYPES),
  category: z.string().min(1),
  amountOriginal: z.number().positive(),
  currency: z.enum(['IQD']).default('IQD'),
  exchangeRate: z.number().positive().default(1),
  partyName: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  employeeUserId: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  houseId: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'CREDIT', 'TRANSFER', 'OTHER']).default('CASH'),
  cashAccountId: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  transferCashId: z.string().optional().nullable(),
  transferBankId: z.string().optional().nullable(),
  receiptNo: z.string().optional().nullable(),
  voucherNo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  allowOverdraft: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiPermission('ADD_VOUCHERS');
  if ('error' in auth) return auth.error;
  await seedAccountingChart(prisma);

  try {
    const data = postSchema.parse(await req.json());
    const txn = await postTransaction({
      ...data,
      date: data.date ? new Date(data.date) : new Date(),
      type: data.type as LedgerTxnType,
      createdById: auth.session.id,
    });

    // Auto employee commission on property sale when agent linked
    if (
      (data.type === 'PROPERTY_SALE' || data.type === 'COMMISSION') &&
      data.employeeUserId &&
      data.type === 'PROPERTY_SALE'
    ) {
      try {
        const { calcSaleCommission } = await import('@/lib/accounting/statements');
        const amountIqd =
          data.currency === 'IQD'
            ? data.amountOriginal
            : data.amountOriginal * (data.exchangeRate || 1);
        const { commissionIqd } = await calcSaleCommission(amountIqd);
        if (commissionIqd > 0) {
          await postTransaction({
            date: data.date ? new Date(data.date) : new Date(),
            type: 'EMPLOYEE_COMMISSION',
            category: 'COMMISSION',
            amountOriginal: commissionIqd,
            currency: 'IQD',
            exchangeRate: 1,
            employeeUserId: data.employeeUserId,
            partyName: data.partyName,
            paymentMethod: data.paymentMethod === 'CREDIT' ? 'CREDIT' : 'CASH',
            cashAccountId: data.cashAccountId,
            bankAccountId: data.bankAccountId,
            description: `Auto commission on ${txn.txnNo}`,
            createdById: auth.session.id,
            allowOverdraft: true,
          });
        }
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json({ txn }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'SERVER_ERROR' },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiPermission('REVERSE_VOUCHERS');
  if ('error' in auth) return auth.error;
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    await softDeleteTransaction(id, auth.session.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'SERVER_ERROR' },
      { status: 400 },
    );
  }
}
