import type { LedgerTxnType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CashBankReport,
  CategoryAmount,
  DateRange,
  IncomeExpenseSummary,
  MonthlyOwnerBundle,
  PartyBalance,
  ProfitAndLoss,
  PropertyPerfRow,
} from './types';

const activeTxn: Prisma.LedgerTransactionWhereInput = { deletedAt: null };

/** null / undefined = combined (all branches). */
export type BranchFilter = string | null | undefined;

function withBranch(
  base: Prisma.LedgerTransactionWhereInput,
  branchId?: BranchFilter,
): Prisma.LedgerTransactionWhereInput {
  if (!branchId) return base;
  return { ...base, branchId };
}

function monthRange(year: number, month: number): DateRange {
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

function prevMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

async function sumByAccountClass(
  range: DateRange,
  cls: 'INCOME' | 'EXPENSE',
  branchId?: BranchFilter,
) {
  const lines = await prisma.transactionLine.findMany({
    where: {
      ledgerAccount: { class: cls },
      transaction: withBranch(
        {
          ...activeTxn,
          date: { gte: range.from, lte: range.to },
          type: { not: 'TRANSFER' },
        },
        branchId,
      ),
    },
    include: {
      ledgerAccount: { select: { code: true, name: true } },
      transaction: { select: { category: true, type: true } },
    },
  });

  // Income: credit increases; Expense: debit increases
  const byCat = new Map<string, number>();
  let total = 0;
  for (const l of lines) {
    const type = l.transaction.type as LedgerTxnType;
    if (type === 'OWNER_CAPITAL' || type === 'OWNER_WITHDRAWAL') continue;
    if (type === 'CASH_DEPOSIT' || type === 'CASH_WITHDRAWAL') continue;
    if (type === 'BANK_DEPOSIT' || type === 'BANK_WITHDRAWAL') continue;
    if (type === 'INVESTMENT' || type === 'ADJUSTMENT') continue;

    const amt = cls === 'INCOME' ? l.creditIqd - l.debitIqd : l.debitIqd - l.creditIqd;
    if (Math.abs(amt) < 0.001) continue;
    total += amt;
    const cat = l.transaction.category || l.ledgerAccount.name;
    byCat.set(cat, (byCat.get(cat) ?? 0) + amt);
  }

  const byCategory: CategoryAmount[] = [...byCat.entries()]
    .map(([category, amountIqd]) => ({ category, amountIqd }))
    .sort((a, b) => b.amountIqd - a.amountIqd);

  return { total, byCategory };
}

export async function getIncomeExpenseSummary(
  range: DateRange,
  branchId?: BranchFilter,
): Promise<IncomeExpenseSummary> {
  const [inc, exp] = await Promise.all([
    sumByAccountClass(range, 'INCOME', branchId),
    sumByAccountClass(range, 'EXPENSE', branchId),
  ]);
  return {
    incomeIqd: inc.total,
    expenseIqd: exp.total,
    netIqd: inc.total - exp.total,
    incomeByCategory: inc.byCategory,
    expenseByCategory: exp.byCategory,
  };
}

export async function getProfitAndLoss(
  range: DateRange,
  branchId?: BranchFilter,
): Promise<ProfitAndLoss> {
  const s = await getIncomeExpenseSummary(range, branchId);
  return {
    incomeIqd: s.incomeIqd,
    expenseIqd: s.expenseIqd,
    netProfitIqd: s.netIqd,
    incomeByCategory: s.incomeByCategory,
    expenseByCategory: s.expenseByCategory,
  };
}

async function buildMoneyReport(
  kind: 'cash' | 'bank',
  accountId: string,
  range: DateRange,
  branchId?: BranchFilter,
): Promise<CashBankReport> {
  if (kind === 'cash') {
    const acc = await prisma.cashAccount.findUniqueOrThrow({ where: { id: accountId } });
    const ledger = await prisma.ledgerAccount.findFirst({ where: { cashAccountId: accountId } });
    const { opening } = await moneyBalanceAsOf(kind, accountId, range.from, branchId);
    const lines = ledger
      ? await prisma.transactionLine.findMany({
          where: {
            ledgerAccountId: ledger.id,
            transaction: withBranch(
              {
                ...activeTxn,
                date: { gte: range.from, lte: range.to },
              },
              branchId,
            ),
          },
          include: {
            transaction: {
              select: {
                id: true,
                txnNo: true,
                date: true,
                type: true,
                category: true,
                description: true,
                partyName: true,
              },
            },
          },
          orderBy: { transaction: { date: 'asc' } },
        })
      : [];

    let running = opening;
    const movements = lines.map((l) => {
      running += l.debitIqd - l.creditIqd;
      return {
        id: l.transaction.id,
        txnNo: l.transaction.txnNo,
        date: l.transaction.date.toISOString(),
        type: l.transaction.type,
        category: l.transaction.category,
        description: l.transaction.description,
        partyName: l.transaction.partyName,
        debitIqd: l.debitIqd,
        creditIqd: l.creditIqd,
        balanceAfterIqd: running,
      };
    });

    return {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      openingBalanceIqd: opening,
      closingBalanceIqd: running,
      movements,
    };
  }

  const acc = await prisma.bankAccount.findUniqueOrThrow({ where: { id: accountId } });
  const ledger = await prisma.ledgerAccount.findFirst({ where: { bankAccountId: accountId } });
  const { opening } = await moneyBalanceAsOf(kind, accountId, range.from, branchId);
  const lines = ledger
    ? await prisma.transactionLine.findMany({
        where: {
          ledgerAccountId: ledger.id,
          transaction: withBranch(
            {
              ...activeTxn,
              date: { gte: range.from, lte: range.to },
            },
            branchId,
          ),
        },
        include: {
          transaction: {
            select: {
              id: true,
              txnNo: true,
              date: true,
              type: true,
              category: true,
              description: true,
              partyName: true,
            },
          },
        },
        orderBy: { transaction: { date: 'asc' } },
      })
    : [];

  let running = opening;
  const movements = lines.map((l) => {
    running += l.debitIqd - l.creditIqd;
    return {
      id: l.transaction.id,
      txnNo: l.transaction.txnNo,
      date: l.transaction.date.toISOString(),
      type: l.transaction.type,
      category: l.transaction.category,
      description: l.transaction.description,
      partyName: l.transaction.partyName,
      debitIqd: l.debitIqd,
      creditIqd: l.creditIqd,
      balanceAfterIqd: running,
    };
  });

  return {
    accountId: acc.id,
    code: acc.code,
    name: acc.name,
    openingBalanceIqd: opening,
    closingBalanceIqd: running,
    movements,
  };
}

/** Balance just before `asOf` (exclusive of that instant's day start if needed — uses < asOf) */
async function moneyBalanceAsOf(
  kind: 'cash' | 'bank',
  accountId: string,
  asOf: Date,
  branchId?: BranchFilter,
) {
  // Per-branch books: ignore shared openingBalance (company-wide); only branch movements count.
  const useOpening = !branchId;
  if (kind === 'cash') {
    const acc = await prisma.cashAccount.findUniqueOrThrow({ where: { id: accountId } });
    const ledger = await prisma.ledgerAccount.findFirst({ where: { cashAccountId: accountId } });
    const baseOpen = useOpening ? acc.openingBalance : 0;
    if (!ledger) return { opening: baseOpen };
    const lines = await prisma.transactionLine.findMany({
      where: {
        ledgerAccountId: ledger.id,
        transaction: withBranch({ ...activeTxn, date: { lt: asOf } }, branchId),
      },
      select: { debitIqd: true, creditIqd: true },
    });
    const net = lines.reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);
    return { opening: baseOpen + net };
  }
  const acc = await prisma.bankAccount.findUniqueOrThrow({ where: { id: accountId } });
  const ledger = await prisma.ledgerAccount.findFirst({ where: { bankAccountId: accountId } });
  const baseOpen = useOpening ? acc.openingBalance : 0;
  if (!ledger) return { opening: baseOpen };
  const lines = await prisma.transactionLine.findMany({
    where: {
      ledgerAccountId: ledger.id,
      transaction: withBranch({ ...activeTxn, date: { lt: asOf } }, branchId),
    },
    select: { debitIqd: true, creditIqd: true },
  });
  const net = lines.reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);
  return { opening: baseOpen + net };
}

