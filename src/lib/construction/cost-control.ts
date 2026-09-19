import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { EXPENSE_TYPES } from '@/lib/accounting/post';

export type BudgetThresholds = {
  warnPct: number;
  criticalPct: number;
  severePct: number;
};

export type WasteConfig = {
  approvalThresholdIqd: number;
};

export type FinanceConfigBundle = {
  budget: BudgetThresholds;
  waste: WasteConfig;
  progressGapPct: number;
};

export const DEFAULT_FINANCE_CONFIG: FinanceConfigBundle = {
  budget: { warnPct: 80, criticalPct: 100, severePct: 110 },
  waste: { approvalThresholdIqd: 500_000 },
  progressGapPct: 15,
};

const CONFIG_KEY = 'construction_finance';

export function dec(n: number | string | Prisma.Decimal): number {
  if (typeof n === 'number') return n;
  return Number(n);
}

export async function ensureFinanceConfig(): Promise<FinanceConfigBundle> {
  const row = await prisma.systemFinanceConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) {
    await prisma.systemFinanceConfig.create({
      data: { key: CONFIG_KEY, valueJson: JSON.stringify(DEFAULT_FINANCE_CONFIG) },
    });
    return DEFAULT_FINANCE_CONFIG;
  }
  try {
    const parsed = JSON.parse(row.valueJson) as Partial<FinanceConfigBundle>;
    return {
      budget: { ...DEFAULT_FINANCE_CONFIG.budget, ...parsed.budget },
      waste: { ...DEFAULT_FINANCE_CONFIG.waste, ...parsed.waste },
      progressGapPct: parsed.progressGapPct ?? DEFAULT_FINANCE_CONFIG.progressGapPct,
    };
  } catch {
    return DEFAULT_FINANCE_CONFIG;
  }
}

export async function updateFinanceConfig(
  patch: Partial<FinanceConfigBundle>,
): Promise<FinanceConfigBundle> {
  const current = await ensureFinanceConfig();
  const next: FinanceConfigBundle = {
    budget: { ...current.budget, ...patch.budget },
    waste: { ...current.waste, ...patch.waste },
    progressGapPct: patch.progressGapPct ?? current.progressGapPct,
  };
  await prisma.systemFinanceConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, valueJson: JSON.stringify(next) },
    update: { valueJson: JSON.stringify(next) },
  });
  return next;
}

