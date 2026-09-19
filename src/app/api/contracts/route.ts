import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { nextContractNo, toIqd, toUsd } from '@/lib/contracts/templates';
import { logActivity } from '@/lib/access/permissions';
import { requireApiPermission } from '@/lib/api-auth';
import { BRAND_NAME } from '@/lib/brand';
import { resolveDealEmployee } from '@/lib/deals/employee';

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_CONTRACTS');
  if ('error' in auth) return auth.error;

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope'); // internal | external | all
  const q = url.searchParams.get('q')?.trim() || '';
  const status = url.searchParams.get('status')?.trim() || '';
  const from = url.searchParams.get('from')?.trim() || '';
  const to = url.searchParams.get('to')?.trim() || '';

  const where: Record<string, unknown> = {};
  if (scope === 'external') where.isExternal = true;
  if (scope === 'internal') where.isExternal = false;
  if (status && ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
    where.status = status;
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { contractNo: { contains: q } },
      { title: { contains: q } },
      { buyerName: { contains: q } },
      { sellerName: { contains: q } },
      { house: { code: { contains: q } } },
      { house: { name: { contains: q } } },
      { customer: { name: { contains: q } } },
    ];
  }

  const rows = await prisma.contract.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      house: { select: { code: true, name: true } },
      customer: { select: { id: true, name: true } },
      installments: { select: { amount: true, status: true } },
    },
    take: 300,
  });

  const items = rows.map((r) => {
    const paid = r.installments.filter((i) => i.status === 'PAID');
    const pending = r.installments.filter(
      (i) => i.status !== 'PAID' && i.status !== 'CANCELLED',
    );
    return {
      id: r.id,
      contractNo: r.contractNo,
      title: r.title,
      propertyType: r.propertyType,
      buyerName: r.buyerName,
      sellerName: r.sellerName,
      customerId: r.customerId,
      customer: r.customer,
      currency: r.currency,
      totalAmount: r.totalAmount,
      totalAmountUsd: r.totalAmountUsd,
      status: r.status,
      isExternal: r.isExternal,
      createdAt: r.createdAt.toISOString(),
      house: r.house,
      installmentCount: r.installments.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, i) => s + i.amount, 0),
      paidAmount: paid.reduce((s, i) => s + i.amount, 0),
    };
  });

  return NextResponse.json({ items });
}