export async function getCashReport(
  range: DateRange,
  accountId?: string,
  branchId?: BranchFilter,
): Promise<CashBankReport[]> {
  const accounts = accountId
    ? await prisma.cashAccount.findMany({ where: { id: accountId, isActive: true } })
    : await prisma.cashAccount.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  return Promise.all(accounts.map((a) => buildMoneyReport('cash', a.id, range, branchId)));
}

export async function getBankReport(
  range: DateRange,
  accountId?: string,
  branchId?: BranchFilter,
): Promise<CashBankReport[]> {
  const accounts = accountId
    ? await prisma.bankAccount.findMany({ where: { id: accountId, isActive: true } })
    : await prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  return Promise.all(accounts.map((a) => buildMoneyReport('bank', a.id, range, branchId)));
}

export async function getTotalAvailableMoney(asOf = new Date(), branchId?: BranchFilter) {
  const [cashAccounts, bankAccounts] = await Promise.all([
    prisma.cashAccount.findMany({ where: { isActive: true } }),
    prisma.bankAccount.findMany({ where: { isActive: true } }),
  ]);

  let cashIqd = 0;
  let bankIqd = 0;
  for (const c of cashAccounts) {
    const bal = await liveBalance('cash', c.id, branchId);
    cashIqd += bal;
  }
  for (const b of bankAccounts) {
    const bal = await liveBalance('bank', b.id, branchId);
    bankIqd += bal;
  }
  return { cashIqd, bankIqd, totalIqd: cashIqd + bankIqd, asOf: asOf.toISOString() };
}

