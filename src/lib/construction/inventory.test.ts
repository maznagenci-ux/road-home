import { describe, expect, it, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { getHouseActualCostIqd, dec } from '@/lib/construction/cost-control';
import {
  issueToProject,
  purchaseIntoStock,
  seedMaterialCatalog,
} from '@/lib/construction/inventory';

describe('inventory → ledger (no double expense)', () => {
  beforeAll(async () => {
    await seedAccountingChart(prisma);
    await seedMaterialCatalog();
  });

  it('purchase then issue: stock down, construction expense once', async () => {
    const cash = await prisma.cashAccount.findFirstOrThrow({ where: { code: 'CASH-MAIN' } });
    const warehouse = await prisma.warehouse.findFirstOrThrow({ where: { code: 'WH-MAIN' } });
    const cat = await prisma.materialCategory.findFirstOrThrow({ where: { code: 'CEMENT' } });

    const code = `TST-CEM-${Date.now()}`;
    const material = await prisma.material.create({
      data: {
        code,
        name: 'Test Cement',
        categoryId: cat.id,
        unit: 'BAG',
        avgCostIqd: 0,
        minStock: 0,
      },
    });

    const house = await prisma.house.create({
      data: {
        code: `H-INV-${Date.now()}`,
        name: 'Inventory Test House',
        budgetIqd: 50_000_000,
      },
    });

    await purchaseIntoStock({
      date: new Date(),
      warehouseId: warehouse.id,
      paymentMethod: 'CASH',
      cashAccountId: cash.id,
      lines: [{ materialId: material.id, quantity: 10, unitCostIqd: 10_000 }],
      createdByName: 'vitest',
    });

    const balAfterPurchase = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        materialId_warehouseId: { materialId: material.id, warehouseId: warehouse.id },
      },
    });
    expect(dec(balAfterPurchase.quantity)).toBe(10);

    const matAfter = await prisma.material.findUniqueOrThrow({ where: { id: material.id } });
    expect(dec(matAfter.avgCostIqd)).toBe(10_000);

    const costBefore = await getHouseActualCostIqd(house.id);

    await issueToProject({
      date: new Date(),
      warehouseId: warehouse.id,
      houseId: house.id,
      lines: [{ materialId: material.id, quantity: 4 }],
      reason: 'foundation',
      createdByName: 'vitest',
    });

    const balAfterIssue = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        materialId_warehouseId: { materialId: material.id, warehouseId: warehouse.id },
      },
    });
    expect(dec(balAfterIssue.quantity)).toBe(6);

    const costAfter = await getHouseActualCostIqd(house.id);
    expect(costAfter - costBefore).toBeCloseTo(40_000, 0);

    // Only one INVENTORY_ISSUE for this house with that amount (not also EXPENSE voucher)
    const issues = await prisma.ledgerTransaction.findMany({
      where: { houseId: house.id, type: 'INVENTORY_ISSUE', deletedAt: null },
    });
    expect(issues.length).toBe(1);
    expect(issues[0].amountBaseIqd).toBeCloseTo(40_000, 0);
  });
});
