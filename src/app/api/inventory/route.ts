import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/access/permissions';
import { prisma } from '@/lib/prisma';
import {
  approveWaste,
  issueToProject,
  purchaseIntoStock,
  recordWaste,
  seedMaterialCatalog,
  dec,
} from '@/lib/construction';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await hasPermission(session.id, session.role, 'VIEW_INVENTORY');
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const url = new URL(req.url);
  const section = url.searchParams.get('section') || 'overview';

  if (section === 'seed') {
    const manage = await hasPermission(session.id, session.role, 'MANAGE_INVENTORY');
    if (!manage) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    const result = await seedMaterialCatalog();
    return NextResponse.json(result);
  }

  if (section === 'materials') {
    const materials = await prisma.material.findMany({
      where: { isActive: true },
      include: {
        category: true,
        balances: { include: { warehouse: true } },
        defaultSupplier: { select: { id: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json({
      materials: materials.map((m) => ({
        ...m,
        avgCostIqd: dec(m.avgCostIqd),
        minStock: dec(m.minStock),
        balances: m.balances.map((b) => ({
          ...b,
          quantity: dec(b.quantity),
        })),
      })),
    });
  }

  if (section === 'warehouses') {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json({ warehouses });
  }

  if (section === 'categories') {
    await seedMaterialCatalog();
    const categories = await prisma.materialCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json({ categories });
  }

  if (section === 'waste') {
    const wastes = await prisma.materialWaste.findMany({
      include: {
        material: true,
        project: { include: { house: { select: { code: true, name: true } } } },
        inventoryTxn: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({
      wastes: wastes.map((w) => ({
        ...w,
        quantity: dec(w.quantity),
        estimatedValueIqd: dec(w.estimatedValueIqd),
      })),
    });
  }

  if (section === 'txns') {
    const txns = await prisma.inventoryTransaction.findMany({
      include: {
        lines: { include: { material: true } },
        warehouse: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({
      txns: txns.map((t) => ({
        ...t,
        totalCostIqd: dec(t.totalCostIqd),
        lines: t.lines.map((l) => ({
          ...l,
          quantity: dec(l.quantity),
          unitCostIqd: dec(l.unitCostIqd),
          totalCostIqd: dec(l.totalCostIqd),
        })),
      })),
    });
  }

  const [materials, warehouses, categories, lowStock] = await Promise.all([
    prisma.material.count({ where: { isActive: true } }),
    prisma.warehouse.findMany({ where: { isActive: true } }),
    prisma.materialCategory.count(),
    prisma.inventoryBalance.findMany({
      include: { material: true, warehouse: true },
      take: 200,
    }),
  ]);

  const low = lowStock
    .filter((b) => dec(b.quantity) <= dec(b.material.minStock))
    .map((b) => ({
      materialCode: b.material.code,
      materialName: b.material.name,
      warehouse: b.warehouse.name,
      quantity: dec(b.quantity),
      minStock: dec(b.material.minStock),
    }));

  return NextResponse.json({
    counts: { materials, warehouses: warehouses.length, categories },
    warehouses,
    lowStock: low,
  });
}

const materialSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  nameKu: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  unit: z
    .enum(['KG', 'TON', 'BAG', 'M3', 'M2', 'M', 'PCS', 'LITER', 'SET', 'OTHER'])
    .default('PCS'),
  minStock: z.number().min(0).default(0),
  avgCostIqd: z.number().min(0).default(0),
  defaultSupplierId: z.string().optional().nullable(),
});

const purchaseSchema = z.object({
  kind: z.literal('purchase'),
  date: z.string(),
  warehouseId: z.string(),
  supplierId: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'BANK', 'CREDIT']),
  cashAccountId: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        materialId: z.string(),
        quantity: z.number().positive(),
        unitCostIqd: z.number().min(0),
      }),
    )
    .min(1),
});

const issueSchema = z.object({
  kind: z.literal('issue'),
  date: z.string(),
  warehouseId: z.string(),
  houseId: z.string(),
  employeeUserId: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  lines: z
    .array(z.object({ materialId: z.string(), quantity: z.number().positive() }))
    .min(1),
});

const wasteSchema = z.object({
  kind: z.literal('waste'),
  date: z.string(),
  warehouseId: z.string(),
  materialId: z.string(),
  quantity: z.number().positive(),
  reason: z.enum([
    'DAMAGE',
    'CONSTRUCTION_WASTE',
    'INCORRECT_MEASUREMENT',
    'THEFT_LOSS',
    'EXPIRED',
    'OTHER',
  ]),
  reasonNote: z.string().optional().nullable(),
  houseId: z.string().optional().nullable(),
});

const approveSchema = z.object({
  kind: z.literal('approveWaste'),
  wasteId: z.string(),
  approve: z.boolean(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const kind = body.kind as string;

    if (kind === 'material') {
      const ok = await hasPermission(session.id, session.role, 'MANAGE_INVENTORY');
      if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      const data = materialSchema.parse(body);
      const material = await prisma.material.create({
        data: {
          code: data.code.trim(),
          name: data.name.trim(),
          nameKu: data.nameKu ?? null,
          categoryId: data.categoryId,
          unit: data.unit,
          minStock: data.minStock,
          avgCostIqd: data.avgCostIqd,
          defaultSupplierId: data.defaultSupplierId ?? null,
        },
      });
      return NextResponse.json({ material }, { status: 201 });
    }

    if (kind === 'purchase') {
      const ok = await hasPermission(session.id, session.role, 'MANAGE_INVENTORY');
      if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      const data = purchaseSchema.parse(body);
      let cashAccountId = data.cashAccountId;
      if (data.paymentMethod === 'CASH' && !cashAccountId) {
        const cash = await prisma.cashAccount.findFirst({ where: { isActive: true } });
        cashAccountId = cash?.id ?? null;
      }
      const txn = await purchaseIntoStock({
        date: new Date(data.date),
        warehouseId: data.warehouseId,
        supplierId: data.supplierId,
        paymentMethod: data.paymentMethod,
        cashAccountId,
        bankAccountId: data.bankAccountId,
        lines: data.lines,
        note: data.note,
        createdById: session.id,
        createdByName: session.name,
      });
      return NextResponse.json({ txn }, { status: 201 });
    }

    if (kind === 'issue') {
      const ok = await hasPermission(session.id, session.role, 'ISSUE_MATERIALS');
      if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      const data = issueSchema.parse(body);
      const txn = await issueToProject({
        date: new Date(data.date),
        warehouseId: data.warehouseId,
        houseId: data.houseId,
        lines: data.lines,
        employeeUserId: data.employeeUserId,
        reason: data.reason,
        note: data.note,
        createdById: session.id,
        createdByName: session.name,
      });
      return NextResponse.json({ txn }, { status: 201 });
    }

    if (kind === 'waste') {
      const ok = await hasPermission(session.id, session.role, 'ISSUE_MATERIALS');
      if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      const data = wasteSchema.parse(body);
      const txn = await recordWaste({
        date: new Date(data.date),
        warehouseId: data.warehouseId,
        materialId: data.materialId,
        quantity: data.quantity,
        reason: data.reason,
        reasonNote: data.reasonNote,
        houseId: data.houseId,
        createdById: session.id,
        createdByName: session.name,
      });
      return NextResponse.json({ txn }, { status: 201 });
    }

    if (kind === 'approveWaste') {
      const ok = await hasPermission(session.id, session.role, 'APPROVE_WASTE');
      if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      const data = approveSchema.parse(body);
      const waste = await approveWaste({
        wasteId: data.wasteId,
        approverId: session.id,
        approverName: session.name,
        approve: data.approve,
      });
      return NextResponse.json({ waste });
    }

    return NextResponse.json({ error: 'UNKNOWN_KIND' }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'SERVER_ERROR';
    const status =
      message.startsWith('INSUFFICIENT_STOCK') ||
      message === 'LINES_REQUIRED' ||
      message === 'NOT_PENDING'
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
