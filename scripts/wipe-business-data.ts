/**
 * Wipe all business data for a clean production start.
 * Keeps SUPER_ADMIN 07507535675. Reseeds chart of accounts.
 *
 *   npx tsx scripts/wipe-business-data.ts
 */
import { PrismaClient } from '@prisma/client';
import { rm, mkdir } from 'fs/promises';
import path from 'path';
import { seedAccountingChart } from '../src/lib/accounting/seed-chart';

const prisma = new PrismaClient();
const KEEP_ADMIN_PHONE = '07507535675';

async function emptyReceiptsBucket() {
  const root =
    process.env.UPLOADS_DIR?.trim() ||
    path.join(process.cwd(), 'public', 'uploads', 'receipts');
  try {
    await rm(root, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    console.log('storage_cleared', root);
  } catch (e) {
    console.log('storage_skip', e instanceof Error ? e.message : e);
  }
}

async function counts(label: string) {
  console.log(label, {
    vouchers: await prisma.voucher.count(),
    contracts: await prisma.contract.count(),
    receipts: await prisma.receipt.count(),
    leases: await prisma.lease.count(),
    ledgerTxns: await prisma.ledgerTransaction.count(),
    houses: await prisma.house.count(),
    customers: await prisma.customer.count(),
    places: await prisma.place.count(),
    users: await prisma.user.count(),
  });
}

async function main() {
  await counts('before');

  await prisma.voucher.updateMany({ data: { reversesId: null } });

  await prisma.inventoryTxnLine.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.materialWaste.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.material.deleteMany();
  await prisma.materialCategory.deleteMany();
  await prisma.warehouse.deleteMany();

  await prisma.transactionLine.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.cashAccount.updateMany({ data: { openingBalance: 0 } });
  await prisma.bankAccount.updateMany({ data: { openingBalance: 0 } });

  await prisma.rentPayment.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.anket.deleteMany();
  await prisma.supportLetter.deleteMany();
  await prisma.monthlyReport.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.loginOtp.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.projectBudget.deleteMany();
  await prisma.constructionProject.deleteMany();
  await prisma.house.deleteMany();
  await prisma.property.deleteMany();
  await prisma.place.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.agentCommissionRule.deleteMany();

  const keep = await prisma.user.findUnique({ where: { phone: KEEP_ADMIN_PHONE } });
  if (keep) {
    await prisma.userPermission.deleteMany({ where: { userId: { not: keep.id } } });
    await prisma.user.deleteMany({ where: { id: { not: keep.id } } });
    await prisma.user.update({
      where: { id: keep.id },
      data: { role: 'SUPER_ADMIN', isActive: true, name: 'Super Admin' },
    });
  } else {
    console.log('WARN: admin phone not found');
  }

  await seedAccountingChart(prisma);
  await emptyReceiptsBucket();
  await counts('after');
  console.log('DONE — clean. Login:', KEEP_ADMIN_PHONE);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
