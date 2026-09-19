import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { nextLeaseNo } from '@/lib/contracts/templates';
import { logActivity } from '@/lib/access/permissions';
import { requireApiPermission } from '@/lib/api-auth';
import { fixedRentalClausesPlainText } from '@/lib/contracts/rental-clauses';
import { computeRentDue } from '@/lib/rentals/due';
import { resolveDealEmployee } from '@/lib/deals/employee';

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_RENTALS');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get('tenant')?.trim();
  const code = searchParams.get('code')?.trim();
  const deposit = searchParams.get('deposit');
  const dueOnly = searchParams.get('due') === '1';

  const items = await prisma.lease.findMany({
    where: {
      AND: [
        tenant ? { tenantName: { contains: tenant } } : {},
        code ? { propertyCode: { contains: code.toUpperCase() } } : {},
        deposit
          ? { depositStatus: deposit as 'HELD' | 'PARTIAL_RETURNED' | 'RETURNED' | 'FORFEITED' }
          : {},
      ],
    },
    orderBy: { endDate: 'asc' },
    include: { rentPayments: { select: { periodLabel: true, paidAt: true, amountIqd: true } } },
  });

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let enriched = items.map((l) => {
    const end = new Date(l.endDate);
    const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const daysLeft = Math.round((endUtc - todayUtc) / (1000 * 60 * 60 * 24));
    const due = computeRentDue(l, l.rentPayments, now);
    return {
      ...l,
      daysLeft,
      expiringSoon: l.status === 'ACTIVE' && daysLeft >= 0 && daysLeft <= 30,
      expired: daysLeft < 0 || l.status === 'EXPIRED',
      ...due,
    };
  });

  if (dueOnly) {
    enriched = enriched.filter((l) => l.rentDue);
  }

  return NextResponse.json({ items: enriched });
}

const scheduleItemSchema = z.object({
  dueDate: z.string(),
  amountIqd: z.number().positive(),
  label: z.string(),
});

