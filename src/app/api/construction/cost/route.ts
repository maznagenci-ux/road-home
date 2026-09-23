import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/access/permissions';
import {
  ensureFinanceConfig,
  getCostControlForHouse,
  setProjectBudget,
  updateFinanceConfig,
} from '@/lib/construction/cost-control';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await hasPermission(session.id, session.role, 'VIEW_CONSTRUCTION_COST');
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const url = new URL(req.url);
  const houseId = url.searchParams.get('houseId');
  const code = url.searchParams.get('code');

  if (url.searchParams.get('config') === '1') {
    const config = await ensureFinanceConfig();
    return NextResponse.json({ config });
  }

  let id = houseId;
  if (!id && code) {
    const h = await prisma.house.findUnique({ where: { code } });
    if (!h) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    id = h.id;
  }
  if (!id) return NextResponse.json({ error: 'HOUSE_REQUIRED' }, { status: 400 });

  const cost = await getCostControlForHouse(id);
  return NextResponse.json({ cost });
}

const budgetSchema = z.object({
  houseId: z.string().min(1),
  originalIqd: z.number().min(0),
  revisedIqd: z.number().min(0),
  note: z.string().optional().nullable(),
});

const configSchema = z.object({
  budget: z
    .object({
      warnPct: z.number().positive().optional(),
      criticalPct: z.number().positive().optional(),
      severePct: z.number().positive().optional(),
    })
    .optional(),
  waste: z
    .object({
      approvalThresholdIqd: z.number().min(0).optional(),
    })
    .optional(),
  progressGapPct: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') || body.kind;

  if (kind === 'config') {
    const ok = await hasPermission(session.id, session.role, 'APPROVE_FINANCE');
    if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    const data = configSchema.parse(body);
    const config = await updateFinanceConfig({
      budget: data.budget
        ? {
            ...(data.budget.warnPct !== undefined ? { warnPct: data.budget.warnPct } : {}),
            ...(data.budget.criticalPct !== undefined
              ? { criticalPct: data.budget.criticalPct }
              : {}),
            ...(data.budget.severePct !== undefined ? { severePct: data.budget.severePct } : {}),
          }
        : undefined,
      waste: data.waste?.approvalThresholdIqd !== undefined
        ? { approvalThresholdIqd: data.waste.approvalThresholdIqd }
        : undefined,
      progressGapPct: data.progressGapPct,
    });
    return NextResponse.json({ config });
  }

  const ok = await hasPermission(session.id, session.role, 'MANAGE_PROJECT_BUDGET');
  if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const data = budgetSchema.parse(body);
  const budget = await setProjectBudget(data);
  const cost = await getCostControlForHouse(data.houseId);
  return NextResponse.json({ budget, cost }, { status: 201 });
}
