import { prisma } from '@/lib/prisma';
import { getHouseFinancials } from '@/lib/finance/engine';
import { getDashboardAccountingSnapshot } from '@/lib/accounting/reports';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import type {
  AuditEntry,
  CostCenterRow,
  DashboardActivityCounts,
  DashboardMetrics,
  MoneyCurrency,
} from '@/features/dashboard/types';

function voucherStatus(accountType: string, paymentMethod: string): AuditEntry['status'] {
  if (paymentMethod === 'CREDIT') return 'pending';
  if (accountType === 'RECEIVABLE' || accountType === 'PAYABLE') return 'pending';
  return 'paid';
}

function asMoneyCurrency(v: string | null | undefined): MoneyCurrency {
  return v === 'USD' ? 'USD' : 'IQD';
}

const INCOME_TYPES = new Set([
  'INCOME',
  'CUSTOMER_PAYMENT',
  'PROPERTY_SALE',
  'PROPERTY_RENTAL',
  'INSTALLMENT',
  'COMMISSION',
  'OWNER_CAPITAL',
  'CASH_DEPOSIT',
  'BANK_DEPOSIT',
]);

const EXPENSE_TYPES = new Set([
  'EXPENSE',
  'SUPPLIER_PAYMENT',
  'SALARY',
  'EMPLOYEE_COMMISSION',
  'OWNER_WITHDRAWAL',
  'CASH_WITHDRAWAL',
  'BANK_WITHDRAWAL',
  'PROPERTY_PURCHASE',
]);

