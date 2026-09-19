import { prisma } from '@/lib/prisma';

export type UnifiedFinancials = {
  salesIncomeIqd: number;
  rentalIncomeIqd: number;
  constructionExpenseIqd: number;
  officeExpenseIqd: number;
  salaryExpenseIqd: number;
  totalIncomeIqd: number;
  totalExpenseIqd: number;
  netIqd: number;
  vendorDebtsIqd: number;
  properties: number;
  activeContracts: number;
  activeLeases: number;
  from: string | null;
  to: string | null;
};

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
    },
  });

  let salesIncomeIqd = 0;
  let rentalIncomeIqd = 0;
  let constructionExpenseIqd = 0;
  let officeExpenseIqd = 0;
  let salaryExpenseIqd = 0;
  let vendorDebtsIqd = 0;

  for (const v of vouchers) {
    const amt = v.amountIqd;
    switch (v.accountType) {
      case 'BUYER_PAYMENT':
        salesIncomeIqd += amt;
        break;
      case 'RENTAL_INCOME':
        rentalIncomeIqd += amt;
        break;
      case 'EXPENSE':
        constructionExpenseIqd += amt;
        if (v.paymentMethod === 'CREDIT') vendorDebtsIqd += amt;
        break;
      case 'VENDOR_PAYMENT':
        constructionExpenseIqd += amt;
        vendorDebtsIqd -= amt;
        break;
      case 'PAYABLE':
        vendorDebtsIqd += amt;
        break;
      case 'OFFICE_EXPENSE':
        officeExpenseIqd += amt;
        break;
      case 'EMPLOYEE_SALARY':
        salaryExpenseIqd += amt;
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
  const totalExpenseIqd = constructionExpenseIqd + officeExpenseIqd + salaryExpenseIqd;

  return {
    salesIncomeIqd,
    rentalIncomeIqd,
    constructionExpenseIqd,
    officeExpenseIqd,
    salaryExpenseIqd,
    totalIncomeIqd,
    totalExpenseIqd,
    netIqd: totalIncomeIqd - totalExpenseIqd,
    vendorDebtsIqd: Math.max(0, vendorDebtsIqd),
    properties,
    activeContracts,
    activeLeases,
    from: from?.toISOString().slice(0, 10) ?? null,
    to: to?.toISOString().slice(0, 10) ?? null,
  };
}
