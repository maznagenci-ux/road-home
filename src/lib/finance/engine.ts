import { prisma } from '@/lib/prisma';
import type {
  ExpenseCategory,
  PaymentMethod,
  VoucherAccountType,
} from '@prisma/client';

export type HouseFinancials = {
  totalSpentIqd: number;
  cashPaidIqd: number;
  vendorDebtIqd: number;
  buyerDebtIqd: number;
  budgetIqd: number;
};

function isPosted(status: string) {
  return status === 'POSTED';
}

export async function getHouseFinancials(houseId: string): Promise<HouseFinancials> {
  const house = await prisma.house.findUniqueOrThrow({
    where: { id: houseId },
    select: { budgetIqd: true },
  });

  const vouchers = await prisma.voucher.findMany({
    where: { houseId, status: 'POSTED' },
  });

  let totalSpentIqd = 0;
  let cashPaidIqd = 0;
  let vendorDebtIqd = 0;
  let buyerDebtIqd = 0;

  for (const v of vouchers) {
    if (!isPosted(v.status)) continue;
    const amt = v.amountIqd;

    switch (v.accountType) {
      case 'EXPENSE':
        totalSpentIqd += amt;
        if (v.paymentMethod === 'CASH_VAULT') cashPaidIqd += amt;
        else vendorDebtIqd += amt;
        break;
      case 'VENDOR_PAYMENT':
        cashPaidIqd += amt;
        vendorDebtIqd -= amt;
        break;
      case 'PAYABLE':
        vendorDebtIqd += amt;
        break;
      case 'RECEIVABLE':
        buyerDebtIqd += amt;
        break;
      case 'BUYER_PAYMENT':
        buyerDebtIqd -= amt;
        break;
      case 'RENTAL_INCOME':
        // Rental income is tracked separately — never mixes into construction spend.
        break;
      case 'OFFICE_EXPENSE':
      case 'EMPLOYEE_SALARY':
        // Office overhead / payroll — never mixes into construction spend.
        break;
      default:
        break;
    }
  }

  return {
    totalSpentIqd,
    cashPaidIqd,
    vendorDebtIqd: Math.max(0, vendorDebtIqd),
    buyerDebtIqd: Math.max(0, buyerDebtIqd),
    budgetIqd: house.budgetIqd,
  };
}

