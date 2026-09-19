import { prisma } from '@/lib/prisma';

export async function getCustomerStatement(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error('NOT_FOUND');
  const txns = await prisma.ledgerTransaction.findMany({
    where: { deletedAt: null, customerId },
    orderBy: { date: 'asc' },
    include: { lines: { include: { ledgerAccount: true } } },
  });
  let balance = 0;
  const rows = txns.map((t) => {
    const ar = t.lines.filter((l) => l.ledgerAccount.code === '1200');
    const delta = ar.reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);
    balance += delta;
    return {
      id: t.id,
      txnNo: t.txnNo,
      date: t.date.toISOString(),
      type: t.type,
      category: t.category,
      description: t.description,
      amountBaseIqd: t.amountBaseIqd,
      arDeltaIqd: delta,
      balanceIqd: balance,
    };
  });
  return { customer, balanceIqd: balance, rows };
}

export async function getSupplierStatement(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new Error('NOT_FOUND');
  const txns = await prisma.ledgerTransaction.findMany({
    where: { deletedAt: null, supplierId },
    orderBy: { date: 'asc' },
    include: { lines: { include: { ledgerAccount: true } } },
  });
  let balance = 0;
  const rows = txns.map((t) => {
    const ap = t.lines.filter((l) => l.ledgerAccount.code === '2000');
    const delta = ap.reduce((s, l) => s + l.creditIqd - l.debitIqd, 0);
    balance += delta;
    return {
      id: t.id,
      txnNo: t.txnNo,
      date: t.date.toISOString(),
      type: t.type,
      category: t.category,
      description: t.description,
      amountBaseIqd: t.amountBaseIqd,
      apDeltaIqd: delta,
      balanceIqd: balance,
    };
  });
  return { supplier, balanceIqd: balance, rows };
}

export async function getPropertyFinancialProfile(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { houses: true, owner: true },
  });
  if (!property) throw new Error('NOT_FOUND');

  const txns = await prisma.ledgerTransaction.findMany({
    where: {
      deletedAt: null,
      OR: [{ propertyId }, { houseId: { in: property.houses.map((h) => h.id) } }],
    },
    include: { lines: { include: { ledgerAccount: true } } },
  });

  let costIqd = 0;
  let revenueIqd = 0;
  let receivedIqd = 0;
  for (const t of txns) {
    for (const l of t.lines) {
      if (l.ledgerAccount.class === 'EXPENSE' || l.ledgerAccount.code === '1300') {
        costIqd += l.debitIqd - l.creditIqd;
      }
      if (l.ledgerAccount.class === 'INCOME') {
        revenueIqd += l.creditIqd - l.debitIqd;
      }
      if (l.ledgerAccount.code === '1000' || l.ledgerAccount.code === '1100') {
        if (l.debitIqd > 0) receivedIqd += l.debitIqd;
      }
    }
  }

  return {
    property,
    costIqd,
    revenueIqd,
    profitIqd: revenueIqd - costIqd,
    receivedIqd,
    remainingIqd: Math.max(0, revenueIqd - receivedIqd),
    txns: txns.map((t) => ({
      id: t.id,
      txnNo: t.txnNo,
      date: t.date.toISOString(),
      type: t.type,
      category: t.category,
      amountBaseIqd: t.amountBaseIqd,
      partyName: t.partyName,
    })),
  };
}

export async function getOwnerCapitalMovements() {
  const txns = await prisma.ledgerTransaction.findMany({
    where: {
      deletedAt: null,
      type: { in: ['OWNER_CAPITAL', 'OWNER_WITHDRAWAL'] },
    },
    orderBy: { date: 'desc' },
    take: 200,
  });
  let capitalIn = 0;
  let capitalOut = 0;
  for (const t of txns) {
    if (t.type === 'OWNER_CAPITAL') capitalIn += t.amountBaseIqd;
    else capitalOut += t.amountBaseIqd;
  }
  return { capitalIn, capitalOut, net: capitalIn - capitalOut, txns };
}

export async function getOverdueInstallments() {
  const today = new Date();
  const items = await prisma.installment.findMany({
    where: {
      status: { in: ['PENDING', 'OVERDUE'] },
      dueDate: { lt: today },
    },
    include: {
      contract: {
        select: {
          id: true,
          contractNo: true,
          buyerName: true,
          buyerPhone: true,
          house: { select: { code: true, name: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 200,
  });

  // Mark overdue in DB (best-effort)
  const ids = items.filter((i) => i.status === 'PENDING').map((i) => i.id);
  if (ids.length) {
    await prisma.installment.updateMany({
      where: { id: { in: ids } },
      data: { status: 'OVERDUE' },
    });
  }

  return items.map((i) => ({
    id: i.id,
    amount: i.amount,
    dueDate: i.dueDate.toISOString(),
    status: i.status === 'PENDING' ? 'OVERDUE' : i.status,
    contractNo: i.contract.contractNo,
    buyerName: i.contract.buyerName,
    buyerPhone: i.contract.buyerPhone,
    houseCode: i.contract.house?.code ?? null,
  }));
}

/** Auto-calc agent commission from sale amount × active rule rate */
export async function calcSaleCommission(saleAmountIqd: number) {
  const rule = await prisma.agentCommissionRule.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  const ratePct = rule?.ratePct ?? 2;
  return {
    ratePct,
    commissionIqd: (saleAmountIqd * ratePct) / 100,
    ruleId: rule?.id ?? null,
  };
}
