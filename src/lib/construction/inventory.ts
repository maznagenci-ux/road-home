import { Prisma, type InventoryTxnKind, type WasteReason } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { postTransaction } from '@/lib/accounting/post';
import { seedAccountingChart } from '@/lib/accounting/seed-chart';
import { logActivity } from '@/lib/access/permissions';
import { dec, ensureConstructionProject, ensureFinanceConfig } from './cost-control';
import { checkBudgetAlert } from './alerts';

function toDec(n: number) {
  return new Prisma.Decimal(n);
}

async function nextInvTxnNo() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}`;
  const last = await prisma.inventoryTransaction.findFirst({
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

async function getOrCreateBalance(materialId: string, warehouseId: string) {
  return prisma.inventoryBalance.upsert({
    where: { materialId_warehouseId: { materialId, warehouseId } },
    create: { materialId, warehouseId, quantity: 0 },
    update: {},
  });
}

/** Weighted average cost after inbound purchase/receive */
export function weightedAvgCost(
  currentQty: number,
  currentAvg: number,
  addQty: number,
  addUnitCost: number,
): number {
  if (addQty <= 0) return currentAvg;
  const totalQty = currentQty + addQty;
  if (totalQty <= 0) return addUnitCost;
  return (currentQty * currentAvg + addQty * addUnitCost) / totalQty;
}

export type InvLineInput = {
  materialId: string;
  quantity: number;
  unitCostIqd?: number;
};

export async function purchaseIntoStock(input: {
  date: Date;
  warehouseId: string;
  supplierId?: string | null;
  paymentMethod: 'CASH' | 'BANK' | 'CREDIT';
  cashAccountId?: string | null;
  bankAccountId?: string | null;
  lines: InvLineInput[];
  note?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
}) {
  if (!input.lines.length) throw new Error('LINES_REQUIRED');
  for (const l of input.lines) {
    if (!(l.quantity > 0)) throw new Error('INVALID_QTY');
    if (!(l.unitCostIqd != null && l.unitCostIqd >= 0)) throw new Error('UNIT_COST_REQUIRED');
  }

  const totalCost = input.lines.reduce((s, l) => s + l.quantity * (l.unitCostIqd ?? 0), 0);
  const txnNo = await nextInvTxnNo();

  await seedAccountingChart(prisma);

  const ledger = await postTransaction({
    date: input.date,
    type: 'INVENTORY_PURCHASE',
    category: 'MATERIALS',
    amountOriginal: totalCost,
    currency: 'IQD',
    exchangeRate: 1,
    paymentMethod: input.paymentMethod,
    cashAccountId: input.cashAccountId,
    bankAccountId: input.bankAccountId,
    supplierId: input.supplierId,
    description: `Inventory purchase ${txnNo}`,
    createdById: input.createdById,
    allowOverdraft: input.paymentMethod === 'CREDIT',
  });

  const inv = await prisma.$transaction(async (tx) => {
    const header = await tx.inventoryTransaction.create({
      data: {
        txnNo,
        kind: 'PURCHASE',
        date: input.date,
        warehouseId: input.warehouseId,
        supplierId: input.supplierId ?? null,
        note: input.note ?? null,
        totalCostIqd: toDec(totalCost),
        ledgerTxnId: ledger.id,
        createdById: input.createdById ?? null,
        lines: {
          create: input.lines.map((l) => ({
            materialId: l.materialId,
            quantity: toDec(l.quantity),
            unitCostIqd: toDec(l.unitCostIqd ?? 0),
            totalCostIqd: toDec(l.quantity * (l.unitCostIqd ?? 0)),
          })),
        },
      },
      include: { lines: true },
    });

    for (const l of input.lines) {
      const mat = await tx.material.findUniqueOrThrow({ where: { id: l.materialId } });
      const bal = await tx.inventoryBalance.upsert({
        where: {
          materialId_warehouseId: { materialId: l.materialId, warehouseId: input.warehouseId },
        },
        create: {
          materialId: l.materialId,
          warehouseId: input.warehouseId,
          quantity: toDec(0),
        },
        update: {},
      });
      const qty = dec(bal.quantity);
      const avg = dec(mat.avgCostIqd);
      const newAvg = weightedAvgCost(qty, avg, l.quantity, l.unitCostIqd ?? 0);
      await tx.inventoryBalance.update({
        where: { id: bal.id },
        data: { quantity: toDec(qty + l.quantity) },
      });
      await tx.material.update({
        where: { id: l.materialId },
        data: { avgCostIqd: toDec(newAvg) },
      });
    }

    return header;
  });

  if (input.createdById) {
    await logActivity({
      userId: input.createdById,
      userName: input.createdByName ?? 'system',
      action: 'INVENTORY_PURCHASE',
      amountIqd: totalCost,
      meta: txnNo,
    });
  }

  return inv;
}

export async function issueToProject(input: {
  date: Date;
  warehouseId: string;
  houseId: string;
  lines: { materialId: string; quantity: number }[];
  employeeUserId?: string | null;
  reason?: string | null;
  note?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
}) {
  if (!input.lines.length) throw new Error('LINES_REQUIRED');
  const project = await ensureConstructionProject(input.houseId);

  const priced: { materialId: string; quantity: number; unitCostIqd: number; total: number }[] =
    [];
  for (const l of input.lines) {
    if (!(l.quantity > 0)) throw new Error('INVALID_QTY');
    const mat = await prisma.material.findUniqueOrThrow({ where: { id: l.materialId } });
    const bal = await getOrCreateBalance(l.materialId, input.warehouseId);
    if (dec(bal.quantity) + 1e-9 < l.quantity) {
      throw new Error(`INSUFFICIENT_STOCK:${mat.code}`);
    }
    const unit = dec(mat.avgCostIqd);
    priced.push({
      materialId: l.materialId,
      quantity: l.quantity,
      unitCostIqd: unit,
      total: unit * l.quantity,
    });
  }

  const totalCost = priced.reduce((s, l) => s + l.total, 0);
  if (totalCost <= 0) throw new Error('ZERO_COST');

  const txnNo = await nextInvTxnNo();
  await seedAccountingChart(prisma);
  const ledger = await postTransaction({
    date: input.date,
    type: 'INVENTORY_ISSUE',
    category: 'MATERIALS',
    amountOriginal: totalCost,
    currency: 'IQD',
    houseId: input.houseId,
    employeeUserId: input.employeeUserId,
    description: `Issue to project ${txnNo}`,
    createdById: input.createdById,
    paymentMethod: 'OTHER',
    allowOverdraft: true,
  });

  const inv = await prisma.$transaction(async (tx) => {
    const header = await tx.inventoryTransaction.create({
      data: {
        txnNo,
        kind: 'ISSUE' satisfies InventoryTxnKind,
        date: input.date,
        warehouseId: input.warehouseId,
        projectId: project.id,
        houseId: input.houseId,
        employeeUserId: input.employeeUserId ?? null,
        reason: input.reason ?? null,
        note: input.note ?? null,
        totalCostIqd: toDec(totalCost),
        ledgerTxnId: ledger.id,
        createdById: input.createdById ?? null,
        lines: {
          create: priced.map((l) => ({
            materialId: l.materialId,
            quantity: toDec(l.quantity),
            unitCostIqd: toDec(l.unitCostIqd),
            totalCostIqd: toDec(l.total),
          })),
        },
      },
      include: { lines: true },
    });

    for (const l of priced) {
      const bal = await tx.inventoryBalance.findUniqueOrThrow({
        where: {
          materialId_warehouseId: { materialId: l.materialId, warehouseId: input.warehouseId },
        },
      });
      await tx.inventoryBalance.update({
        where: { id: bal.id },
        data: { quantity: toDec(dec(bal.quantity) - l.quantity) },
      });
    }

    return header;
  });

  if (input.createdById) {
    await logActivity({
      userId: input.createdById,
      userName: input.createdByName ?? 'system',
      action: 'INVENTORY_ISSUE',
      projectCode: (await prisma.house.findUnique({ where: { id: input.houseId } }))?.code,
      amountIqd: totalCost,
      meta: txnNo,
    });
  }

  await checkBudgetAlert(input.houseId, input.createdById, input.createdByName);

  return inv;
}

export async function recordWaste(input: {
  date: Date;
  warehouseId: string;
  materialId: string;
  quantity: number;
  reason: WasteReason;
  reasonNote?: string | null;
  houseId?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
}) {
  if (!(input.quantity > 0)) throw new Error('INVALID_QTY');
  const mat = await prisma.material.findUniqueOrThrow({ where: { id: input.materialId } });
  const bal = await getOrCreateBalance(input.materialId, input.warehouseId);
  if (dec(bal.quantity) + 1e-9 < input.quantity) {
    throw new Error(`INSUFFICIENT_STOCK:${mat.code}`);
  }

  const unit = dec(mat.avgCostIqd);
  const value = unit * input.quantity;
  const config = await ensureFinanceConfig();
  const needsApproval = value >= config.waste.approvalThresholdIqd;

  let projectId: string | null = null;
  if (input.houseId) {
    const p = await ensureConstructionProject(input.houseId);
    projectId = p.id;
  }

  const txnNo = await nextInvTxnNo();

  // Pending waste: reduce stock but defer ledger until approved
  if (needsApproval) {
    const inv = await prisma.$transaction(async (tx) => {
      const header = await tx.inventoryTransaction.create({
        data: {
          txnNo,
          kind: 'WASTE',
          date: input.date,
          warehouseId: input.warehouseId,
          projectId,
          houseId: input.houseId ?? null,
          reason: input.reason,
          note: input.reasonNote ?? null,
          totalCostIqd: toDec(value),
          createdById: input.createdById ?? null,
          lines: {
            create: [
              {
                materialId: input.materialId,
                quantity: toDec(input.quantity),
                unitCostIqd: toDec(unit),
                totalCostIqd: toDec(value),
              },
            ],
          },
          waste: {
            create: {
              materialId: input.materialId,
              projectId,
              quantity: toDec(input.quantity),
              estimatedValueIqd: toDec(value),
              reason: input.reason,
              reasonNote: input.reasonNote ?? null,
              date: input.date,
              approvalStatus: 'PENDING',
              createdById: input.createdById ?? null,
            },
          },
        },
        include: { waste: true, lines: true },
      });
      await tx.inventoryBalance.update({
        where: { id: bal.id },
        data: { quantity: toDec(dec(bal.quantity) - input.quantity) },
      });
      return header;
    });
    return inv;
  }

  const ledger = await postTransaction({
    date: input.date,
    type: 'INVENTORY_WASTE',
    category: 'MATERIALS',
    amountOriginal: value > 0 ? value : 0.01,
    currency: 'IQD',
    houseId: input.houseId,
    description: `Waste ${txnNo}`,
    createdById: input.createdById,
    paymentMethod: 'OTHER',
    allowOverdraft: true,
  });

  const inv = await prisma.$transaction(async (tx) => {
    const header = await tx.inventoryTransaction.create({
      data: {
        txnNo,
        kind: 'WASTE',
        date: input.date,
        warehouseId: input.warehouseId,
        projectId,
        houseId: input.houseId ?? null,
        reason: input.reason,
        note: input.reasonNote ?? null,
        totalCostIqd: toDec(value),
        ledgerTxnId: ledger.id,
        createdById: input.createdById ?? null,
        lines: {
          create: [
            {
              materialId: input.materialId,
              quantity: toDec(input.quantity),
              unitCostIqd: toDec(unit),
              totalCostIqd: toDec(value),
            },
          ],
        },
        waste: {
          create: {
            materialId: input.materialId,
            projectId,
            quantity: toDec(input.quantity),
            estimatedValueIqd: toDec(value),
            reason: input.reason,
            reasonNote: input.reasonNote ?? null,
            date: input.date,
            approvalStatus: 'NOT_REQUIRED',
            createdById: input.createdById ?? null,
          },
        },
      },
      include: { waste: true, lines: true },
    });
    await tx.inventoryBalance.update({
      where: { id: bal.id },
      data: { quantity: toDec(dec(bal.quantity) - input.quantity) },
    });
    return header;
  });

  if (input.houseId) {
    await checkBudgetAlert(input.houseId, input.createdById, input.createdByName);
  }

  return inv;
}

export async function approveWaste(input: {
  wasteId: string;
  approverId: string;
  approverName: string;
  approve: boolean;
}) {
  const waste = await prisma.materialWaste.findUniqueOrThrow({
    where: { id: input.wasteId },
    include: { inventoryTxn: true },
  });
  if (waste.approvalStatus !== 'PENDING') throw new Error('NOT_PENDING');

  if (!input.approve) {
    // Restore stock
    const line = await prisma.inventoryTxnLine.findFirst({
      where: { transactionId: waste.inventoryTxnId },
    });
    if (line && waste.inventoryTxn.warehouseId) {
      const bal = await getOrCreateBalance(line.materialId, waste.inventoryTxn.warehouseId);
      await prisma.inventoryBalance.update({
        where: { id: bal.id },
        data: { quantity: toDec(dec(bal.quantity) + dec(line.quantity)) },
      });
    }
    return prisma.materialWaste.update({
      where: { id: waste.id },
      data: {
        approvalStatus: 'REJECTED',
        approvedById: input.approverId,
        approvedAt: new Date(),
      },
    });
  }

  const value = dec(waste.estimatedValueIqd);
  const ledger = await postTransaction({
    date: waste.date,
    type: 'INVENTORY_WASTE',
    category: 'MATERIALS',
    amountOriginal: value > 0 ? value : 0.01,
    currency: 'IQD',
    houseId: waste.inventoryTxn.houseId,
    description: `Waste approved ${waste.inventoryTxn.txnNo}`,
    createdById: input.approverId,
    paymentMethod: 'OTHER',
    allowOverdraft: true,
  });

  await prisma.inventoryTransaction.update({
    where: { id: waste.inventoryTxnId },
    data: { ledgerTxnId: ledger.id },
  });

  const updated = await prisma.materialWaste.update({
    where: { id: waste.id },
    data: {
      approvalStatus: 'APPROVED',
      approvedById: input.approverId,
      approvedAt: new Date(),
    },
  });

  if (waste.inventoryTxn.houseId) {
    await checkBudgetAlert(waste.inventoryTxn.houseId, input.approverId, input.approverName);
  }

  await logActivity({
    userId: input.approverId,
    userName: input.approverName,
    action: 'APPROVE_WASTE',
    amountIqd: value,
    meta: waste.id,
  });

  return updated;
}

export const DEFAULT_MATERIAL_CATEGORIES: { code: string; name: string; nameKu: string }[] = [
  { code: 'CEMENT', name: 'Cement', nameKu: 'چیمەنتۆ' },
  { code: 'GYPSUM', name: 'Gypsum', nameKu: 'جەبس' },
  { code: 'STEEL', name: 'Steel / Rebar', nameKu: 'ئاسن' },
  { code: 'BRICKS', name: 'Bricks', nameKu: 'خشت' },
  { code: 'SAND', name: 'Sand', nameKu: 'لم' },
  { code: 'GRAVEL', name: 'Gravel', nameKu: 'چەو' },
  { code: 'CONCRETE', name: 'Concrete', nameKu: 'کۆنکرێت' },
  { code: 'BLOCKS', name: 'Blocks', nameKu: 'بلۆک' },
  { code: 'TILES', name: 'Tiles', nameKu: 'کاشی' },
  { code: 'CERAMIC', name: 'Ceramic', nameKu: 'سیرامیک' },
  { code: 'MARBLE', name: 'Marble', nameKu: 'مەڕمەر' },
  { code: 'DOORS', name: 'Doors', nameKu: 'دەرگا' },
  { code: 'WINDOWS', name: 'Windows', nameKu: 'پەنجەرە' },
  { code: 'WOOD', name: 'Wood', nameKu: 'دار' },
  { code: 'PAINT', name: 'Paint', nameKu: 'بۆیە' },
  { code: 'ELECTRICAL', name: 'Electrical', nameKu: 'کارەبا' },
  { code: 'PLUMBING', name: 'Plumbing', nameKu: 'ئاو / بۆری' },
  { code: 'LIGHTING', name: 'Lighting', nameKu: 'ڕووناکی' },
  { code: 'HVAC', name: 'HVAC', nameKu: 'ساردکەرەوە' },
  { code: 'SOLAR', name: 'Solar', nameKu: 'خۆرەبا' },
  { code: 'SECURITY', name: 'Security cameras', nameKu: 'کامێرای چاودێری' },
  { code: 'OTHER', name: 'Other', nameKu: 'هیتر' },
];

export async function seedMaterialCatalog() {
  for (const [i, c] of DEFAULT_MATERIAL_CATEGORIES.entries()) {
    await prisma.materialCategory.upsert({
      where: { code: c.code },
      create: { code: c.code, name: c.name, nameKu: c.nameKu, sortOrder: i },
      update: { name: c.name, nameKu: c.nameKu, sortOrder: i },
    });
  }
  const wh = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    create: { code: 'WH-MAIN', name: 'Main Warehouse', location: 'Office' },
    update: { isActive: true },
  });
  await ensureFinanceConfig();
  return { warehouse: wh };
}
