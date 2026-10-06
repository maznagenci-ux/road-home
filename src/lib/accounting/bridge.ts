import type { LedgerPayMethod, LedgerTxnType, PaymentMethod, VoucherAccountType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { postTransaction, softDeleteTransaction } from './post';
import { seedAccountingChart } from './seed-chart';

const DEFAULT_FX = 150_000;

function mapVoucherType(accountType: VoucherAccountType): LedgerTxnType {
  switch (accountType) {
    case 'EXPENSE':
    case 'OFFICE_EXPENSE':
      return 'EXPENSE';
    case 'EMPLOYEE_SALARY':
      return 'SALARY';
    case 'VENDOR_PAYMENT':
      return 'SUPPLIER_PAYMENT';
    case 'BUYER_PAYMENT':
      return 'PROPERTY_SALE';
    case 'RECEIVABLE':
      return 'CUSTOMER_DEBT';
    case 'PAYABLE':
      return 'SUPPLIER_DEBT';
    case 'RENTAL_INCOME':
      return 'PROPERTY_RENTAL';
    default:
      return 'EXPENSE';
  }
}

function mapPayMethod(m: PaymentMethod): LedgerPayMethod {
  return m === 'CREDIT' ? 'CREDIT' : 'CASH';
}

function categoryFromVoucher(
  accountType: VoucherAccountType,
  category: string | null,
): string {
  if (category) return category;
  if (accountType === 'RENTAL_INCOME') return 'RENTAL';
  if (accountType === 'EMPLOYEE_SALARY') return 'SALARY';
  if (accountType === 'OFFICE_EXPENSE') return 'OTHER_OFFICE';
  if (accountType === 'BUYER_PAYMENT') return 'SALE';
  return 'OTHER';
}

async function resolveReceiptFx(receipt: {
  currency: string;
  contractId: string | null;
  leaseId: string | null;
}): Promise<number> {
  if (receipt.currency !== 'USD') return 1;
  if (receipt.contractId) {
    const c = await prisma.contract.findUnique({
      where: { id: receipt.contractId },
      select: { exchangeRate: true },
    });
    if (c?.exchangeRate && c.exchangeRate > 0) return c.exchangeRate;
  }
  if (receipt.leaseId) {
    const l = await prisma.lease.findUnique({
      where: { id: receipt.leaseId },
      select: { exchangeRate: true },
    });
    if (l?.exchangeRate && l.exchangeRate > 0) return l.exchangeRate;
  }
  return DEFAULT_FX;
}

/** Dual-write a newly created voucher into the ledger (idempotent via sourceVoucherId). */
export async function dualWriteVoucher(voucherId: string, createdById?: string | null) {
  await seedAccountingChart(prisma);
  const v = await prisma.voucher.findUnique({ where: { id: voucherId } });
  if (!v || v.status !== 'POSTED') return null;
  // Reversal vouchers: original ledger row is soft-deleted separately
  if (v.reversesId || v.amountIqd <= 0) return null;

  const cash = await prisma.cashAccount.findFirst({ where: { code: 'CASH-MAIN' } });
  const type = mapVoucherType(v.accountType);
  const paymentMethod = mapPayMethod(v.paymentMethod);

  return postTransaction({
    date: v.createdAt,
    type,
    category: categoryFromVoucher(v.accountType, v.category),
    amountOriginal: v.amountIqd,
    currency: 'IQD',
    exchangeRate: v.exchangeRate || 1,
    partyName: v.partyName,
    customerId: v.customerId,
    supplierId: v.supplierId,
    employeeUserId: v.employeeUserId,
    houseId: v.houseId,
    paymentMethod,
    cashAccountId: paymentMethod === 'CASH' ? cash?.id : null,
    voucherNo: v.voucherNo,
    description: v.note,
    attachmentUrl: v.attachmentUrl,
    createdById: createdById ?? v.createdById,
    sourceVoucherId: v.id,
    branchId: v.branchId,
    allowOverdraft: true,
  });
}

/**
 * Dual-write a receipt into the ledger.
 * Skips SECURITY_DEPOSIT (held off GL) and RENT (posted via /collect voucher).
 * Skips PAYMENT+contract (installment mark-PAID posts BUYER_PAYMENT voucher).
 */
export async function dualWriteReceipt(receiptId: string, createdById?: string | null) {
  await seedAccountingChart(prisma);
  const r = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!r) return null;
  if (r.purpose === 'SECURITY_DEPOSIT') return null;
  if (r.purpose === 'RENT') return null;
  // Contract installment payments are booked when installment is marked PAID
  if (r.type === 'PAYMENT' && r.contractId) return null;

  const cash = await prisma.cashAccount.findFirst({ where: { code: 'CASH-MAIN' } });
  let type: LedgerTxnType = 'INCOME';
  if (r.type === 'EXPENSE') type = 'EXPENSE';
  else if (r.type === 'PAYMENT') type = 'CUSTOMER_PAYMENT';
  else type = 'INCOME';

  const rate = await resolveReceiptFx(r);
  const amountIqd = r.currency === 'USD' ? r.amount * rate : r.amount;

  let branchId: string | null = null;
  if (r.contractId) {
    const c = await prisma.contract.findUnique({
      where: { id: r.contractId },
      select: { dealEmployee: { select: { branchId: true } } },
    });
    branchId = c?.dealEmployee?.branchId ?? null;
  } else if (r.leaseId) {
    const l = await prisma.lease.findUnique({
      where: { id: r.leaseId },
      select: { dealEmployee: { select: { branchId: true } } },
    });
    branchId = l?.dealEmployee?.branchId ?? null;
  }
  if (!branchId && createdById) {
    const { resolveWriteBranchId } = await import('@/lib/access/accounting-branch');
    branchId = await resolveWriteBranchId({ createdById });
  }

  return postTransaction({
    date: r.issuedAt ?? r.createdAt,
    type,
    category: r.type === 'EXPENSE' ? 'OTHER' : r.type === 'PAYMENT' ? 'INSTALLMENT' : 'OTHER_INCOME',
    amountOriginal: amountIqd,
    currency: 'IQD',
    exchangeRate: 1,
    partyName: r.partyName,
    paymentMethod: 'CASH',
    cashAccountId: cash?.id,
    receiptNo: r.receiptNo,
    description: r.description,
    createdById: createdById ?? null,
    sourceReceiptId: r.id,
    branchId,
    allowOverdraft: true,
  });
}

