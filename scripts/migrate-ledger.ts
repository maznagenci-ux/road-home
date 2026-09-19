import { PrismaClient } from '@prisma/client';
import { seedAccountingChart } from '../src/lib/accounting/seed-chart';
import { migrateLegacyFinanceToLedger } from '../src/lib/accounting/bridge';

const prisma = new PrismaClient();

async function main() {
  await seedAccountingChart(prisma);
  const result = await migrateLegacyFinanceToLedger();
  console.log('Chart seeded + legacy migrate:', result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
