import type { PrismaClient } from '@prisma/client';
import { DEFAULT_BANK, DEFAULT_CASH, SYSTEM_ACCOUNTS } from './chart';

type SeedResult = {
  cash: { id: string; code: string };
  bank: { id: string; code: string };
};

/** Process-local cache — avoids repeated remote round-trips on every request. */
let seedCache: SeedResult | null = null;
let seedInFlight: Promise<SeedResult> | null = null;

/** Idempotent chart + cash/bank seed. Safe to run on every boot/migrate. */
export async function seedAccountingChart(prisma: PrismaClient): Promise<SeedResult> {
  if (seedCache) return seedCache;
  if (seedInFlight) return seedInFlight;

  seedInFlight = (async () => {
    const seeded = await prisma.ledgerAccount.count({
      where: { isSystem: true },
    });
    if (seeded >= SYSTEM_ACCOUNTS.length) {
      const [cash, bank] = await Promise.all([
        prisma.cashAccount.findUnique({ where: { code: DEFAULT_CASH.code } }),
        prisma.bankAccount.findUnique({ where: { code: DEFAULT_BANK.code } }),
      ]);
      if (cash && bank) {
        seedCache = { cash: { id: cash.id, code: cash.code }, bank: { id: bank.id, code: bank.code } };
        return seedCache;
      }
    }

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

    seedCache = { cash: { id: cash.id, code: cash.code }, bank: { id: bank.id, code: bank.code } };
    return seedCache;
  })();

  try {
    return await seedInFlight;
  } finally {
    seedInFlight = null;
  }
}
