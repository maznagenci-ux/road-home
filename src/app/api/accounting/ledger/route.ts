import { NextResponse } from 'next/server';
import type { VoucherAccountType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';

const STREAM_TYPES = {
  construction: ['EXPENSE', 'VENDOR_PAYMENT', 'PAYABLE'] as const satisfies readonly VoucherAccountType[],
  /** پارە دانان بۆ پڕۆژەی بیناسازی */
  constructionDeposit: ['RECEIVABLE'] as const satisfies readonly VoucherAccountType[],
  trading: ['BUYER_PAYMENT', 'RECEIVABLE'] as const satisfies readonly VoucherAccountType[],
  rental: ['RENTAL_INCOME'] as const satisfies readonly VoucherAccountType[],
  office: ['OFFICE_EXPENSE', 'EMPLOYEE_SALARY'] as const satisfies readonly VoucherAccountType[],
};

const KIND_TYPES = {
  income: ['BUYER_PAYMENT', 'RENTAL_INCOME', 'RECEIVABLE'] as const satisfies readonly VoucherAccountType[],
  expense: ['EXPENSE', 'VENDOR_PAYMENT', 'PAYABLE'] as const satisfies readonly VoucherAccountType[],
};

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const stream = searchParams.get('stream'); // construction | trading | rental
  const kind = searchParams.get('kind'); // income | expense | all (legacy)

  let accountTypes: readonly VoucherAccountType[] | undefined;
  if (stream && stream in STREAM_TYPES) {
    accountTypes = STREAM_TYPES[stream as keyof typeof STREAM_TYPES];
  } else if (kind === 'income' || kind === 'expense') {
    accountTypes = KIND_TYPES[kind];
  }

  const items = await prisma.voucher.findMany({
    where: {
      status: 'POSTED',
      ...(accountTypes ? { accountType: { in: [...accountTypes] } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      house: { select: { code: true, name: true } },
      createdBy: { select: { name: true } },
    },
    take: 200,
  });

  const totals = items.reduce(
    (acc, v) => {
      if (['BUYER_PAYMENT', 'RENTAL_INCOME'].includes(v.accountType)) acc.income += v.amountIqd;
      if (['EXPENSE', 'VENDOR_PAYMENT'].includes(v.accountType)) acc.expense += v.amountIqd;
      if (['OFFICE_EXPENSE', 'EMPLOYEE_SALARY'].includes(v.accountType)) acc.expense += v.amountIqd;
      if (v.accountType === 'BUYER_PAYMENT') acc.salesIncome += v.amountIqd;
      if (v.accountType === 'RENTAL_INCOME') acc.rentalIncome += v.amountIqd;
      if (v.accountType === 'EXPENSE') acc.constructionExpense += v.amountIqd;
      return acc;
    },
    { income: 0, expense: 0, salesIncome: 0, rentalIncome: 0, constructionExpense: 0 },
  );

  return NextResponse.json({ items, totals, stream: stream ?? null, kind: kind ?? 'all' });
}
