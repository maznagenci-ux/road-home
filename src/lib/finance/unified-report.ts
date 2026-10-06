import { prisma } from '@/lib/prisma';

export type UnifiedFinancials = {
  salesIncomeIqd: number;
  salesIncomeUsd: number;
  rentalIncomeIqd: number;
  rentalIncomeUsd: number;
  constructionExpenseIqd: number;
  constructionExpenseUsd: number;
  officeExpenseIqd: number;
  officeExpenseUsd: number;
  salaryExpenseIqd: number;
  salaryExpenseUsd: number;
  totalIncomeIqd: number;
  totalIncomeUsd: number;
  totalExpenseIqd: number;
  totalExpenseUsd: number;
  netIqd: number;
  netUsd: number;
  vendorDebtsIqd: number;
  properties: number;
  activeContracts: number;
  activeLeases: number;
  from: string | null;
  to: string | null;
};

function voucherParts(v: {
  amountIqd: number;
  amountUsd: number;
  exchangeRate: number;
}): { iqd: number; usd: number } {
  const rate = v.exchangeRate > 1 ? v.exchangeRate : 0;
  const looksUsd =
    v.amountUsd > 0.005 &&
    rate > 1 &&
    Math.abs(v.amountIqd - v.amountUsd * rate) <= Math.max(2, rate * 0.02);
  if (looksUsd) {
    return { iqd: v.amountIqd, usd: Math.round(v.amountUsd * 100) / 100 };
  }
  return { iqd: v.amountIqd, usd: 0 };
}

export async function getUnifiedFinancials(opts?: {
  from?: Date | null;
  to?: Date | null;
}): Promise<UnifiedFinancials> {
  const from = opts?.from ?? null;
  const to = opts?.to ?? null;
  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const vouchers = await prisma.voucher.findMany({
    where: { status: 'POSTED', ...dateFilter },
    select: {
      accountType: true,
      paymentMethod: true,
      amountIqd: true,
      amountUsd: true,
      exchangeRate: true,
    },
  });

  let salesIncomeIqd = 0;
  let salesIncomeUsd = 0;
  let rentalIncomeIqd = 0;
  let rentalIncomeUsd = 0;
  let constructionExpenseIqd = 0;
  let constructionExpenseUsd = 0;
  let officeExpenseIqd = 0;
  let officeExpenseUsd = 0;
  let salaryExpenseIqd = 0;
  let salaryExpenseUsd = 0;
  let vendorDebtsIqd = 0;

  for (const v of vouchers) {
    const { iqd, usd } = voucherParts(v);
    switch (v.accountType) {
      case 'BUYER_PAYMENT':
        salesIncomeIqd += iqd;
        salesIncomeUsd += usd;
        break;
      case 'RENTAL_INCOME':
        rentalIncomeIqd += iqd;
        rentalIncomeUsd += usd;
        break;
      case 'EXPENSE':
        constructionExpenseIqd += iqd;
        constructionExpenseUsd += usd;
        if (v.paymentMethod === 'CREDIT') vendorDebtsIqd += iqd;
        break;
      case 'VENDOR_PAYMENT':
        constructionExpenseIqd += iqd;
        constructionExpenseUsd += usd;
        vendorDebtsIqd -= iqd;
        break;
      case 'PAYABLE':
        vendorDebtsIqd += iqd;
        break;
      case 'OFFICE_EXPENSE':
        officeExpenseIqd += iqd;
        officeExpenseUsd += usd;
        break;
      case 'EMPLOYEE_SALARY':
        salaryExpenseIqd += iqd;
        salaryExpenseUsd += usd;
        break;
      default:
        break;
    }
  }

  const [properties, activeContracts, activeLeases] = await Promise.all([
    prisma.property.count(),
    prisma.contract.count({ where: { status: 'ACTIVE' } }),
    prisma.lease.count({ where: { status: 'ACTIVE' } }),
  ]);

  const totalIncomeIqd = salesIncomeIqd + rentalIncomeIqd;
  const totalIncomeUsd = Math.round((salesIncomeUsd + rentalIncomeUsd) * 100) / 100;
  const totalExpenseIqd = constructionExpenseIqd + officeExpenseIqd + salaryExpenseIqd;
  const totalExpenseUsd =
    Math.round((constructionExpenseUsd + officeExpenseUsd + salaryExpenseUsd) * 100) / 100;

  return {
    salesIncomeIqd,
    salesIncomeUsd,
    rentalIncomeIqd,
    rentalIncomeUsd,
    constructionExpenseIqd,
    constructionExpenseUsd,
    officeExpenseIqd,
    officeExpenseUsd,
    salaryExpenseIqd,
    salaryExpenseUsd,
    totalIncomeIqd,
    totalIncomeUsd,
    totalExpenseIqd,
    totalExpenseUsd,
    netIqd: totalIncomeIqd - totalExpenseIqd,
    netUsd: Math.round((totalIncomeUsd - totalExpenseUsd) * 100) / 100,
    vendorDebtsIqd: Math.max(0, vendorDebtsIqd),
    properties,
    activeContracts,
    activeLeases,
    from: from?.toISOString().slice(0, 10) ?? null,
    to: to?.toISOString().slice(0, 10) ?? null,
  };
}
