import type { LedgerPayMethod, LedgerTxnType, PaymentMethod, VoucherAccountType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { postTransaction } from './post';
import { seedAccountingChart } from './seed-chart';

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

/** Dual-write a newly created voucher into the ledger (idempotent via sourceVoucherId). */
export async function dualWriteVoucher(voucherId: string, createdById?: string | null) {
  await seedAccountingChart(prisma);
  const v = await prisma.voucher.findUnique({ where: { id: voucherId } });
  if (!v || v.status !== 'POSTED') return null;

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
    allowOverdraft: true,
  });
}

/** Dual-write a receipt into the ledger. */
export async function dualWriteReceipt(receiptId: string, createdById?: string | null) {
  await seedAccountingChart(prisma);
  const r = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!r) return null;
  // Lease security deposits are held off the general ledger
  if (r.purpose === 'SECURITY_DEPOSIT') return null;

  const cash = await prisma.cashAccount.findFirst({ where: { code: 'CASH-MAIN' } });
  let type: LedgerTxnType = 'INCOME';
  if (r.type === 'EXPENSE') type = 'EXPENSE';
  else if (r.type === 'PAYMENT') type = 'CUSTOMER_PAYMENT';
  else type = 'INCOME';

  const rate = 150_000;
  const amountIqd = r.currency === 'USD' ? r.amount * rate : r.amount;

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
    allowOverdraft: true,
  });
}

/** One-shot migration of all existing POSTED vouchers + receipts. */
export async function migrateLegacyFinanceToLedger() {
  await seedAccountingChart(prisma);
  const vouchers = await prisma.voucher.findMany({
    where: { status: 'POSTED' },
    orderBy: { createdAt: 'asc' },
  });
  const receipts = await prisma.receipt.findMany({
    where: { purpose: { not: 'SECURITY_DEPOSIT' } },
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