async function liveBalance(kind: 'cash' | 'bank', id: string, branchId?: BranchFilter) {
  const useOpening = !branchId;
  if (kind === 'cash') {
    const acc = await prisma.cashAccount.findUniqueOrThrow({ where: { id } });
    const ledger = await prisma.ledgerAccount.findFirst({ where: { cashAccountId: id } });
    const baseOpen = useOpening ? acc.openingBalance : 0;
    if (!ledger) return baseOpen;
    const lines = await prisma.transactionLine.findMany({
      where: {
        ledgerAccountId: ledger.id,
        transaction: withBranch(activeTxn, branchId),
      },
      select: { debitIqd: true, creditIqd: true },
    });
    return baseOpen + lines.reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);
  }
  const acc = await prisma.bankAccount.findUniqueOrThrow({ where: { id } });
  const ledger = await prisma.ledgerAccount.findFirst({ where: { bankAccountId: id } });
  const baseOpen = useOpening ? acc.openingBalance : 0;
  if (!ledger) return baseOpen;
  const lines = await prisma.transactionLine.findMany({
    where: {
      ledgerAccountId: ledger.id,
      transaction: withBranch(activeTxn, branchId),
    },
    select: { debitIqd: true, creditIqd: true },
  });
  return baseOpen + lines.reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);
}

export async function getReceivables(
  _asOf = new Date(),
  branchId?: BranchFilter,
): Promise<PartyBalance[]> {
  const ar = await prisma.ledgerAccount.findUnique({ where: { code: '1200' } });
  if (!ar) return [];
  const lines = await prisma.transactionLine.findMany({
    where: { ledgerAccountId: ar.id, transaction: withBranch(activeTxn, branchId) },
    include: {
      transaction: {
        select: { customerId: true, partyName: true, customer: { select: { id: true, name: true } } },
      },
    },
  });
  const map = new Map<string, PartyBalance>();
  for (const l of lines) {
    const key =
      l.transaction.customerId ??
      l.transaction.partyName ??
      'unknown';
    const name =
      l.transaction.customer?.name ?? l.transaction.partyName ?? 'Unknown customer';
    const prev = map.get(key) ?? { id: l.transaction.customerId, name, balanceIqd: 0 };
    prev.balanceIqd += l.debitIqd - l.creditIqd;
    map.set(key, prev);
  }
  return [...map.values()].filter((p) => p.balanceIqd > 0.5).sort((a, b) => b.balanceIqd - a.balanceIqd);
}

export async function getPayables(
  _asOf = new Date(),
  branchId?: BranchFilter,
): Promise<PartyBalance[]> {
  const ap = await prisma.ledgerAccount.findUnique({ where: { code: '2000' } });
  if (!ap) return [];
  const lines = await prisma.transactionLine.findMany({
    where: { ledgerAccountId: ap.id, transaction: withBranch(activeTxn, branchId) },
    include: {
      transaction: {
        select: { supplierId: true, partyName: true, supplier: { select: { id: true, name: true } } },
      },
    },
  });
  const map = new Map<string, PartyBalance>();
  for (const l of lines) {
    const key = l.transaction.supplierId ?? l.transaction.partyName ?? 'unknown';
    const name =
      l.transaction.supplier?.name ?? l.transaction.partyName ?? 'Unknown supplier';
    const prev = map.get(key) ?? { id: l.transaction.supplierId, name, balanceIqd: 0 };
    // AP credit balance
    prev.balanceIqd += l.creditIqd - l.debitIqd;
    map.set(key, prev);
  }
  return [...map.values()].filter((p) => p.balanceIqd > 0.5).sort((a, b) => b.balanceIqd - a.balanceIqd);
}

