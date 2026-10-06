/**
 * Probe hard-delete of one contract (DB only — no HTTP auth).
 * Usage on VPS: node scripts/hostinger/probe-delete-contract.cjs [contractNo]
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wantNo = process.argv[2];
  const c = wantNo
    ? await prisma.contract.findFirst({
        where: { contractNo: wantNo },
        include: { _count: { select: { receipts: true, installments: true } } },
      })
    : await prisma.contract.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { receipts: true, installments: true } } },
      });
  if (!c) {
    console.log('NO_CONTRACT');
    return;
  }
  console.log(
    JSON.stringify({
      id: c.id,
      no: c.contractNo,
      status: c.status,
      receipts: c._count.receipts,
      installments: c._count.installments,
    }),
  );
  try {
    await prisma.$transaction(async (tx) => {
      await tx.receipt.updateMany({
        where: { contractId: c.id },
        data: { contractId: null },
      });
      await tx.installment.deleteMany({ where: { contractId: c.id } });
      await tx.contract.delete({ where: { id: c.id } });
    });
    console.log('DELETE_OK');
  } catch (e) {
    console.log('DELETE_FAIL', e.code || '', e.message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