const createSchema = z.object({
  propertyCode: z.string().min(1),
  propertyName: z.string().optional().nullable(),
  landlordName: z.string().optional().nullable(),
  landlordPhone: z.string().optional().nullable(),
  tenantName: z.string().min(1),
  tenantPhone: z.string().optional().nullable(),
  witness1Name: z.string().optional().nullable(),
  witness1Phone: z.string().optional().nullable(),
  witness2Name: z.string().optional().nullable(),
  witness2Phone: z.string().optional().nullable(),
  guarantorName: z.string().optional().nullable(),
  guarantorPhone: z.string().optional().nullable(),
  propertyType: z.enum(['HOUSE', 'APARTMENT', 'LAND', 'SHOP', 'BUILDING']).optional(),
  areaSqm: z.number().nonnegative().optional().nullable(),
  rentPurpose: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  durationMonths: z.number().int().positive().optional().nullable(),
  signingDate: z.string().optional().nullable(),
  currency: z.enum(['IQD', 'USD']).optional(),
  exchangeRate: z.number().positive().optional(),
  monthlyRentIqd: z.number().positive(),
  advancePaymentIqd: z.number().min(0).optional(),
  securityDepositIqd: z.number().min(0).default(0),
  dailyPenaltyIqd: z.number().min(0).optional(),
  cancelFeeIqd: z.number().min(0).optional(),
  lateFeeIqd: z.number().min(0).optional(),
  commissionTenantIqd: z.number().min(0).optional(),
  commissionLandlordIqd: z.number().min(0).optional(),
  propertyStatusNote: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  staffNote: z.string().optional().nullable(),
  organizerName: z.string().optional().nullable(),
  showOrganizer: z.boolean().optional(),
  dealEmployeeId: z.string().optional().nullable(),
  paymentSchedule: z.array(scheduleItemSchema).optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiPermission('MANAGE_RENTALS');
  if ('error' in auth) return auth.error;
  const { session } = auth;

  try {
    const data = createSchema.parse(await req.json());
    const propertyCode = data.propertyCode.toUpperCase().trim();
    const house = await prisma.house.findUnique({
      where: { code: propertyCode },
    });

    const leaseNo = await nextLeaseNo(prisma);
    const dealEmp = await resolveDealEmployee(data.dealEmployeeId);
    if ('error' in dealEmp) {
      return NextResponse.json({ error: 'DEAL_EMPLOYEE_NOT_FOUND' }, { status: 400 });
    }

    const legalSnapshot = fixedRentalClausesPlainText({
      landlordName: data.landlordName ?? '',
      tenantName: data.tenantName,
      propertyType: data.propertyType ?? 'HOUSE',
      propertyCode,
      propertyName: data.propertyName ?? house?.name ?? propertyCode,
      areaSqm: data.areaSqm != null ? String(data.areaSqm) : '',
      monthlyRent: String(data.monthlyRentIqd),
      advancePayment: String(data.advancePaymentIqd ?? 0),
      securityDeposit: String(data.securityDepositIqd),
      commissionLandlord: String(data.commissionLandlordIqd ?? 0),
      commissionTenant: String(data.commissionTenantIqd ?? 0),
      dailyPenalty: String(data.dailyPenaltyIqd ?? 0),
      cancelFee: String(data.cancelFeeIqd ?? 0),
      durationMonths: data.durationMonths != null ? String(data.durationMonths) : '',
      startDate: data.startDate,
      endDate: data.endDate,
      signingDate: data.signingDate ?? data.startDate,
      organizerName: data.organizerName ?? 'Road Home ZMKH Real Estate',
    });

    const lease = await prisma.lease.create({
      data: {
        leaseNo,
        propertyCode,
        propertyName: data.propertyName ?? house?.name ?? null,
        landlordName: data.landlordName ?? null,
        landlordPhone: data.landlordPhone ?? null,
        tenantName: data.tenantName,
        tenantPhone: data.tenantPhone ?? null,
        witness1Name: data.witness1Name ?? null,
        witness1Phone: data.witness1Phone ?? null,
        witness2Name: data.witness2Name ?? null,
        witness2Phone: data.witness2Phone ?? null,
        guarantorName: data.guarantorName ?? null,
        guarantorPhone: data.guarantorPhone ?? null,
        propertyType: data.propertyType ?? 'HOUSE',
        areaSqm: data.areaSqm ?? null,
        rentPurpose: data.rentPurpose ?? null,
        startDate: new Date(`${data.startDate.slice(0, 10)}T12:00:00.000Z`),
        endDate: new Date(`${data.endDate.slice(0, 10)}T12:00:00.000Z`),
        durationMonths: data.durationMonths ?? null,
        signingDate: data.signingDate
          ? new Date(`${data.signingDate.slice(0, 10)}T12:00:00.000Z`)
          : null,
        currency: data.currency ?? 'IQD',
        exchangeRate: data.exchangeRate ?? 150000,
        monthlyRentIqd: data.monthlyRentIqd,
        advancePaymentIqd: data.advancePaymentIqd ?? 0,
        securityDepositIqd: data.securityDepositIqd,
        dailyPenaltyIqd: data.dailyPenaltyIqd ?? 0,
        cancelFeeIqd: data.cancelFeeIqd ?? 0,
        lateFeeIqd: data.lateFeeIqd ?? 0,
        commissionTenantIqd: data.commissionTenantIqd ?? 0,
        commissionLandlordIqd: data.commissionLandlordIqd ?? 0,
        depositStatus: data.securityDepositIqd > 0 ? 'HELD' : 'RETURNED',
        status: 'ACTIVE',
        propertyStatusNote: data.propertyStatusNote ?? null,
        notes: [data.notes, '---', legalSnapshot].filter(Boolean).join('\n') || null,
        staffNote: data.staffNote ?? null,
        organizerName: data.organizerName ?? 'Road Home ZMKH Real Estate',
        showOrganizer: data.showOrganizer ?? true,
        dealEmployeeId: dealEmp.dealEmployeeId,
        dealEmployeeName: dealEmp.dealEmployeeName,
        paymentSchedule: data.paymentSchedule ? JSON.stringify(data.paymentSchedule) : null,
        houseId: house?.id ?? null,
      },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'CREATE_LEASE',
      projectCode: lease.propertyCode,
      amountIqd: lease.monthlyRentIqd,
      meta: leaseNo,
    });

    return NextResponse.json({ lease }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
