import { prisma } from '@/lib/prisma';
import { getIncomeExpenseSummary } from './reports';

export type SimpleReportRange = { from: Date; to: Date };

export type SimpleIncomeRow = {
  date: string;
  category: string;
  partyName: string;
  description: string;
  amountIqd: number;
  source: string;
};

export type SimpleExpenseRow = {
  date: string;
  category: string;
  partyName: string;
  description: string;
  amountIqd: number;
};

export type SimpleSalaryRow = {
  date: string;
  employeeName: string;
  category: string;
  periodLabel: string;
  amountIqd: number;
  voucherNo: string;
};

export type SimpleOwnerReport = {
  from: string;
  to: string;
  incomeIqd: number;
  expenseIqd: number;
  profitIqd: number;
  incomeByCategory: { category: string; amountIqd: number }[];
  expenseByCategory: { category: string; amountIqd: number }[];
  incomeRows: SimpleIncomeRow[];
  expenseRows: SimpleExpenseRow[];
  salaryRows: SimpleSalaryRow[];
};

function monthBounds(year: number, month: number): SimpleReportRange {
  return {
    from: new Date(year, month - 1, 1, 0, 0, 0, 0),
    to: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export function resolveSimpleRange(opts: {
  month?: number;
  year?: number;
  from?: string | null;
  to?: string | null;
}): SimpleReportRange {
  if (opts.from || opts.to) {
    const from = opts.from ? new Date(`${opts.from}T00:00:00`) : new Date(2000, 0, 1);
    const to = opts.to ? new Date(`${opts.to}T23:59:59.999`) : new Date();
    return { from, to };
  }
  const now = new Date();
  const month = opts.month && opts.month >= 1 && opts.month <= 12 ? opts.month : now.getMonth() + 1;
  const year = opts.year && opts.year >= 2000 ? opts.year : now.getFullYear();
  return monthBounds(year, month);
}

/** One plain report: profit, spend, income sources, employee salaries. */
export async function getSimpleOwnerReport(range: SimpleReportRange): Promise<SimpleOwnerReport> {
  const summary = await getIncomeExpenseSummary(range);

  const txns = await prisma.ledgerTransaction.findMany({
    where: {
      deletedAt: null,
      date: { gte: range.from, lte: range.to },
    },
    orderBy: { date: 'asc' },
    include: {
      employeeUser: { select: { name: true } },
      lines: { include: { ledgerAccount: { select: { class: true, code: true } } } },
    },
  });

  const incomeRows: SimpleIncomeRow[] = [];
  const expenseRows: SimpleExpenseRow[] = [];
  const salaryRows: SimpleSalaryRow[] = [];

  for (const t of txns) {
    const incomeAmt = t.lines
      .filter((l) => l.ledgerAccount.class === 'INCOME')
      .reduce((s, l) => s + l.creditIqd - l.debitIqd, 0);
    const expenseAmt = t.lines
      .filter((l) => l.ledgerAccount.class === 'EXPENSE')
      .reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);

    if (incomeAmt > 0.5) {
      incomeRows.push({
        date: t.date.toISOString().slice(0, 10),
        category: t.category,
        partyName: t.partyName ?? '—',
        description: t.description ?? '',
        amountIqd: incomeAmt,
        source: t.type,
      });
    }

    if (expenseAmt > 0.5) {
      expenseRows.push({
        date: t.date.toISOString().slice(0, 10),
        category: t.category,
        partyName: t.partyName ?? t.employeeUser?.name ?? '—',
        description: t.description ?? '',
        amountIqd: expenseAmt,
      });
    }

    const isSalary =
      t.type === 'SALARY' ||
      t.category === 'SALARY' ||
      t.category === 'BONUS' ||
      t.category === 'ALLOWANCE';
    if (isSalary && expenseAmt > 0.5) {
      salaryRows.push({
        date: t.date.toISOString().slice(0, 10),
        employeeName: t.employeeUser?.name ?? t.partyName ?? '—',
        category: t.category,
        periodLabel: '',
        amountIqd: expenseAmt,
        voucherNo: t.voucherNo ?? t.txnNo,
      });
    }
  }

  // Also pull legacy salary vouchers not yet mirrored (or with periodLabel)
  const salaryVouchers = await prisma.voucher.findMany({
    where: {
      status: 'POSTED',
      accountType: 'EMPLOYEE_SALARY',
      createdAt: { gte: range.from, lte: range.to },
    },
    include: { employeeUser: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  for (const v of salaryVouchers) {
    const already = salaryRows.some((r) => r.voucherNo === v.voucherNo);
    if (already) {
      const row = salaryRows.find((r) => r.voucherNo === v.voucherNo);
      if (row && v.periodLabel) row.periodLabel = v.periodLabel;
      continue;
    }
    salaryRows.push({
      date: v.createdAt.toISOString().slice(0, 10),
      employeeName: v.employeeUser?.name ?? v.partyName,
      category: v.category ?? 'SALARY',
      periodLabel: v.periodLabel ?? '',
      amountIqd: v.amountIqd,
      voucherNo: v.voucherNo,
    });
  }

  salaryRows.sort((a, b) => a.date.localeCompare(b.date));

  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    incomeIqd: summary.incomeIqd,
    expenseIqd: summary.expenseIqd,
    profitIqd: summary.netIqd,
    incomeByCategory: summary.incomeByCategory,
    expenseByCategory: summary.expenseByCategory,
    incomeRows,
    expenseRows,
    salaryRows,
  };
}