export async function getPropertyPerformance(
  range: DateRange,
  branchId?: BranchFilter,
): Promise<PropertyPerfRow[]> {
  const txns = await prisma.ledgerTransaction.findMany({
    where: withBranch(
      {
        ...activeTxn,
        date: { gte: range.from, lte: range.to },
        OR: [{ propertyId: { not: null } }, { houseId: { not: null } }],
      },
      branchId,
    ),
    include: {
      property: { select: { name: true } },
      house: { select: { code: true, name: true } },
      lines: { include: { ledgerAccount: { select: { class: true } } } },
    },
  });

  const map = new Map<string, PropertyPerfRow>();
  for (const t of txns) {
    const key = t.propertyId ?? t.houseId ?? 'x';
    const label =
      t.property?.name ??
      (t.house ? `${t.house.code} — ${t.house.name}` : 'Unlinked');
    const row = map.get(key) ?? {
      propertyId: t.propertyId,
      houseId: t.houseId,
      label,
      incomeIqd: 0,
      expenseIqd: 0,
      profitIqd: 0,
    };
    for (const l of t.lines) {
      if (l.ledgerAccount.class === 'INCOME') row.incomeIqd += l.creditIqd - l.debitIqd;
      if (l.ledgerAccount.class === 'EXPENSE') row.expenseIqd += l.debitIqd - l.creditIqd;
    }
    row.profitIqd = row.incomeIqd - row.expenseIqd;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.profitIqd - a.profitIqd);
}

export async function getMonthlyOwnerBundle(
  month: number,
  year: number,
  branchId?: BranchFilter,
): Promise<MonthlyOwnerBundle> {
  const range = monthRange(year, month);
  const pm = prevMonth(year, month);
  const prevRange = monthRange(pm.year, pm.month);
  const ytdRange: DateRange = {
    from: new Date(year, 0, 1),
    to: range.to,
  };

  const [
    summary,
    prevSummary,
    ytdSummary,
    cashReports,
    bankReports,
    money,
    receivables,
    payables,
    propertyPerformance,
    transactions,
  ] = await Promise.all([
    getIncomeExpenseSummary(range, branchId),
    getIncomeExpenseSummary(prevRange, branchId),
    getIncomeExpenseSummary(ytdRange, branchId),
    getCashReport(range, undefined, branchId),
    getBankReport(range, undefined, branchId),
    getTotalAvailableMoney(range.to, branchId),
    getReceivables(range.to, branchId),
    getPayables(range.to, branchId),
    getPropertyPerformance(range, branchId),
    prisma.ledgerTransaction.findMany({
      where: withBranch(
        { ...activeTxn, date: { gte: range.from, lte: range.to } },
        branchId,
      ),
      orderBy: { date: 'asc' },
      select: {
        id: true,
        txnNo: true,
        date: true,
        type: true,
        category: true,
        amountBaseIqd: true,
        currency: true,
        amountOriginal: true,
        partyName: true,
        description: true,
        paymentMethod: true,
        receiptNo: true,
        voucherNo: true,
      },
    }),
  ]);

  const pl = await getProfitAndLoss(range, branchId);

  return {
    year,
    month,
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    executive: {
      incomeIqd: summary.incomeIqd,
      expenseIqd: summary.expenseIqd,
      netIqd: summary.netIqd,
      cashIqd: money.cashIqd,
      bankIqd: money.bankIqd,
      totalAvailableIqd: money.totalIqd,
      receivablesIqd: receivables.reduce((s, r) => s + r.balanceIqd, 0),
      payablesIqd: payables.reduce((s, r) => s + r.balanceIqd, 0),
    },
    incomeByCategory: summary.incomeByCategory,
    expenseByCategory: summary.expenseByCategory,
    cashReports,
    bankReports,
    pl,
    receivables,
    payables,
    propertyPerformance,
    comparison: {
      prevMonth: {
        incomeIqd: prevSummary.incomeIqd,
        expenseIqd: prevSummary.expenseIqd,
        netIqd: prevSummary.netIqd,
      },
      ytd: {
        incomeIqd: ytdSummary.incomeIqd,
        expenseIqd: ytdSummary.expenseIqd,
        netIqd: ytdSummary.netIqd,
      },
    },
    transactions: transactions.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    })),
  };
}

export async function getDashboardAccountingSnapshot(branchId?: BranchFilter) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = now;

  const [today, month, money, receivables, payables] = await Promise.all([
    getIncomeExpenseSummary({ from: startOfDay, to: end }, branchId),
    getIncomeExpenseSummary({ from: startOfMonth, to: end }, branchId),
    getTotalAvailableMoney(end, branchId),
    getReceivables(end, branchId),
    getPayables(end, branchId),
  ]);

  return {
    todayIncomeIqd: today.incomeIqd,
    todayExpenseIqd: today.expenseIqd,
    monthIncomeIqd: month.incomeIqd,
    monthExpenseIqd: month.expenseIqd,
    monthNetIqd: month.netIqd,
    cashIqd: money.cashIqd,
    bankIqd: money.bankIqd,
    totalAvailableIqd: money.totalIqd,
    receivablesIqd: receivables.reduce((s, r) => s + r.balanceIqd, 0),
    payablesIqd: payables.reduce((s, r) => s + r.balanceIqd, 0),
  };
}
