import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toIqd, toUsd } from '@/lib/contracts/templates';
import { logActivity } from '@/lib/access/permissions';
import { requireApiPermission } from '@/lib/api-auth';
import { BRAND_NAME } from '@/lib/brand';
import { resolveDealEmployee } from '@/lib/deals/employee';

function parseDateOnly(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

function optDate(value?: string | null) {
  if (value === undefined) return undefined;
  if (!value?.trim()) return null;
  return parseDateOnly(value);
}

const updateSchema = z.object({
  kind: z.enum(['SALE', 'PURCHASE']).optional(),
  propertyType: z.enum(['HOUSE', 'APARTMENT', 'LAND', 'SHOP', 'BUILDING']).optional(),
  title: z.string().min(1).optional(),
  tapuCode: z.string().optional().nullable(),
  buyerName: z.string().min(1).optional(),
  buyerPhone: z.string().optional().nullable(),
  buyerIdNo: z.string().optional().nullable(),
  sellerName: z.string().min(1).optional(),
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
  currency: z.enum(['IQD', 'USD']).optional(),
  exchangeRate: z.number().positive().optional(),
  totalAmount: z.number().positive().optional(),
  downPayment: z.number().min(0).optional(),
  downPaymentHeld: z.boolean().optional(),
  cancelFee: z.number().min(0).optional(),
  dailyPenalty: z.number().min(0).optional(),
  commissionSeller: z.number().min(0).optional(),
  commissionBuyer: z.number().min(0).optional(),
  remainingDueDate: z.string().optional().nullable(),
  handoverDate: z.string().optional().nullable(),
  signingDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  staffNote: z.string().optional().nullable(),
  organizerName: z.string().optional().nullable(),
  showOrganizer: z.boolean().optional(),
  dealEmployeeId: z.string().optional().nullable(),
  isExternal: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
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
    .optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('VIEW_CONTRACTS');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      house: { select: { code: true, name: true, location: true } },
      installments: { orderBy: { dueDate: 'asc' } },
    },
  });
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ contract });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;
  const { session } = auth;

  const { id } = await params;
  const existing = await prisma.contract.findUnique({
    where: { id },
    include: { installments: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const data = updateSchema.parse(await req.json());

    let houseId = existing.houseId;
    if (data.houseCode !== undefined) {
      if (data.houseCode) {
        const house = await prisma.house.findUnique({
          where: { code: data.houseCode.toUpperCase() },
        });
        houseId = house?.id ?? null;
      } else {
        houseId = null;
      }
    }

    const currency = data.currency ?? existing.currency;
    const rate = data.exchangeRate ?? existing.exchangeRate;
    const totalInput =
      data.totalAmount !== undefined
        ? data.totalAmount
        : currency === 'USD'
          ? existing.totalAmountUsd
          : existing.totalAmount;
    const downInput =
      data.downPayment !== undefined
        ? data.downPayment
        : currency === 'USD'
          ? existing.downPaymentUsd
          : existing.downPayment;

    const totalIqd = toIqd(totalInput, currency, rate);
    const downIqd = toIqd(downInput, currency, rate);
    const totalUsd = toUsd(totalInput, currency, rate);
    const downUsd = toUsd(downInput, currency, rate);

    let dealEmployeeId = existing.dealEmployeeId;
    let dealEmployeeName = existing.dealEmployeeName;
    if (data.dealEmployeeId !== undefined) {
      const dealEmp = await resolveDealEmployee(data.dealEmployeeId);
      if ('error' in dealEmp) {
        return NextResponse.json({ error: 'DEAL_EMPLOYEE_NOT_FOUND' }, { status: 400 });
      }
      dealEmployeeId = dealEmp.dealEmployeeId;
      dealEmployeeName = dealEmp.dealEmployeeName;
    }
    const signing = optDate(data.signingDate);

    const contract = await prisma.$transaction(async (tx) => {
      if (data.installments) {
        await tx.installment.deleteMany({ where: { contractId: id } });
        if (data.installments.length > 0) {
          await tx.installment.createMany({
            data: data.installments.map((i) => ({
              contractId: id,
              amount: toIqd(i.amount, currency, rate),
              dueDate: parseDateOnly(i.dueDate),
              notes: i.notes ?? null,
              status: 'PENDING',
            })),
          });
        }
      }

      return tx.contract.update({
        where: { id },
        data: {
          kind: data.kind ?? existing.kind,
          propertyType: data.propertyType ?? existing.propertyType,
          title: data.title ?? existing.title,
          tapuCode: data.tapuCode !== undefined ? data.tapuCode : existing.tapuCode,
          buyerName: data.buyerName ?? existing.buyerName,
          buyerPhone: data.buyerPhone !== undefined ? data.buyerPhone : existing.buyerPhone,
          buyerIdNo: data.buyerIdNo !== undefined ? data.buyerIdNo : existing.buyerIdNo,
          sellerName: data.sellerName ?? existing.sellerName,
          sellerPhone: data.sellerPhone !== undefined ? data.sellerPhone : existing.sellerPhone,
          sellerIdNo: data.sellerIdNo !== undefined ? data.sellerIdNo : existing.sellerIdNo,
          witness1Name:
            data.witness1Name !== undefined ? data.witness1Name : existing.witness1Name,
          witness1Phone:
            data.witness1Phone !== undefined ? data.witness1Phone : existing.witness1Phone,
          witness1IdNo:
            data.witness1IdNo !== undefined ? data.witness1IdNo : existing.witness1IdNo,
          witness2Name:
            data.witness2Name !== undefined ? data.witness2Name : existing.witness2Name,
          witness2Phone:
            data.witness2Phone !== undefined ? data.witness2Phone : existing.witness2Phone,
          witness2IdNo:
            data.witness2IdNo !== undefined ? data.witness2IdNo : existing.witness2IdNo,
          guarantorName:
            data.guarantorName !== undefined ? data.guarantorName : existing.guarantorName,
          guarantorPhone:
            data.guarantorPhone !== undefined ? data.guarantorPhone : existing.guarantorPhone,
          lawyerName: data.lawyerName !== undefined ? data.lawyerName : existing.lawyerName,
          lawyerPhone: data.lawyerPhone !== undefined ? data.lawyerPhone : existing.lawyerPhone,
          areaSqm: data.areaSqm !== undefined ? data.areaSqm : existing.areaSqm,
          currency,
          exchangeRate: rate,
          totalAmount: totalIqd,
          totalAmountUsd: totalUsd,
          downPayment: downIqd,
          downPaymentUsd: downUsd,
          downPaymentHeld:
            data.downPaymentHeld !== undefined ? data.downPaymentHeld : existing.downPaymentHeld,
          cancelFeeIqd:
            data.cancelFee !== undefined
              ? toIqd(data.cancelFee, currency, rate)
              : existing.cancelFeeIqd,
          dailyPenaltyIqd:
            data.dailyPenalty !== undefined
              ? toIqd(data.dailyPenalty, currency, rate)
              : existing.dailyPenaltyIqd,
          commissionSellerIqd:
            data.commissionSeller !== undefined
              ? toIqd(data.commissionSeller, currency, rate)
              : existing.commissionSellerIqd,
          commissionBuyerIqd:
            data.commissionBuyer !== undefined
              ? toIqd(data.commissionBuyer, currency, rate)
              : existing.commissionBuyerIqd,
          remainingDueDate:
            data.remainingDueDate !== undefined
              ? optDate(data.remainingDueDate)!
              : existing.remainingDueDate,
          handoverDate:
            data.handoverDate !== undefined ? optDate(data.handoverDate)! : existing.handoverDate,
          signingDate: signing !== undefined ? signing : existing.signingDate,
          startDate: signing !== undefined ? signing : existing.startDate,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          staffNote: data.staffNote !== undefined ? data.staffNote : existing.staffNote,
          organizerName:
            data.organizerName !== undefined
              ? data.organizerName?.trim() || BRAND_NAME
              : existing.organizerName,
          showOrganizer:
            data.showOrganizer !== undefined ? data.showOrganizer : existing.showOrganizer,
          dealEmployeeId,
          dealEmployeeName,
          isExternal: data.isExternal !== undefined ? data.isExternal : existing.isExternal,
          status: data.status !== undefined ? data.status : existing.status,
          legalConditions:
            data.legalConditions !== undefined
              ? data.legalConditions
              : existing.legalConditions,
          description:
            data.description !== undefined ? data.description : existing.description,
          houseId,
        },
        include: {
          house: { select: { code: true, name: true, location: true } },
          installments: { orderBy: { dueDate: 'asc' } },
        },
      });
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'UPDATE_CONTRACT',
      projectCode: contract.house?.code ?? null,
      amountIqd: totalIqd,
      meta: `${contract.contractNo} · ${currency}`,
    });

    return NextResponse.json({ contract });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;
  const { session } = auth;
  const { id } = await params;

  const existing = await prisma.contract.findUnique({
    where: { id },
    include: { house: { select: { code: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  await prisma.contract.delete({ where: { id } });

  await logActivity({
    userId: session.id,
    userName: session.name,
    action: 'DELETE_CONTRACT',
    projectCode: existing.house?.code ?? null,
    amountIqd: null,
    meta: `${existing.contractNo} · ${existing.status}`,
  });

  return NextResponse.json({ ok: true });
}
