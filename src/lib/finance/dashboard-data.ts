import { prisma } from '@/lib/prisma';
import { getHouseFinancials } from '@/lib/finance/engine';
import { getDashboardAccountingSnapshot } from '@/lib/accounting/reports';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import type {
  AuditEntry,
  CostCenterRow,
  DashboardActivityCounts,
  DashboardMetrics,
  InstallmentRow,
} from '@/features/dashboard/types';

function voucherStatus(accountType: string, paymentMethod: string): AuditEntry['status'] {
  if (paymentMethod === 'CREDIT') return 'pending';
  if (accountType === 'RECEIVABLE' || accountType === 'PAYABLE') return 'pending';
  return 'paid';
}

export async function getDashboardData(): Promise<{
  metrics: DashboardMetrics;
  activity: DashboardActivityCounts;
  installments: InstallmentRow[];
  costCenters: CostCenterRow[];
  audit: AuditEntry[];
}> {
  await seedAccountingChart(prisma).catch(() => undefined);

  const houses = await prisma.house.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, budgetIqd: true, status: true },
  });

  const costCenters: CostCenterRow[] = [];
  for (const h of houses) {
    const f = await getHouseFinancials(h.id);
    costCenters.push({
      houseCode: h.code,
      houseName: h.name,
      budgetIqd: f.budgetIqd,
      spentIqd: f.totalSpentIqd,
    });
  }

  const [
    snap,
    saleContracts,
    rentalLeases,
    receiptsLinked,
    receiptsUnlinked,
    installmentItems,
    recentTxns,
    recentVouchers,
  ] = await Promise.all([
    getDashboardAccountingSnapshot(),
    prisma.contract.count({ where: { kind: 'SALE' } }),
    prisma.lease.count({ where: { status: 'ACTIVE' } }),
    prisma.receipt.count({ where: { contractId: { not: null } } }),
    prisma.receipt.count({ where: { contractId: null } }),
    prisma.installment.findMany({
      orderBy: { dueDate: 'asc' },
      take: 80,
      include: {
        contract: {
          select: {
            contractNo: true,
            buyerName: true,
            house: { select: { code: true, name: true } },
          },
        },
      },
    }),
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
  ]);

  const installments: InstallmentRow[] = installmentItems.map((i) => ({
    id: i.id,
    amount: i.amount,
    dueDate: i.dueDate.toISOString(),
    paidDate: i.paidDate?.toISOString() ?? null,
    status: i.status,
    contractNo: i.contract.contractNo,
    buyerName: i.contract.buyerName,
    houseCode: i.contract.house?.code ?? null,
    houseName: i.contract.house?.name ?? null,
  }));

  const auditFromLedger: AuditEntry[] = recentTxns.map((v) => ({
    id: v.id,
    voucherId: v.txnNo,
    occurredAt: v.date.toISOString(),
    costCenter: v.house?.code ?? v.type,
    category: v.category,
    partyName: v.partyName ?? '—',
    amountIqd: v.amountBaseIqd,
    status: v.paymentMethod === 'CREDIT' ? 'pending' : 'paid',
    staffName: v.createdBy?.name ?? '—',
  }));

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
          amountIqd: v.amountIqd,
          status:
            v.status === 'REVERSED' ? 'partial' : voucherStatus(v.accountType, v.paymentMethod),
          staffName: v.createdBy?.name ?? '—',
        }));

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
    },
    activity: {
      saleContracts,
      rentalLeases,
      receiptsLinked,
      receiptsUnlinked,
    },
    installments,
    costCenters,
    audit: [...auditFromLedger, ...auditFromVouchers].slice(0, 25),
  };
}