/** Soft-delete ledger row linked to a receipt (before edit/delete). */
export async function voidReceiptLedger(receiptId: string, deletedById?: string | null) {
  const existing = await prisma.ledgerTransaction.findFirst({
    where: { sourceReceiptId: receiptId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return;
  await softDeleteTransaction(existing.id, deletedById);
}

/** Re-post receipt ledger after edit. */
export async function resyncReceiptLedger(receiptId: string, userId?: string | null) {
  await voidReceiptLedger(receiptId, userId);
  return dualWriteReceipt(receiptId, userId);
}

/** Soft-delete ledger row linked to a voucher (used on reverse). */
export async function voidVoucherLedger(voucherId: string, deletedById?: string | null) {
  const existing = await prisma.ledgerTransaction.findFirst({
    where: { sourceVoucherId: voucherId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return;
  await softDeleteTransaction(existing.id, deletedById);
}

/** One-shot migration of all existing POSTED vouchers + receipts. */
export async function migrateLegacyFinanceToLedger() {
  await seedAccountingChart(prisma);
  const vouchers = await prisma.voucher.findMany({
    where: { status: 'POSTED', reversesId: null, amountIqd: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
  });
  const receipts = await prisma.receipt.findMany({
    where: {
      purpose: { notIn: ['SECURITY_DEPOSIT', 'RENT'] },
      OR: [{ type: { not: 'PAYMENT' } }, { contractId: null }],
    },
    orderBy: { createdAt: 'asc' },
  });

  let voucherCount = 0;
  let receiptCount = 0;
  const errors: string[] = [];

  for (const v of vouchers) {
    try {
      const existing = await prisma.ledgerTransaction.findUnique({
        where: { sourceVoucherId: v.id },
      });
      if (existing) continue;
      await dualWriteVoucher(v.id, v.createdById);
      voucherCount++;
    } catch (e) {
      errors.push(`voucher ${v.voucherNo}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const r of receipts) {
    try {
      const existing = await prisma.ledgerTransaction.findUnique({
        where: { sourceReceiptId: r.id },
      });
      if (existing) continue;
      await dualWriteReceipt(r.id);
      receiptCount++;
    } catch (e) {
      errors.push(`receipt ${r.receiptNo}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { voucherCount, receiptCount, errors };
}