function optDate(value?: string | null) {
  if (!value?.trim()) return null;
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

const createSchema = z.object({
  kind: z.enum(['SALE', 'PURCHASE']).default('SALE'),
  propertyType: z.enum(['HOUSE', 'APARTMENT', 'LAND', 'SHOP', 'BUILDING']),
  title: z.string().min(1),
  tapuCode: z.string().optional().nullable(),
  buyerName: z.string().min(1),
  buyerPhone: z.string().optional().nullable(),
  buyerIdNo: z.string().optional().nullable(),
  sellerName: z.string().min(1),
  sellerPhone: z.string().optional().nullable(),
  sellerIdNo: z.string().optional().nullable(),
  witness1Name: z.string().optional().nullable(),
  witness1Phone: z.string().optional().nullable(),
  witness1IdNo: z.string().optional().nullable(),
  witness2Name: z.string().optional().nullable(),
  witness2Phone: z.string().optional().nullable(),
  witness2IdNo: z.string().optional().nullable(),
  guarantorName: z.string().optional().nullable(),
  guarantorPhone: z.string().optional().nullable(),
  lawyerName: z.string().optional().nullable(),
  lawyerPhone: z.string().optional().nullable(),
  houseCode: z.string().optional().nullable(),
  areaSqm: z.number().optional().nullable(),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  exchangeRate: z.number().positive().default(150_000),
  totalAmount: z.number().positive(),
  downPayment: z.number().min(0).default(0),
  downPaymentHeld: z.boolean().optional().default(true),
  cancelFee: z.number().min(0).optional().default(0),
  dailyPenalty: z.number().min(0).optional().default(0),
  commissionSeller: z.number().min(0).optional().default(0),
  commissionBuyer: z.number().min(0).optional().default(0),
  remainingDueDate: z.string().optional().nullable(),
  handoverDate: z.string().optional().nullable(),
  signingDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  staffNote: z.string().optional().nullable(),
  organizerName: z.string().optional().nullable(),
  showOrganizer: z.boolean().optional().default(true),
  dealEmployeeId: z.string().optional().nullable(),
  isExternal: z.boolean().optional().default(false),
  legalConditions: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  installments: z
    .array(
      z.object({
        amount: z.number().positive(),
        dueDate: z.string(),
        notes: z.string().optional().nullable(),
      }),
    )
    .default([]),
});

export async function POST(req: Request) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;
  const { session } = auth;

  try {
    const data = createSchema.parse(await req.json());
    let houseId: string | null = null;
    if (data.houseCode) {
      const house = await prisma.house.findUnique({
        where: { code: data.houseCode.toUpperCase() },
      });
      houseId = house?.id ?? null;
    }

    const rate = data.exchangeRate;
    const totalIqd = toIqd(data.totalAmount, data.currency, rate);
    const downIqd = toIqd(data.downPayment, data.currency, rate);
    const totalUsd = toUsd(data.totalAmount, data.currency, rate);
    const downUsd = toUsd(data.downPayment, data.currency, rate);
    const signing = optDate(data.signingDate);

    const dealEmp = await resolveDealEmployee(data.dealEmployeeId);
    if ('error' in dealEmp) {
      return NextResponse.json({ error: 'DEAL_EMPLOYEE_NOT_FOUND' }, { status: 400 });
    }

    const contractNo = await nextContractNo(prisma);
    const contract = await prisma.contract.create({
      data: {
        contractNo,
        title: data.title,
        kind: data.kind,
        propertyType: data.propertyType,
        tapuCode: data.tapuCode ?? null,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone ?? null,
        buyerIdNo: data.buyerIdNo ?? null,
        sellerName: data.sellerName,
        sellerPhone: data.sellerPhone ?? null,
        sellerIdNo: data.sellerIdNo ?? null,
        witness1Name: data.witness1Name ?? null,
        witness1Phone: data.witness1Phone ?? null,
        witness1IdNo: data.witness1IdNo ?? null,
        witness2Name: data.witness2Name ?? null,
        witness2Phone: data.witness2Phone ?? null,
        witness2IdNo: data.witness2IdNo ?? null,
        guarantorName: data.guarantorName ?? null,
        guarantorPhone: data.guarantorPhone ?? null,
        lawyerName: data.lawyerName ?? null,
        lawyerPhone: data.lawyerPhone ?? null,
        areaSqm: data.areaSqm ?? null,
        currency: data.currency,
        exchangeRate: rate,
        totalAmount: totalIqd,
        totalAmountUsd: totalUsd,
        downPayment: downIqd,
        downPaymentUsd: downUsd,
        downPaymentHeld: data.downPaymentHeld ?? true,
        cancelFeeIqd: toIqd(data.cancelFee ?? 0, data.currency, rate),
        dailyPenaltyIqd: toIqd(data.dailyPenalty ?? 0, data.currency, rate),
        commissionSellerIqd: toIqd(data.commissionSeller ?? 0, data.currency, rate),
        commissionBuyerIqd: toIqd(data.commissionBuyer ?? 0, data.currency, rate),
        remainingDueDate: optDate(data.remainingDueDate),
        handoverDate: optDate(data.handoverDate),
        signingDate: signing,
        startDate: signing,
        notes: data.notes ?? null,
        staffNote: data.staffNote ?? null,
        organizerName: data.organizerName?.trim() || BRAND_NAME,
        showOrganizer: data.showOrganizer ?? true,
        dealEmployeeId: dealEmp.dealEmployeeId,
        dealEmployeeName: dealEmp.dealEmployeeName,
        isExternal: data.isExternal ?? false,
        legalConditions: data.legalConditions ?? null,
        description: data.description ?? null,
        status: 'ACTIVE',
        houseId,
        installments: {
          create: data.installments.map((i) => ({
            amount: toIqd(i.amount, data.currency, rate),
            dueDate: new Date(i.dueDate.includes('T') ? i.dueDate : `${i.dueDate}T12:00:00.000Z`),
            notes: i.notes ?? null,
            status: 'PENDING',
          })),
        },
      },
      include: { installments: true, house: true },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'CREATE_CONTRACT',
      projectCode: data.houseCode?.toUpperCase() ?? null,
      amountIqd: totalIqd,
      meta: `${contractNo} · ${data.currency}`,
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
