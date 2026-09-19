import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { getTotalAvailableMoney, getCashReport } from '@/lib/accounting/reports';
import { postTransaction, transfer } from '@/lib/accounting/post';

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) return auth.error;
  await seedAccountingChart(prisma);

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const accountId = url.searchParams.get('accountId') ?? undefined;
  const range = {
    from: from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: to ? new Date(to) : new Date(),
  };

  const [accounts, money, reports] = await Promise.all([
    prisma.cashAccount.findMany({ orderBy: { code: 'asc' } }),
    getTotalAvailableMoney(),
    getCashReport(range, accountId),
  ]);

  return NextResponse.json({ accounts, money, reports, range });
}

const createSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  openingBalance: z.number().default(0),
  allowNegative: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiPermission('ADD_VOUCHERS');
  if ('error' in auth) return auth.error;
  await seedAccountingChart(prisma);

  try {
    const body = await req.json();
    if (body.action === 'transfer') {
      const schema = z.object({
        amount: z.number().positive(),
        fromCashId: z.string().optional().nullable(),
        toCashId: z.string().optional().nullable(),
        description: z.string().optional(),
        date: z.string().optional(),
      });
      const data = schema.parse(body);
      const txn = await transfer({
        date: data.date ? new Date(data.date) : new Date(),
        amount: data.amount,
        fromCashId: data.fromCashId,
        toCashId: data.toCashId,
        description: data.description,
        createdById: auth.session.id,
      });
      return NextResponse.json({ txn }, { status: 201 });
    }

    if (body.action === 'deposit' || body.action === 'withdraw') {
      const schema = z.object({
        cashAccountId: z.string().min(1),
        amount: z.number().positive(),
        description: z.string().optional(),
        date: z.string().optional(),
      });
      const data = schema.parse(body);
      const txn = await postTransaction({
        date: data.date ? new Date(data.date) : new Date(),
        type: body.action === 'deposit' ? 'CASH_DEPOSIT' : 'CASH_WITHDRAWAL',
        category: body.action === 'deposit' ? 'CASH_DEPOSIT' : 'CASH_WITHDRAWAL',
        amountOriginal: data.amount,
        cashAccountId: data.cashAccountId,
        paymentMethod: 'CASH',
        description: data.description,
        createdById: auth.session.id,
        allowOverdraft: false,
      });
      return NextResponse.json({ txn }, { status: 201 });
    }

    const data = createSchema.parse(body);
    const code = data.code.toUpperCase();
    const cash = await prisma.cashAccount.create({
      data: {
        code,
        name: data.name,
        currency: data.currency,
        openingBalance: data.openingBalance,
        allowNegative: data.allowNegative ?? false,
      },
    });
    await prisma.ledgerAccount.create({
      data: {
        code: `C-${code}`,
        name: data.name,
        nameKu: data.name,
        class: 'ASSET',
        isSystem: false,
        cashAccountId: cash.id,
      },
    });
    return NextResponse.json({ account: cash }, { status: 201 });
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
