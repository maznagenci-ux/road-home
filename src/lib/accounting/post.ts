import type { LedgerAccount, LedgerTxnType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { PostTransactionInput } from './types';

const EPS = 0.01;

/** Types that affect P&L income */
export const INCOME_TYPES: LedgerTxnType[] = [
  'INCOME',
  'PROPERTY_SALE',
  'PROPERTY_RENTAL',
  'INSTALLMENT',
  'COMMISSION',
  'CUSTOMER_PAYMENT',
];

/** Types that affect P&L expense */
export const EXPENSE_TYPES: LedgerTxnType[] = [
  'EXPENSE',
  'SALARY',
  'COMMISSION',
  'EMPLOYEE_COMMISSION',
  'SUPPLIER_PAYMENT',
  'PROPERTY_PURCHASE',
  'INVENTORY_ISSUE',
  'INVENTORY_WASTE',
];

/** Excluded from P&L entirely */
export const NON_PL_TYPES: LedgerTxnType[] = [
  'TRANSFER',
  'OWNER_CAPITAL',
  'OWNER_WITHDRAWAL',
  'CASH_DEPOSIT',
  'CASH_WITHDRAWAL',
  'BANK_DEPOSIT',
  'BANK_WITHDRAWAL',
  'ADJUSTMENT',
  'INVESTMENT',
  'CUSTOMER_DEBT',
  'SUPPLIER_DEBT',
  'CUSTOMER_REFUND',
  'INVENTORY_PURCHASE',
  'INVENTORY_ADJUST',
  'INVENTORY_TRANSFER',
];

function toBaseIqd(amount: number, currency: string, rate: number) {
  if (currency === 'IQD') return amount;
  return amount * (rate || 1);
}

async function nextTxnNo(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const prefix = `LT-${year}`;
  const last = await tx.ledgerTransaction.findFirst({
    where: { txnNo: { startsWith: prefix } },
    orderBy: { txnNo: 'desc' },
    select: { txnNo: true },
  });
  let n = 1;
  if (last?.txnNo) {
    const part = last.txnNo.split('-').pop();
    n = (Number(part) || 0) + 1;
  }
  return `${prefix}-${String(n).padStart(6, '0')}`;
}

async function accountByCode(tx: Prisma.TransactionClient, code: string) {
  const a = await tx.ledgerAccount.findUnique({ where: { code } });
  if (!a) throw new Error(`Ledger account ${code} missing — run seed`);
  return a;
}

type LineDraft = { ledgerAccountId: string; debitIqd: number; creditIqd: number; memo?: string };

function assertBalanced(lines: LineDraft[]) {
  const d = lines.reduce((s, l) => s + l.debitIqd, 0);
  const c = lines.reduce((s, l) => s + l.creditIqd, 0);
  if (Math.abs(d - c) > EPS) {
    throw new Error(`Unbalanced entry: debit ${d} ≠ credit ${c}`);
  }
}

async function moneyBalanceIqd(
  tx: Prisma.TransactionClient,
  kind: 'cash' | 'bank',
  accountId: string,
): Promise<{ balance: number; allowNegative: boolean; opening: number }> {
  if (kind === 'cash') {
    const acc = await tx.cashAccount.findUniqueOrThrow({ where: { id: accountId } });
    const ledger = await tx.ledgerAccount.findFirst({ where: { cashAccountId: accountId } });
    if (!ledger) return { balance: acc.openingBalance, allowNegative: acc.allowNegative, opening: acc.openingBalance };
    const lines = await tx.transactionLine.findMany({
      where: {
        ledgerAccountId: ledger.id,
        transaction: { deletedAt: null },
      },
      select: { debitIqd: true, creditIqd: true },
    });
    const net = lines.reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);
    return {
      balance: acc.openingBalance + net,
      allowNegative: acc.allowNegative,
      opening: acc.openingBalance,
    };
  }
  const acc = await tx.bankAccount.findUniqueOrThrow({ where: { id: accountId } });
  const ledger = await tx.ledgerAccount.findFirst({ where: { bankAccountId: accountId } });
  if (!ledger) return { balance: acc.openingBalance, allowNegative: acc.allowNegative, opening: acc.openingBalance };
  const lines = await tx.transactionLine.findMany({
    where: {
      ledgerAccountId: ledger.id,
      transaction: { deletedAt: null },
    },
    select: { debitIqd: true, creditIqd: true },
  });
  const net = lines.reduce((s, l) => s + l.debitIqd - l.creditIqd, 0);
  return {
    balance: acc.openingBalance + net,
    allowNegative: acc.allowNegative,
    opening: acc.openingBalance,
  };
}