export async function getDashboardData(): Promise<{
  metrics: DashboardMetrics;
  activity: DashboardActivityCounts;
  costCenters: CostCenterRow[];
  audit: AuditEntry[];
}> {
  const [houseCount, txnCount, voucherCount, contractCount] = await Promise.all([
    prisma.house.count(),
    prisma.ledgerTransaction.count({ where: { deletedAt: null } }),
    prisma.voucher.count(),
    prisma.contract.count(),
  ]);

  if (houseCount === 0 && txnCount === 0 && voucherCount === 0 && contractCount === 0) {
    void seedAccountingChart(prisma).catch(() => undefined);
    return {
      metrics: {
        salesIncomeIqd: 0,
        constructionSpendIqd: 0,
        vendorDebtsIqd: 0,
        buyerDebtsIqd: 0,
        activeProjects: 0,
        todayIncomeIqd: 0,
        todayExpenseIqd: 0,
        monthNetIqd: 0,
        cashIqd: 0,
        bankIqd: 0,
        totalAvailableIqd: 0,
        monthIncomeUsd: 0,
        monthExpenseUsd: 0,
        monthIncomeIqdOriginal: 0,
        monthExpenseIqdOriginal: 0,
      },
      activity: {
        saleContracts: 0,
        rentalLeases: 0,
        receiptsLinked: 0,
        receiptsUnlinked: 0,
      },
      costCenters: [],
      audit: [],
    };
  }

  await seedAccountingChart(prisma).catch(() => undefined);

  const houses = await prisma.house.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, budgetIqd: true, status: true },
    take: 40,
  });

  const costCenters: CostCenterRow[] = await Promise.all(
    houses.map(async (h) => {
      const f = await getHouseFinancials(h.id);
      return {
        houseCode: h.code,
        houseName: h.name,
        budgetIqd: f.budgetIqd,
        spentIqd: f.totalSpentIqd,
      };
    }),
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    snap,
    saleContracts,
    rentalLeases,
    receiptsLinked,
    receiptsUnlinked,
    recentTxns,
    recentVouchers,
    recentContracts,
    recentLeases,
    monthTxns,
  ] = await Promise.all([
    getDashboardAccountingSnapshot(),
    prisma.contract.count({ where: { kind: 'SALE' } }),
    prisma.lease.count({ where: { status: 'ACTIVE' } }),
    prisma.receipt.count({ where: { contractId: { not: null } } }),
    prisma.receipt.count({ where: { contractId: null, leaseId: null } }),
    prisma.ledgerTransaction.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        house: { select: { code: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        house: { select: { code: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.contract.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        contractNo: true,
        kind: true,
        currency: true,
        exchangeRate: true,
        totalAmount: true,
        totalAmountUsd: true,
        buyerName: true,
        sellerName: true,
        dealEmployeeName: true,
        createdAt: true,
        status: true,
        house: { select: { code: true } },
      },
    }),
    prisma.lease.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        leaseNo: true,
        currency: true,
        exchangeRate: true,
        monthlyRentIqd: true,
        tenantName: true,
        landlordName: true,
        dealEmployeeName: true,
        propertyCode: true,
        createdAt: true,
        status: true,
      },
    }),
    prisma.ledgerTransaction.findMany({
      where: {
        deletedAt: null,
        date: { gte: startOfMonth, lte: now },
        type: { not: 'TRANSFER' },
      },
      select: {
        currency: true,
        amountOriginal: true,
        amountBaseIqd: true,
        type: true,
        sourceReceiptId: true,
      },
    }),
  ]);

  // Resolve original receipt currency + deal owner for ledger rows
  const receiptIds = [
    ...new Set(
      recentTxns
        .map((t) => t.sourceReceiptId)
        .filter((id): id is string => !!id),
    ),
  ];
  const monthReceiptIds = [
    ...new Set(
      monthTxns
        .map((t) => t.sourceReceiptId)
        .filter((id): id is string => !!id),
    ),
  ];
  const allReceiptIds = [...new Set([...receiptIds, ...monthReceiptIds])];

  const receipts = allReceiptIds.length
    ? await prisma.receipt.findMany({
        where: { id: { in: allReceiptIds } },
        select: {
          id: true,
          currency: true,
          amount: true,
          partyName: true,
          contract: {
            select: {
              currency: true,
              exchangeRate: true,
              dealEmployeeName: true,
              buyerName: true,
              sellerName: true,
              contractNo: true,
            },
          },
          lease: {
            select: {
              currency: true,
              exchangeRate: true,
              dealEmployeeName: true,
              tenantName: true,
              landlordName: true,
              leaseNo: true,
            },
          },
        },
      })
    : [];
  const receiptById = new Map(receipts.map((r) => [r.id, r]));

  // Month original-currency income/expense (from receipts when linked; else ledger)
  let monthIncomeUsd = 0;
  let monthExpenseUsd = 0;
  let monthIncomeIqdOriginal = 0;
  let monthExpenseIqdOriginal = 0;

  for (const t of monthTxns) {
    const isIncome = INCOME_TYPES.has(t.type);
    const isExpense = EXPENSE_TYPES.has(t.type);
    if (!isIncome && !isExpense) continue;

    const r = t.sourceReceiptId ? receiptById.get(t.sourceReceiptId) : null;
    const cur = asMoneyCurrency(r?.currency ?? t.currency);
    const amt = r ? r.amount : t.amountOriginal;

    if (isIncome) {
      if (cur === 'USD') monthIncomeUsd += amt;
      else monthIncomeIqdOriginal += amt;
    } else {
      if (cur === 'USD') monthExpenseUsd += amt;
      else monthExpenseIqdOriginal += amt;
    }
  }

  const auditFromLedger: AuditEntry[] = recentTxns.map((v) => {
    const r = v.sourceReceiptId ? receiptById.get(v.sourceReceiptId) : null;
    const currency = asMoneyCurrency(r?.currency ?? v.currency);
    const exchangeRate =
      r?.contract?.exchangeRate ||
      r?.lease?.exchangeRate ||
      (v.exchangeRate > 1 ? v.exchangeRate : 150_000);
    const amountOriginal = r ? r.amount : v.amountOriginal;
    const ownerName =
      r?.contract?.dealEmployeeName?.trim() ||
      r?.lease?.dealEmployeeName?.trim() ||
      v.createdBy?.name ||
      '—';
    const partyName =
      r?.contract?.buyerName?.trim() ||
      r?.lease?.tenantName?.trim() ||
      r?.partyName?.trim() ||
      v.partyName?.trim() ||
      '—';

    return {
      id: v.id,
      voucherId: v.txnNo,
      occurredAt: v.date.toISOString(),
      costCenter: v.house?.code ?? v.type,
      category: v.category,
      partyName,
      amountOriginal,
      currency,
      exchangeRate: currency === 'USD' ? exchangeRate : Math.max(1, v.exchangeRate || 1),
      amountIqd: v.amountBaseIqd,
      status: v.paymentMethod === 'CREDIT' ? 'pending' : 'paid',
      ownerName,
      staffName: v.createdBy?.name ?? '—',
      kind: 'money',
    };
  });

  const auditFromVouchers: AuditEntry[] =
    auditFromLedger.length > 0
      ? []
      : recentVouchers.map((v) => ({
          id: v.id,
          voucherId: v.voucherNo,
          occurredAt: v.createdAt.toISOString(),
          costCenter:
            v.house?.code ??
            (v.accountType === 'EMPLOYEE_SALARY'
              ? 'SALARY'
              : v.accountType === 'OFFICE_EXPENSE'
                ? 'OFFICE'
                : '—'),
          category: v.category ?? v.accountType,
          partyName: v.partyName,
          amountOriginal: v.amountIqd,
          currency: 'IQD' as const,
          exchangeRate: v.exchangeRate || 150_000,
          amountIqd: v.amountIqd,
          status:
            v.status === 'REVERSED' ? 'partial' : voucherStatus(v.accountType, v.paymentMethod),
          ownerName: v.createdBy?.name ?? '—',
          staffName: v.createdBy?.name ?? '—',
          kind: 'money' as const,
        }));

  const auditFromContracts: AuditEntry[] = recentContracts.map((c) => {
    const currency = asMoneyCurrency(c.currency);
    const rate = c.exchangeRate > 0 ? c.exchangeRate : 150_000;
    const amountOriginal = currency === 'USD' ? c.totalAmountUsd : c.totalAmount;
    const party =
      [c.buyerName, c.sellerName].filter(Boolean).join(' ← ') || '—';
    return {
      id: `contract-${c.id}`,
      voucherId: c.contractNo,
      occurredAt: c.createdAt.toISOString(),
      costCenter: c.house?.code ?? c.kind,
      category: c.kind === 'SALE' ? 'گرێبەستی فرۆشتن' : `گرێبەست · ${c.kind}`,
      partyName: party,
      amountOriginal,
      currency,
      exchangeRate: rate,
      amountIqd: c.totalAmount,
      status: c.status === 'ACTIVE' || c.status === 'COMPLETED' ? 'paid' : 'pending',
      ownerName: c.dealEmployeeName?.trim() || '—',
      staffName: c.dealEmployeeName?.trim() || '—',
      kind: 'contract',
    };
  });

  const auditFromLeases: AuditEntry[] = recentLeases.map((l) => {
    const currency = asMoneyCurrency(l.currency);
    const rate = l.exchangeRate > 0 ? l.exchangeRate : 150_000;
    // monthlyRentIqd is stored in IQD; if lease currency is USD, convert for display
    const amountOriginal =
      currency === 'USD' && rate > 1 ? l.monthlyRentIqd / rate : l.monthlyRentIqd;
    const party =
      [l.tenantName, l.landlordName].filter(Boolean).join(' ← ') || '—';
    return {
      id: `lease-${l.id}`,
      voucherId: l.leaseNo,
      occurredAt: l.createdAt.toISOString(),
      costCenter: l.propertyCode,
      category: 'گرێبەستی کرێ',
      partyName: party,
      amountOriginal,
      currency,
      exchangeRate: rate,
      amountIqd: l.monthlyRentIqd,
      status: l.status === 'ACTIVE' ? 'paid' : 'pending',
      ownerName: l.dealEmployeeName?.trim() || '—',
      staffName: l.dealEmployeeName?.trim() || '—',
      kind: 'lease',
    };
  });

  const audit = [...auditFromLedger, ...auditFromVouchers, ...auditFromContracts, ...auditFromLeases]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 30);

  return {
    metrics: {
      salesIncomeIqd: snap.monthIncomeIqd,
      constructionSpendIqd: snap.monthExpenseIqd,
      vendorDebtsIqd: snap.payablesIqd,
      buyerDebtsIqd: snap.receivablesIqd,
      activeProjects: houses.filter((h) => h.status === 'IN_CONSTRUCTION').length,
      todayIncomeIqd: snap.todayIncomeIqd,
      todayExpenseIqd: snap.todayExpenseIqd,
      monthNetIqd: snap.monthNetIqd,
      cashIqd: snap.cashIqd,
      bankIqd: 0,
      totalAvailableIqd: snap.cashIqd,
      monthIncomeUsd,
      monthExpenseUsd,
      monthIncomeIqdOriginal,
      monthExpenseIqdOriginal,
    },
    activity: {
      saleContracts,
      rentalLeases,
      receiptsLinked,
      receiptsUnlinked,
    },
    costCenters,
    audit,
  };
}
