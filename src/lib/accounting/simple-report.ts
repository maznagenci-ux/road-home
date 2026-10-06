import { prisma } from '@/lib/prisma';
import { getIncomeExpenseSummary } from './reports';

export type SimpleReportRange = { from: Date; to: Date };
export type ReportCurrency = 'IQD' | 'USD';

export type SimpleIncomeRow = {
  date: string;
  category: string;
  partyName: string;
  description: string;
  /** Amount in the transaction's own currency */
  amount: number;
  currency: ReportCurrency;
  amountIqd: number;
  source: string;
};

export type SimpleExpenseRow = {
  date: string;
  category: string;
  partyName: string;
  description: string;
  amount: number;
  currency: ReportCurrency;
  amountIqd: number;
};

export type SimpleSalaryRow = {
  date: string;
  employeeName: string;
  category: string;
  periodLabel: string;
  amount: number;
  currency: ReportCurrency;
  amountIqd: number;
  voucherNo: string;
};

export type CategoryMoney = {
  category: string;
  amountIqd: number;
  amountUsd: number;
};

export type SimpleOwnerReport = {
  from: string;
  to: string;
  incomeIqd: number;
  incomeUsd: number;
  expenseIqd: number;
  expenseUsd: number;
  profitIqd: number;
  profitUsd: number;
  incomeByCategory: CategoryMoney[];
  expenseByCategory: CategoryMoney[];
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

function asCur(v: string | null | undefined): ReportCurrency {
  return v === 'USD' ? 'USD' : 'IQD';
}

/**
 * Prefer amountOriginal (true posted currency). Scale when only a portion of
 * the txn hits income/expense lines.
 */
function displayAmount(opts: {
  lineIqd: number;
  currency: ReportCurrency;
  amountOriginal: number;
  amountBaseIqd: number;
  rate: number;
}): number {
  const { lineIqd, currency, amountOriginal, amountBaseIqd, rate } = opts;
  if (currency === 'USD') {
    if (amountBaseIqd > 0.5 && amountOriginal > 0) {
      const share = lineIqd / amountBaseIqd;
      return Math.round(amountOriginal * share * 100) / 100;
    }
    const r = rate > 1 ? rate : 150000;
    return Math.round((lineIqd / r) * 100) / 100;
  }
  return Math.round(lineIqd);
}

function voucherDisplay(v: {
  amountIqd: number;
  amountUsd: number;
  exchangeRate: number;
}): { amount: number; currency: ReportCurrency; amountIqd: number } {
  const rate = v.exchangeRate > 1 ? v.exchangeRate : 0;
  const looksUsd =
    v.amountUsd > 0.005 &&
    rate > 1 &&
    Math.abs(v.amountIqd - v.amountUsd * rate) <= Math.max(2, rate * 0.02);
  if (looksUsd) {
    return {
      amount: Math.round(v.amountUsd * 100) / 100,
      currency: 'USD',
      amountIqd: v.amountIqd,
    };
  }
  return { amount: Math.round(v.amountIqd), currency: 'IQD', amountIqd: v.amountIqd };
}

function bumpCategory(
  map: Map<string, CategoryMoney>,
  category: string,
  currency: ReportCurrency,
  amount: number,
  amountIqd: number,
) {
  const row = map.get(category) ?? { category, amountIqd: 0, amountUsd: 0 };
  if (currency === 'USD') row.amountUsd += amount;
  else row.amountIqd += amountIqd;
  map.set(category, row);
}

/** One plain report: profit, spend, income — amounts keep their original currency. */
export async function getSimpleOwnerReport(
  range: SimpleReportRange,
  branchId?: string | null,
): Promise<SimpleOwnerReport> {
  const summary = await getIncomeExpenseSummary(range, branchId);

  const txns = await prisma.ledgerTransaction.findMany({
    where: {
      deletedAt: null,
      date: { gte: range.from, lte: range.to },
      ...(branchId ? { branchId } : {}),
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
  const incomeCat = new Map<string, CategoryMoney>();
  const expenseCat = new Map<string, CategoryMoney>();
  let incomeIqdNative = 0;
  let expenseIqdNative = 0;
  let incomeUsd = 0;
  let expenseUsd = 0;

  for (const t of txns) {
    const currency = asCur(t.currency);
    const rate = t.exchangeRate || 1;
    const incomeAmt = t.lines
      .filter((l) => l.ledgerAccount.class === 'INCOME')
      .reduce((s, l) => s + l.creditIqd - l.debitIqd, 0);
    const expenseAmt = t.lines
      .filter((l) => l.ledgerAccount.class === 'EXPENSE')
      .reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);

    if (incomeAmt > 0.5) {
      const amount = displayAmount({
        lineIqd: incomeAmt,
        currency,
        amountOriginal: t.amountOriginal,
        amountBaseIqd: t.amountBaseIqd,
        rate,
      });
      incomeRows.push({
        date: t.date.toISOString().slice(0, 10),
        category: t.category,
        partyName: t.partyName ?? '—',
        description: t.description ?? '',
        amount,
        currency,
        amountIqd: incomeAmt,
        source: t.type,
      });
      bumpCategory(incomeCat, t.category, currency, amount, incomeAmt);
      if (currency === 'USD') incomeUsd += amount;
      else incomeIqdNative += incomeAmt;
    }

    if (expenseAmt > 0.5) {
      const amount = displayAmount({
        lineIqd: expenseAmt,
        currency,
        amountOriginal: t.amountOriginal,
        amountBaseIqd: t.amountBaseIqd,
        rate,
      });
      expenseRows.push({
        date: t.date.toISOString().slice(0, 10),
        category: t.category,
        partyName: t.partyName ?? t.employeeUser?.name ?? '—',
        description: t.description ?? '',
        amount,
        currency,
        amountIqd: expenseAmt,
      });
      bumpCategory(expenseCat, t.category, currency, amount, expenseAmt);
      if (currency === 'USD') expenseUsd += amount;
      else expenseIqdNative += expenseAmt;
    }

    const isSalary =
      t.type === 'SALARY' ||
      t.category === 'SALARY' ||
      t.category === 'BONUS' ||
      t.category === 'ALLOWANCE';
    if (isSalary && expenseAmt > 0.5) {
      const amount = displayAmount({
        lineIqd: expenseAmt,
        currency,
        amountOriginal: t.amountOriginal,
        amountBaseIqd: t.amountBaseIqd,
        rate,
      });
      salaryRows.push({
        date: t.date.toISOString().slice(0, 10),
        employeeName: t.employeeUser?.name ?? t.partyName ?? '—',
        category: t.category,
        periodLabel: '',
        amount,
        currency,
        amountIqd: expenseAmt,
        voucherNo: t.voucherNo ?? t.txnNo,
      });
    }
  }

  const salaryVouchers = await prisma.voucher.findMany({
    where: {
      status: 'POSTED',
      accountType: 'EMPLOYEE_SALARY',
      createdAt: { gte: range.from, lte: range.to },
      ...(branchId ? { branchId } : {}),
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
    const shown = voucherDisplay(v);
    salaryRows.push({
      date: v.createdAt.toISOString().slice(0, 10),
      employeeName: v.employeeUser?.name ?? v.partyName,
      category: v.category ?? 'SALARY',
      periodLabel: v.periodLabel ?? '',
      amount: shown.amount,
      currency: shown.currency,
      amountIqd: shown.amountIqd,
      voucherNo: v.voucherNo,
    });
    bumpCategory(expenseCat, v.category ?? 'SALARY', shown.currency, shown.amount, shown.amountIqd);
    if (shown.currency === 'USD') expenseUsd += shown.amount;
    else expenseIqdNative += shown.amountIqd;
  }

  salaryRows.sort((a, b) => a.date.localeCompare(b.date));

  // Prefer category maps built with dual currency; fall back to summary IQD-only
  let incomeByCategory = [...incomeCat.values()].sort((a, b) => b.amountIqd - a.amountIqd);
  let expenseByCategory = [...expenseCat.values()].sort((a, b) => b.amountIqd - a.amountIqd);
  if (!incomeByCategory.length) {
    incomeByCategory = summary.incomeByCategory.map((r) => ({
      category: r.category,
      amountIqd: r.amountIqd,
      amountUsd: 0,
    }));
  }
  if (!expenseByCategory.length) {
    expenseByCategory = summary.expenseByCategory.map((r) => ({
      category: r.category,
      amountIqd: r.amountIqd,
      amountUsd: 0,
    }));
  }

  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    // Native-currency totals (do not convert USD into IQD for display cards)
    incomeIqd: Math.round(incomeIqdNative),
    incomeUsd: Math.round(incomeUsd * 100) / 100,
    expenseIqd: Math.round(expenseIqdNative),
    expenseUsd: Math.round(expenseUsd * 100) / 100,
    profitIqd: Math.round(incomeIqdNative - expenseIqdNative),
    profitUsd: Math.round((incomeUsd - expenseUsd) * 100) / 100,
    incomeByCategory,
    expenseByCategory,
    incomeRows,
    expenseRows,
    salaryRows,
  };
}