async function resolveMoneyLedger(
  tx: Prisma.TransactionClient,
  cashId?: string | null,
  bankId?: string | null,
): Promise<LedgerAccount> {
  if (cashId) {
    const a = await tx.ledgerAccount.findFirst({ where: { cashAccountId: cashId } });
    if (a) return a;
    return accountByCode(tx, '1000');
  }
  if (bankId) {
    const a = await tx.ledgerAccount.findFirst({ where: { bankAccountId: bankId } });
    if (a) return a;
    return accountByCode(tx, '1100');
  }
  return accountByCode(tx, '1000');
}

function expenseAccountCode(category: string): string {
  if (category === 'SALARY' || category === 'BONUS' || category === 'ALLOWANCE') return '5200';
  if (category === 'COMMISSION') return '5300';
  if (category.startsWith('OFFICE_') || category === 'OTHER_OFFICE') return '5100';
  if (
    ['STEEL', 'CEMENT', 'LABOR', 'MATERIALS', 'EQUIPMENT', 'UTILITIES', 'PERMITS', 'OTHER'].includes(
      category,
    )
  ) {
    return '5000';
  }
  return '5400';
}

function incomeAccountCode(category: string, type: LedgerTxnType): string {
  if (type === 'PROPERTY_RENTAL' || category === 'RENTAL') return '4100';
  if (type === 'COMMISSION' || category === 'COMMISSION') return '4300';
  if (type === 'PROPERTY_SALE' || category === 'SALE' || category === 'INSTALLMENT') return '4000';
  return '4200';
}

