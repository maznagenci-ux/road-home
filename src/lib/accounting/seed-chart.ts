import type { PrismaClient } from '@prisma/client';
import { DEFAULT_BANK, DEFAULT_CASH, SYSTEM_ACCOUNTS } from './chart';

/** Idempotent chart + cash/bank seed. Safe to run on every boot/migrate. */
export async function seedAccountingChart(prisma: PrismaClient) {
  for (const a of SYSTEM_ACCOUNTS) {
    await prisma.ledgerAccount.upsert({
      where: { code: a.code },
      update: { name: a.name, nameKu: a.nameKu, class: a.class, isSystem: true, isActive: true },
      create: {
        code: a.code,
        name: a.name,
        nameKu: a.nameKu,
        class: a.class,
        isSystem: true,
        isActive: true,
      },
    });
  }

  const cash = await prisma.cashAccount.upsert({
    where: { code: DEFAULT_CASH.code },
    update: { name: DEFAULT_CASH.name, isActive: true },
    create: {
      code: DEFAULT_CASH.code,
      name: DEFAULT_CASH.name,
      currency: DEFAULT_CASH.currency,
      openingBalance: DEFAULT_CASH.openingBalance,
    },
  });

  const bank = await prisma.bankAccount.upsert({
    where: { code: DEFAULT_BANK.code },
    update: { name: DEFAULT_BANK.name, bankName: DEFAULT_BANK.bankName, isActive: true },
    create: {
      code: DEFAULT_BANK.code,
      name: DEFAULT_BANK.name,
      bankName: DEFAULT_BANK.bankName,
      currency: DEFAULT_BANK.currency,
      openingBalance: DEFAULT_BANK.openingBalance,
    },
  });

  // Link 1000 → cash, 1100 → bank
  await prisma.ledgerAccount.update({
    where: { code: '1000' },
    data: { cashAccountId: cash.id },
  });
  await prisma.ledgerAccount.update({
    where: { code: '1100' },
    data: { bankAccountId: bank.id },
  });

  const commission = await prisma.agentCommissionRule.findFirst({ where: { isActive: true } });
  if (!commission) {
    await prisma.agentCommissionRule.create({
      data: { name: 'Default sale commission', ratePct: 2, isActive: true },
    });
  }

  return { cash, bank };
}
