import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createVoucher } from '@/lib/finance/engine';
import { hasPermission, logActivity } from '@/lib/access/permissions';

const OFFICE_CATEGORIES = [
  'OFFICE_RENT',
  'OFFICE_UTILITIES',
  'OFFICE_SUPPLIES',
  'OFFICE_TRANSPORT',
  'OFFICE_COMM',
  'OTHER_OFFICE',
] as const;

const SALARY_CATEGORIES = ['SALARY', 'BONUS', 'ALLOWANCE'] as const;

const bodySchema = z.object({
  kind: z.enum(['office', 'salary']),
  category: z.enum([...OFFICE_CATEGORIES, ...SALARY_CATEGORIES]),
  amount: z.number().positive(),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  exchangeRate: z.number().positive(),
  paymentMethod: z.enum(['CASH_VAULT', 'CREDIT']).default('CASH_VAULT'),
  partyName: z.string().min(1),
  periodLabel: z.string().optional().nullable(),
  deductionIqd: z.number().min(0).optional().nullable(),
  employeeUserId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await hasPermission(session.id, session.role, 'VIEW_ACCOUNTING');
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const kind = new URL(req.url).searchParams.get('kind');
  const accountTypes =
    kind === 'office'
      ? (['OFFICE_EXPENSE'] as const)
      : kind === 'salary'
        ? (['EMPLOYEE_SALARY'] as const)
        : (['OFFICE_EXPENSE', 'EMPLOYEE_SALARY'] as const);

  const items = await prisma.voucher.findMany({
    where: {
      status: 'POSTED',
      accountType: { in: [...accountTypes] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      employeeUser: { select: { id: true, name: true } },
    },
    take: 500,
  });

  const totals = items.reduce(
    (acc, v) => {
      if (v.accountType === 'OFFICE_EXPENSE') acc.office += v.amountIqd;
      if (v.accountType === 'EMPLOYEE_SALARY') acc.salary += v.amountIqd;
      acc.all += v.amountIqd;
      return acc;
    },
    { office: 0, salary: 0, all: 0 },
  );

  const year = new Date().getFullYear();
  const yearPrefix = String(year);
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  type Payment = {
    id: string;
    voucherNo: string;
    category: string | null;
    periodLabel: string | null;
    amountIqd: number;
    note: string | null;
    createdAt: string;
  };
  type EmpYear = {
    key: string;
    employeeUserId: string | null;
    name: string;
    year: number;
    totalIqd: number;
    byCategory: Record<string, number>;
    payments: Payment[];
  };

  const empMap = new Map<string, EmpYear>();
  for (const v of items) {
    if (v.accountType !== 'EMPLOYEE_SALARY') continue;
    const inPeriod =
      (v.periodLabel && v.periodLabel.startsWith(yearPrefix)) ||
      (v.createdAt >= yearStart && v.createdAt < yearEnd);
    if (!inPeriod) continue;

    const name = (v.employeeUser?.name || v.partyName || '—').trim();
    const key = v.employeeUserId || name.toLowerCase();
    let row = empMap.get(key);
    if (!row) {
      row = {
        key,
        employeeUserId: v.employeeUserId,
        name,
        year,
        totalIqd: 0,
        byCategory: {},
        payments: [],
      };
      empMap.set(key, row);
    }
    row.totalIqd += v.amountIqd;
    const cat = v.category || 'OTHER';
    row.byCategory[cat] = (row.byCategory[cat] ?? 0) + v.amountIqd;
    row.payments.push({
      id: v.id,
      voucherNo: v.voucherNo,
      category: v.category,
      periodLabel: v.periodLabel,
      amountIqd: v.amountIqd,
      note: v.note,
      createdAt: v.createdAt.toISOString(),
    });
  }

  const employeeYear = [...empMap.values()].sort((a, b) => b.totalIqd - a.totalIqd);

  return NextResponse.json({ items, totals, employeeYear, year });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await hasPermission(session.id, session.role, 'ADD_VOUCHERS');
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  try {
    const data = bodySchema.parse(await req.json());

    if (data.kind === 'office' && !(OFFICE_CATEGORIES as readonly string[]).includes(data.category)) {
      return NextResponse.json({ error: 'INVALID_CATEGORY' }, { status: 400 });
    }
    if (data.kind === 'salary' && !(SALARY_CATEGORIES as readonly string[]).includes(data.category)) {
      return NextResponse.json({ error: 'INVALID_CATEGORY' }, { status: 400 });
    }

    const amountIqd =
      data.currency === 'USD' ? data.amount * data.exchangeRate : data.amount;

    const gross = amountIqd;
    const deduction = Math.max(0, data.deductionIqd ?? 0);
    const net = Math.max(0, gross - deduction);
    if (net <= 0) {
      return NextResponse.json({ error: 'INVALID_NET' }, { status: 400 });
    }

    const noteParts = [
      data.note?.trim() || null,
      deduction > 0 ? `deduction=${deduction}` : null,
      deduction > 0 ? `gross=${gross}` : null,
    ].filter(Boolean);

    const voucher = await createVoucher({
      houseId: null,
      accountType: data.kind === 'salary' ? 'EMPLOYEE_SALARY' : 'OFFICE_EXPENSE',
      category: data.category,
      amountIqd: net,
      exchangeRate: data.exchangeRate,
      paymentMethod: data.paymentMethod,
      partyName: data.partyName,
      periodLabel: data.periodLabel ?? null,
      deductionIqd: deduction,
      employeeUserId: data.employeeUserId ?? null,
      note: noteParts.length ? noteParts.join(' · ') : null,
      dueDate: data.dueDate
        ? new Date(data.dueDate.includes('T') ? data.dueDate : `${data.dueDate}T12:00:00.000Z`)
        : null,
      createdById: session.id,
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: data.kind === 'salary' ? 'POST_EMPLOYEE_SALARY' : 'POST_OFFICE_EXPENSE',
      projectCode: data.kind === 'salary' ? 'SALARY' : 'OFFICE',
      amountIqd: net,
      meta: voucher.voucherNo,
    });

    return NextResponse.json({ voucher }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'SERVER_ERROR';
    const status = message === 'DUE_DATE_REQUIRED' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