/** Build balanced debit/credit lines from a posting intent */
async function buildLines(
  tx: Prisma.TransactionClient,
  input: PostTransactionInput,
  amountIqd: number,
): Promise<LineDraft[]> {
  const type = input.type;
  const money = await resolveMoneyLedger(tx, input.cashAccountId, input.bankAccountId);
  const ar = await accountByCode(tx, '1200');
  const ap = await accountByCode(tx, '2000');
  const equity = await accountByCode(tx, '3000');
  const drawings = await accountByCode(tx, '3100');
  const propertyAsset = await accountByCode(tx, '1300');

  switch (type) {
    case 'INCOME':
    case 'PROPERTY_SALE':
    case 'PROPERTY_RENTAL':
    case 'INSTALLMENT':
    case 'COMMISSION': {
      if (input.paymentMethod === 'CREDIT') {
        const inc = await accountByCode(tx, incomeAccountCode(input.category, type));
        return [
          { ledgerAccountId: ar.id, debitIqd: amountIqd, creditIqd: 0 },
          { ledgerAccountId: inc.id, debitIqd: 0, creditIqd: amountIqd },
        ];
      }
      const inc = await accountByCode(tx, incomeAccountCode(input.category, type));
      return [
        { ledgerAccountId: money.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: inc.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'CUSTOMER_PAYMENT': {
      // Cash/bank in, AR down
      return [
        { ledgerAccountId: money.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: ar.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'CUSTOMER_REFUND': {
      return [
        { ledgerAccountId: ar.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'CUSTOMER_DEBT': {
      const inc = await accountByCode(tx, incomeAccountCode(input.category, 'INCOME'));
      return [
        { ledgerAccountId: ar.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: inc.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'EXPENSE':
    case 'SALARY':
    case 'EMPLOYEE_COMMISSION': {
      const exp = await accountByCode(tx, expenseAccountCode(input.category));
      if (input.paymentMethod === 'CREDIT') {
        return [
          { ledgerAccountId: exp.id, debitIqd: amountIqd, creditIqd: 0 },
          { ledgerAccountId: ap.id, debitIqd: 0, creditIqd: amountIqd },
        ];
      }
      return [
        { ledgerAccountId: exp.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'SUPPLIER_PAYMENT': {
      return [
        { ledgerAccountId: ap.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'SUPPLIER_DEBT': {
      const exp = await accountByCode(tx, expenseAccountCode(input.category));
      return [
        { ledgerAccountId: exp.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: ap.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'PROPERTY_PURCHASE': {
      if (input.paymentMethod === 'CREDIT') {
        return [
          { ledgerAccountId: propertyAsset.id, debitIqd: amountIqd, creditIqd: 0 },
          { ledgerAccountId: ap.id, debitIqd: 0, creditIqd: amountIqd },
        ];
      }
      return [
        { ledgerAccountId: propertyAsset.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'OWNER_CAPITAL': {
      return [
        { ledgerAccountId: money.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: equity.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'OWNER_WITHDRAWAL': {
      return [
        { ledgerAccountId: drawings.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'CASH_DEPOSIT':
    case 'BANK_DEPOSIT': {
      return [
        { ledgerAccountId: money.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: equity.id, debitIqd: 0, creditIqd: amountIqd, memo: 'deposit' },
      ];
    }
    case 'CASH_WITHDRAWAL':
    case 'BANK_WITHDRAWAL': {
      return [
        { ledgerAccountId: drawings.id, debitIqd: amountIqd, creditIqd: 0, memo: 'withdrawal' },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'TRANSFER': {
      const dest = await resolveMoneyLedger(tx, input.transferCashId, input.transferBankId);
      if (dest.id === money.id) throw new Error('Transfer source and destination must differ');
      return [
        { ledgerAccountId: dest.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'INVESTMENT': {
      return [
        { ledgerAccountId: propertyAsset.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'INVENTORY_PURCHASE': {
      const inv = await accountByCode(tx, '1400');
      if (input.paymentMethod === 'CREDIT') {
        return [
          { ledgerAccountId: inv.id, debitIqd: amountIqd, creditIqd: 0 },
          { ledgerAccountId: ap.id, debitIqd: 0, creditIqd: amountIqd },
        ];
      }
      return [
        { ledgerAccountId: inv.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: money.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'INVENTORY_ISSUE':
    case 'INVENTORY_WASTE': {
      const inv = await accountByCode(tx, '1400');
      const exp = await accountByCode(tx, '5000');
      return [
        { ledgerAccountId: exp.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: inv.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'INVENTORY_ADJUST': {
      // Positive amount = write-off (expense); use category ADJUST_UP for stock increase via equity
      const inv = await accountByCode(tx, '1400');
      if (input.category === 'ADJUST_UP') {
        return [
          { ledgerAccountId: inv.id, debitIqd: amountIqd, creditIqd: 0 },
          { ledgerAccountId: equity.id, debitIqd: 0, creditIqd: amountIqd },
        ];
      }
      const exp = await accountByCode(tx, '5000');
      return [
        { ledgerAccountId: exp.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: inv.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
    case 'INVENTORY_TRANSFER': {
      // Intra-warehouse transfer is stock-only; ledger is a no-op balanced memo via inventory both sides
      // Handled without money movement — post zero-impact using inventory account twice is invalid.
      // Callers should skip ledger for pure warehouse transfers.
      throw new Error('INVENTORY_TRANSFER does not post to ledger — stock move only');
    }
    case 'ADJUSTMENT':
    default: {
      // Neutral: debit expense / credit equity adjustment when unspecified
      const other = await accountByCode(tx, '5400');
      return [
        { ledgerAccountId: other.id, debitIqd: amountIqd, creditIqd: 0 },
        { ledgerAccountId: equity.id, debitIqd: 0, creditIqd: amountIqd },
      ];
    }
  }
}

async function checkOverdraft(
  tx: Prisma.TransactionClient,
  input: PostTransactionInput,
  amountIqd: number,
  lines: LineDraft[],
) {
  if (input.allowOverdraft) return;

  const checkSide = async (kind: 'cash' | 'bank', id: string | null | undefined) => {
    if (!id) return;
    const ledger = await resolveMoneyLedger(
      tx,
      kind === 'cash' ? id : null,
      kind === 'bank' ? id : null,
    );
    const creditOut = lines
      .filter((l) => l.ledgerAccountId === ledger.id)
      .reduce((s, l) => s + l.creditIqd, 0);
    if (creditOut <= 0) return;
    const { balance, allowNegative } = await moneyBalanceIqd(tx, kind, id);
    if (!allowNegative && balance - creditOut < -EPS) {
      throw new Error(
        `Insufficient ${kind} balance (${Math.round(balance)} IQD) for ${Math.round(creditOut)} IQD`,
      );
    }
  };

  await checkSide('cash', input.cashAccountId);
  await checkSide('bank', input.bankAccountId);
  void amountIqd;
}

export async function postTransaction(input: PostTransactionInput) {
  if (!input.amountOriginal || input.amountOriginal <= 0) {
    throw new Error('Amount must be positive');
  }
  if (!input.date || Number.isNaN(input.date.getTime())) {
    throw new Error('Valid date required');
  }
  if (!input.category?.trim()) {
    throw new Error('Category required');
  }

  const currency = input.currency ?? 'IQD';
  const exchangeRate = input.exchangeRate ?? 1;
  const amountBaseIqd = toBaseIqd(input.amountOriginal, currency, exchangeRate);

  return prisma.$transaction(async (tx) => {
    if (input.txnNo) {
      const dup = await tx.ledgerTransaction.findUnique({ where: { txnNo: input.txnNo } });
      if (dup) throw new Error(`Duplicate txnNo ${input.txnNo}`);
    }
    if (input.sourceVoucherId) {
      const existing = await tx.ledgerTransaction.findUnique({
        where: { sourceVoucherId: input.sourceVoucherId },
      });
      if (existing) return existing;
    }
    if (input.sourceReceiptId) {
      const existing = await tx.ledgerTransaction.findUnique({
        where: { sourceReceiptId: input.sourceReceiptId },
      });
      if (existing) return existing;
    }

    const lines = await buildLines(tx, input, amountBaseIqd);
    assertBalanced(lines);
    await checkOverdraft(tx, input, amountBaseIqd, lines);

    const txnNo = input.txnNo ?? (await nextTxnNo(tx));
    const header = await tx.ledgerTransaction.create({
      data: {
        txnNo,
        date: input.date,
        type: input.type,
        category: input.category.trim(),
        amountOriginal: input.amountOriginal,
        currency,
        exchangeRate,
        amountBaseIqd,
        partyName: input.partyName ?? null,
        customerId: input.customerId ?? null,
        supplierId: input.supplierId ?? null,
        employeeUserId: input.employeeUserId ?? null,
        propertyId: input.propertyId ?? null,
        houseId: input.houseId ?? null,
        paymentMethod: input.paymentMethod ?? 'CASH',
        cashAccountId: input.cashAccountId ?? null,
        bankAccountId: input.bankAccountId ?? null,
        transferCashId: input.transferCashId ?? null,
        transferBankId: input.transferBankId ?? null,
        receiptNo: input.receiptNo ?? null,
        voucherNo: input.voucherNo ?? null,
        description: input.description ?? null,
        attachmentUrl: input.attachmentUrl ?? null,
        createdById: input.createdById ?? null,
        sourceVoucherId: input.sourceVoucherId ?? null,
        sourceReceiptId: input.sourceReceiptId ?? null,
        lines: {
          create: lines.map((l) => ({
            ledgerAccountId: l.ledgerAccountId,
            debitIqd: l.debitIqd,
            creditIqd: l.creditIqd,
            memo: l.memo ?? null,
          })),
        },
      },
      include: { lines: true },
    });

    await tx.activityLog.create({
      data: {
        userId: input.createdById ?? null,
        userName: 'system',
        action: 'LEDGER_POST',
        amountIqd: amountBaseIqd,
        meta: JSON.stringify({
          txnNo,
          type: input.type,
          category: input.category,
          old: null,
          new: { txnNo, amountBaseIqd, type: input.type },
        }),
      },
    });

    return header;
  });
}

export async function transfer(params: {
  date: Date;
  amount: number;
  currency?: 'IQD' | 'USD' | 'EUR';
  exchangeRate?: number;
  fromCashId?: string | null;
  fromBankId?: string | null;
  toCashId?: string | null;
  toBankId?: string | null;
  description?: string;
  createdById?: string | null;
  allowOverdraft?: boolean;
}) {
  if (!params.fromCashId && !params.fromBankId) throw new Error('Transfer source required');
  if (!params.toCashId && !params.toBankId) throw new Error('Transfer destination required');
  return postTransaction({
    date: params.date,
    type: 'TRANSFER',
    category: 'TRANSFER',
    amountOriginal: params.amount,
    currency: params.currency ?? 'IQD',
    exchangeRate: params.exchangeRate ?? 1,
    paymentMethod: 'TRANSFER',
    cashAccountId: params.fromCashId ?? null,
    bankAccountId: params.fromBankId ?? null,
    transferCashId: params.toCashId ?? null,
    transferBankId: params.toBankId ?? null,
    description: params.description ?? 'Transfer',
    createdById: params.createdById,
    allowOverdraft: params.allowOverdraft,
  });
}

/** Soft-delete with audit snapshot */
export async function softDeleteTransaction(id: string, deletedById?: string | null) {
  const existing = await prisma.ledgerTransaction.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing || existing.deletedAt) throw new Error('Transaction not found');

  await prisma.$transaction([
    prisma.ledgerTransaction.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: deletedById ?? null },
    }),
    prisma.activityLog.create({
      data: {
        userId: deletedById ?? null,
        userName: 'system',
        action: 'LEDGER_SOFT_DELETE',
        amountIqd: existing.amountBaseIqd,
        meta: JSON.stringify({
          txnNo: existing.txnNo,
          old: existing,
          new: null,
        }),
      },
    }),
  ]);
}

export { moneyBalanceIqd, toBaseIqd, accountByCode };