/** Ensure ConstructionProject exists for a house; sync initial budget from House.budgetIqd */
export async function ensureConstructionProject(houseId: string) {
  const existing = await prisma.constructionProject.findUnique({
    where: { houseId },
    include: { budgets: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
  });
  if (existing) {
    if (existing.budgets.length === 0) {
      const house = await prisma.house.findUniqueOrThrow({ where: { id: houseId } });
      await prisma.projectBudget.create({
        data: {
          projectId: existing.id,
          originalIqd: house.budgetIqd,
          revisedIqd: house.budgetIqd,
        },
      });
      return prisma.constructionProject.findUniqueOrThrow({
        where: { id: existing.id },
        include: { budgets: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
      });
    }
    return existing;
  }

  const house = await prisma.house.findUniqueOrThrow({ where: { id: houseId } });
  return prisma.constructionProject.create({
    data: {
      houseId,
      budgets: {
        create: {
          originalIqd: house.budgetIqd,
          revisedIqd: house.budgetIqd,
        },
      },
    },
    include: { budgets: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
  });
}

export type CostControlSnapshot = {
  houseId: string;
  projectId: string;
  houseCode: string;
  houseName: string;
  originalBudgetIqd: number;
  revisedBudgetIqd: number;
  currentBudgetIqd: number;
  actualCostIqd: number;
  remainingBudgetIqd: number;
  budgetVarianceIqd: number;
  variancePct: number;
  forecastFinalCostIqd: number;
  alertLevel: 'ok' | 'warn' | 'critical' | 'severe';
  thresholds: BudgetThresholds;
};

export function computeVariance(actualCostIqd: number, currentBudgetIqd: number) {
  const budgetVarianceIqd = actualCostIqd - currentBudgetIqd;
  const variancePct =
    currentBudgetIqd > 0 ? (budgetVarianceIqd / currentBudgetIqd) * 100 : actualCostIqd > 0 ? 100 : 0;
  const remainingBudgetIqd = currentBudgetIqd - actualCostIqd;
  // Phase 1: no open commitments → forecast = actual (or budget if under and no spend path)
  const forecastFinalCostIqd = actualCostIqd;
  return { budgetVarianceIqd, variancePct, remainingBudgetIqd, forecastFinalCostIqd };
}

export function alertLevelFor(
  actualCostIqd: number,
  currentBudgetIqd: number,
  thresholds: BudgetThresholds,
): CostControlSnapshot['alertLevel'] {
  if (currentBudgetIqd <= 0) {
    return actualCostIqd > 0 ? 'critical' : 'ok';
  }
  const usedPct = (actualCostIqd / currentBudgetIqd) * 100;
  if (usedPct >= thresholds.severePct) return 'severe';
  if (usedPct >= thresholds.criticalPct) return 'critical';
  if (usedPct >= thresholds.warnPct) return 'warn';
  return 'ok';
}

/** Actual construction cost for a house = ledger EXPENSE_TYPES linked to house (incl. inventory issue/waste) */
export async function getHouseActualCostIqd(houseId: string): Promise<number> {
  const rows = await prisma.ledgerTransaction.findMany({
    where: {
      houseId,
      deletedAt: null,
      type: { in: EXPENSE_TYPES },
    },
    select: { amountBaseIqd: true, type: true },
  });
  // SUPPLIER_PAYMENT reduces AP — for project cost we want construction spend.
  // Count EXPENSE, INVENTORY_ISSUE, INVENTORY_WASTE, PROPERTY_PURCHASE; skip pure SUPPLIER_PAYMENT
  // and employee commission unless categorized as construction.
  return rows
    .filter((r) =>
      ['EXPENSE', 'INVENTORY_ISSUE', 'INVENTORY_WASTE', 'PROPERTY_PURCHASE', 'SALARY'].includes(
        r.type,
      ),
    )
    .reduce((s, r) => s + r.amountBaseIqd, 0);
}

export async function getCostControlForHouse(houseId: string): Promise<CostControlSnapshot> {
  const project = await ensureConstructionProject(houseId);
  const house = await prisma.house.findUniqueOrThrow({ where: { id: houseId } });
  const config = await ensureFinanceConfig();
  const latest =
    project.budgets[0] ??
    (await prisma.projectBudget.findFirst({
      where: { projectId: project.id },
      orderBy: { effectiveFrom: 'desc' },
    }));

  const originalBudgetIqd = latest ? dec(latest.originalIqd) : house.budgetIqd;
  const revisedBudgetIqd = latest ? dec(latest.revisedIqd) : house.budgetIqd;
  const currentBudgetIqd = revisedBudgetIqd;
  const actualCostIqd = await getHouseActualCostIqd(houseId);
  const { budgetVarianceIqd, variancePct, remainingBudgetIqd, forecastFinalCostIqd } =
    computeVariance(actualCostIqd, currentBudgetIqd);
  const level = alertLevelFor(actualCostIqd, currentBudgetIqd, config.budget);

  return {
    houseId,
    projectId: project.id,
    houseCode: house.code,
    houseName: house.name,
    originalBudgetIqd,
    revisedBudgetIqd,
    currentBudgetIqd,
    actualCostIqd,
    remainingBudgetIqd,
    budgetVarianceIqd,
    variancePct,
    forecastFinalCostIqd,
    alertLevel: level,
    thresholds: config.budget,
  };
}

export async function setProjectBudget(input: {
  houseId: string;
  originalIqd: number;
  revisedIqd: number;
  note?: string | null;
}) {
  const project = await ensureConstructionProject(input.houseId);
  const budget = await prisma.projectBudget.create({
    data: {
      projectId: project.id,
      originalIqd: input.originalIqd,
      revisedIqd: input.revisedIqd,
      note: input.note ?? null,
    },
  });
  // Keep House.budgetIqd in sync with revised for legacy UI
  await prisma.house.update({
    where: { id: input.houseId },
    data: { budgetIqd: input.revisedIqd },
  });
  return budget;
}
