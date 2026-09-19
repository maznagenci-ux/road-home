import { describe, expect, it, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { postTransaction, transfer } from '@/lib/accounting/post';
import {
  getIncomeExpenseSummary,
  getProfitAndLoss,
  getTotalAvailableMoney,
} from '@/lib/accounting/reports';

describe('AccountingEngine', () => {
  beforeAll(async () => {
    await seedAccountingChart(prisma);
  });

  it('posts balanced income and updates available money', async () => {
    const cash = await prisma.cashAccount.findFirstOrThrow({ where: { code: 'CASH-MAIN' } });
    const before = await getTotalAvailableMoney();
    const txn = await postTransaction({
      date: new Date(),
      type: 'INCOME',
      category: 'OTHER_INCOME',
      amountOriginal: 1_000_000,
      currency: 'IQD',
      paymentMethod: 'CASH',
      cashAccountId: cash.id,
      partyName: 'Test payer',
      description: 'vitest income',
      allowOverdraft: true,
    });
    expect(txn.txnNo).toMatch(/^LT-/);
    const lines = await prisma.transactionLine.findMany({ where: { transactionId: txn.id } });
    const debit = lines.reduce((s, l) => s + l.debitIqd, 0);
    const credit = lines.reduce((s, l) => s + l.creditIqd, 0);
    expect(Math.abs(debit - credit)).toBeLessThan(0.01);
    const after = await getTotalAvailableMoney();
    expect(after.totalIqd - before.totalIqd).toBeCloseTo(1_000_000, 0);
  });

  it('keeps cash-to-cash transfers P&L and total-available neutral', async () => {
    const cash = await prisma.cashAccount.findFirstOrThrow({ where: { code: 'CASH-MAIN' } });
    let other = await prisma.cashAccount.findFirst({ where: { code: { not: 'CASH-MAIN' } } });
    if (!other) {
      other = await prisma.cashAccount.create({
        data: {
          code: 'CASH-TEST',
          name: 'Test Cash',
          currency: 'IQD',
          openingBalance: 0,
        },
      });
      await prisma.ledgerAccount.create({
        data: {
          code: 'C-CASH-TEST',
          name: 'Test Cash',
          class: 'ASSET',
          isSystem: false,
          cashAccountId: other.id,
        },
      });
    }

    await postTransaction({
      date: new Date(),
      type: 'OWNER_CAPITAL',
      category: 'OWNER_CAPITAL',
      amountOriginal: 5_000_000,
      cashAccountId: cash.id,
      paymentMethod: 'CASH',
      allowOverdraft: true,
      description: 'vitest capital',
    });

    const range = {
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000),
    };
    const beforePl = await getProfitAndLoss(range);
    const beforeMoney = await getTotalAvailableMoney();

    await transfer({
      date: new Date(),
      amount: 500_000,
      fromCashId: cash.id,
      toCashId: other.id,
      description: 'vitest transfer',
      allowOverdraft: true,
    });

    const afterPl = await getProfitAndLoss(range);
    const afterMoney = await getTotalAvailableMoney();

    expect(afterPl.incomeIqd - beforePl.incomeIqd).toBeCloseTo(0, 0);
    expect(afterPl.expenseIqd - beforePl.expenseIqd).toBeCloseTo(0, 0);
    expect(afterMoney.cashIqd - beforeMoney.cashIqd).toBeCloseTo(0, 0);
  });

  it('excludes owner capital from P&L income', async () => {
    const cash = await prisma.cashAccount.findFirstOrThrow({ where: { code: 'CASH-MAIN' } });
    const range = {
      from: new Date(Date.now() - 5_000),
      to: new Date(Date.now() + 5_000),
    };
    const before = await getIncomeExpenseSummary(range);
    await postTransaction({
      date: new Date(),
      type: 'OWNER_CAPITAL',
      category: 'OWNER_CAPITAL',
      amountOriginal: 2_000_000,
      cashAccountId: cash.id,
      paymentMethod: 'CASH',
      allowOverdraft: true,
      description: 'vitest owner capital exclusion',
    });
    const after = await getIncomeExpenseSummary(range);
    expect(after.incomeIqd - before.incomeIqd).toBeCloseTo(0, 0);
  });

  it('rejects unbalanced duplicate txnNo', async () => {
    const cash = await prisma.cashAccount.findFirstOrThrow({ where: { code: 'CASH-MAIN' } });
    const txnNo = `LT-TEST-${Date.now()}`;
    await postTransaction({
      date: new Date(),
      type: 'INCOME',
      category: 'OTHER_INCOME',
      amountOriginal: 1000,
      cashAccountId: cash.id,
      paymentMethod: 'CASH',
      txnNo,
      allowOverdraft: true,
    });
    await expect(
      postTransaction({
        date: new Date(),
        type: 'INCOME',
        category: 'OTHER_INCOME',
        amountOriginal: 1000,
        cashAccountId: cash.id,
        paymentMethod: 'CASH',
        txnNo,
        allowOverdraft: true,
      }),
    ).rejects.toThrow(/Duplicate/);
  });
});