export async function nextVoucherNo() {
  const latest = await prisma.voucher.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { voucherNo: true },
  });
  const year = new Date().getFullYear();
  let next = 1;
  if (latest?.voucherNo) {
    const m = latest.voucherNo.match(/(\d+)$/);
    if (m) next = Number(m[1]) + 1;
  } else {
    next = (await prisma.voucher.count()) + 1;
  }
  // Avoid collisions if count lags behind deleted/reused sequences
  for (let i = 0; i < 20; i++) {
    const candidate = `VH-${year}${String(next + i).padStart(5, '0')}`;
    const exists = await prisma.voucher.findUnique({
      where: { voucherNo: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `VH-${year}${Date.now().toString().slice(-8)}`;
}

export type CreateVoucherInput = {
  houseId?: string | null;
  accountType: VoucherAccountType;
  category?: ExpenseCategory | null;
  amountIqd: number;
  exchangeRate: number;
  paymentMethod: PaymentMethod;
  partyName: string;
  periodLabel?: string | null;
  deductionIqd?: number | null;
  employeeUserId?: string | null;
  supplierId?: string | null;
  customerId?: string | null;
  note?: string | null;
  attachmentUrl?: string | null;
  dueDate?: Date | null;
  createdById?: string | null;
};

const OFFICE_TYPES: VoucherAccountType[] = ['OFFICE_EXPENSE', 'EMPLOYEE_SALARY'];

export async function createVoucher(input: CreateVoucherInput) {
  const isOffice = OFFICE_TYPES.includes(input.accountType);
  if (!isOffice && !input.houseId) throw new Error('HOUSE_CODE_REQUIRED');
  if (input.amountIqd <= 0) throw new Error('INVALID_AMOUNT');
  if (input.exchangeRate <= 0) throw new Error('INVALID_FX');

  if (
    input.paymentMethod === 'CREDIT' &&
    !input.dueDate &&
    (input.accountType === 'EXPENSE' || input.accountType === 'OFFICE_EXPENSE')
  ) {
    throw new Error('DUE_DATE_REQUIRED');
  }

  const lockedAt = new Date();
  const amountUsd = input.amountIqd / input.exchangeRate;
  const voucherNo = await nextVoucherNo();
  const deductionIqd = Math.max(0, input.deductionIqd ?? 0);

  const voucher = await prisma.voucher.create({
    data: {
      voucherNo,
      houseId: input.houseId ?? null,
      accountType: input.accountType,
      category: input.category ?? null,
      amountIqd: input.amountIqd,
      amountUsd,
      exchangeRate: input.exchangeRate,
      exchangeLockedAt: lockedAt,
      paymentMethod: input.paymentMethod,
      partyName: input.partyName.trim(),
      periodLabel: input.periodLabel?.trim() || null,
      deductionIqd,
      employeeUserId: input.employeeUserId ?? null,
      supplierId: input.supplierId ?? null,
      customerId: input.customerId ?? null,
      note: input.note ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      dueDate: input.dueDate ?? null,
      createdById: input.createdById ?? null,
      status: 'POSTED',
    },
    include: { house: true, createdBy: true },
  });

  try {
    const { dualWriteVoucher } = await import('@/lib/accounting/bridge');
    await dualWriteVoucher(voucher.id, input.createdById);
  } catch {
    // Ledger bridge must not block voucher posting
  }

  return voucher;
}

export async function reverseVoucher(voucherId: string, createdById?: string) {
  const original = await prisma.voucher.findUnique({ where: { id: voucherId } });
  if (!original) throw new Error('NOT_FOUND');
  if (original.status === 'REVERSED') throw new Error('ALREADY_REVERSED');
  if (original.reversesId) throw new Error('CANNOT_REVERSE_REVERSAL');

  const reversalNo = await nextVoucherNo();
  const lockedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const reversal = await tx.voucher.create({
      data: {
        voucherNo: reversalNo,
        houseId: original.houseId,
        accountType: original.accountType,
        category: original.category,
        amountIqd: -Math.abs(original.amountIqd),
        amountUsd: -Math.abs(original.amountUsd),
        exchangeRate: original.exchangeRate,
        exchangeLockedAt: lockedAt,
        paymentMethod: original.paymentMethod,
        partyName: original.partyName,
        periodLabel: original.periodLabel,
        supplierId: original.supplierId,
        customerId: original.customerId,
        note: `REVERSAL of ${original.voucherNo}`,
        attachmentUrl: null,
        dueDate: null,
        reversesId: original.id,
        createdById: createdById ?? null,
        status: 'POSTED',
      },
    });

    await tx.voucher.update({
      where: { id: original.id },
      data: { status: 'REVERSED' },
    });

    return reversal;
  });
}

export async function getVendorDebts(houseId: string) {
  const credits = await prisma.voucher.findMany({
    where: {
      houseId,
      status: 'POSTED',
      accountType: { in: ['EXPENSE', 'PAYABLE'] },
      paymentMethod: 'CREDIT',
    },
    orderBy: { dueDate: 'asc' },
  });

  const payments = await prisma.voucher.findMany({
    where: {
      houseId,
      status: 'POSTED',
      accountType: 'VENDOR_PAYMENT',
    },
  });

  const paidByParty = new Map<string, number>();
  for (const p of payments) {
    paidByParty.set(p.partyName, (paidByParty.get(p.partyName) ?? 0) + p.amountIqd);
  }

  const remainingByParty = new Map(paidByParty);

  return credits
    .map((c) => {
      const available = remainingByParty.get(c.partyName) ?? 0;
      const applied = Math.min(available, c.amountIqd);
      remainingByParty.set(c.partyName, available - applied);
      const outstanding = c.amountIqd - applied;
      const due = c.dueDate ? new Date(c.dueDate) : null;
      const now = new Date();
      let alert: 'ok' | 'soon' | 'overdue' = 'ok';
      if (outstanding > 0 && due) {
        const days = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (days < 0) alert = 'overdue';
        else if (days <= 7) alert = 'soon';
      }
      return { ...c, outstanding, alert };
    })
    .filter((r) => r.outstanding > 0.01);
}
