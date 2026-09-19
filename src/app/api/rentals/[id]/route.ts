import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/access/permissions';
import { requireApiPermission } from '@/lib/api-auth';
import { fixedRentalClausesPlainText } from '@/lib/contracts/rental-clauses';
import { computeRentDue } from '@/lib/rentals/due';
import { resolveDealEmployee } from '@/lib/deals/employee';

function parseDateOnly(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

const scheduleItemSchema = z.object({
  dueDate: z.string(),
  amountIqd: z.number().positive(),
  label: z.string(),
});

const updateSchema = z.object({
  propertyCode: z.string().min(1).optional(),
  propertyName: z.string().optional().nullable(),
  landlordName: z.string().optional().nullable(),
  landlordPhone: z.string().optional().nullable(),
  tenantName: z.string().min(1).optional(),
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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  durationMonths: z.number().int().positive().optional().nullable(),
  signingDate: z.string().optional().nullable(),
  currency: z.enum(['IQD', 'USD']).optional(),
  exchangeRate: z.number().positive().optional(),
  monthlyRentIqd: z.number().positive().optional(),
  advancePaymentIqd: z.number().min(0).optional(),
  securityDepositIqd: z.number().min(0).optional(),
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
  paymentSchedule: z.array(scheduleItemSchema).optional().nullable(),
  depositStatus: z.enum(['HELD', 'PARTIAL_RETURNED', 'RETURNED', 'FORFEITED']).optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('VIEW_RENTALS');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const lease = await prisma.lease.findUnique({
    where: { id },
    include: { rentPayments: { select: { periodLabel: true, paidAt: true, amountIqd: true } } },
  });
  if (!lease) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  const due = computeRentDue(lease, lease.rentPayments);
  return NextResponse.json({ lease: { ...lease, ...due } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('MANAGE_RENTALS');
  if ('error' in auth) return auth.error;
  const { session } = auth;

  const { id } = await params;
  const existing = await prisma.lease.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  try {
    const data = updateSchema.parse(await req.json());
    const propertyCode = (data.propertyCode ?? existing.propertyCode).toUpperCase().trim();

    let houseId = existing.houseId;
    if (data.propertyCode != null && data.propertyCode.toUpperCase().trim() !== existing.propertyCode) {
      const house = await prisma.house.findUnique({ where: { code: propertyCode } });
      houseId = house?.id ?? null;
    }

    const landlordName = data.landlordName !== undefined ? data.landlordName : existing.landlordName;
    const tenantName = data.tenantName ?? existing.tenantName;
    const propertyType = data.propertyType ?? existing.propertyType;
    const propertyName =
      data.propertyName !== undefined ? data.propertyName : existing.propertyName;
    const areaSqm = data.areaSqm !== undefined ? data.areaSqm : existing.areaSqm;
    const monthlyRentIqd = data.monthlyRentIqd ?? existing.monthlyRentIqd;
    const advancePaymentIqd =
      data.advancePaymentIqd !== undefined ? data.advancePaymentIqd : existing.advancePaymentIqd;
    const securityDepositIqd =
      data.securityDepositIqd !== undefined ? data.securityDepositIqd : existing.securityDepositIqd;
    const commissionLandlordIqd =
      data.commissionLandlordIqd !== undefined
        ? data.commissionLandlordIqd
        : existing.commissionLandlordIqd;
    const commissionTenantIqd =
      data.commissionTenantIqd !== undefined
        ? data.commissionTenantIqd
        : existing.commissionTenantIqd;
    const dailyPenaltyIqd =
      data.dailyPenaltyIqd !== undefined ? data.dailyPenaltyIqd : existing.dailyPenaltyIqd;
    const cancelFeeIqd =
      data.cancelFeeIqd !== undefined ? data.cancelFeeIqd : existing.cancelFeeIqd;
    const durationMonths =
      data.durationMonths !== undefined ? data.durationMonths : existing.durationMonths;
    const startDate = data.startDate ? parseDateOnly(data.startDate) : existing.startDate;
    const endDate = data.endDate ? parseDateOnly(data.endDate) : existing.endDate;
    const signingDate =
      data.signingDate === null
        ? null
        : data.signingDate
          ? parseDateOnly(data.signingDate)
          : existing.signingDate;
    const organizerName =
      data.organizerName !== undefined
        ? data.organizerName
        : existing.organizerName ?? 'Road Home ZMKH Real Estate';

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

    const legalSnapshot = fixedRentalClausesPlainText({
      landlordName: landlordName ?? '',
      tenantName,
      propertyType,
      propertyCode,
      propertyName: propertyName ?? propertyCode,
      areaSqm: areaSqm != null ? String(areaSqm) : '',
      monthlyRent: String(monthlyRentIqd),
      advancePayment: String(advancePaymentIqd),
      securityDeposit: String(securityDepositIqd),
      commissionLandlord: String(commissionLandlordIqd),
      commissionTenant: String(commissionTenantIqd),
      dailyPenalty: String(dailyPenaltyIqd),
      cancelFee: String(cancelFeeIqd),
      durationMonths: durationMonths != null ? String(durationMonths) : '',
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      signingDate: (signingDate ?? startDate).toISOString().slice(0, 10),
      organizerName: organizerName ?? 'Road Home ZMKH Real Estate',
    });

    const userNotes =
      data.notes !== undefined
        ? data.notes
        : (() => {
            if (!existing.notes) return null;
            const idx = existing.notes.indexOf('\n---\n');
            if (idx >= 0) return existing.notes.slice(0, idx).trim() || null;
            if (existing.notes.startsWith('بەندی')) return null;
            return existing.notes;
          })();

    const depositIqd = securityDepositIqd;
    const lease = await prisma.lease.update({
      where: { id },
      data: {
        propertyCode,
        propertyName: propertyName ?? null,
        landlordName: landlordName ?? null,
        landlordPhone:
          data.landlordPhone !== undefined ? data.landlordPhone : existing.landlordPhone,
        tenantName,
        tenantPhone: data.tenantPhone !== undefined ? data.tenantPhone : existing.tenantPhone,
        witness1Name:
          data.witness1Name !== undefined ? data.witness1Name : existing.witness1Name,
        witness1Phone:
          data.witness1Phone !== undefined ? data.witness1Phone : existing.witness1Phone,
        witness2Name:
          data.witness2Name !== undefined ? data.witness2Name : existing.witness2Name,
        witness2Phone:
          data.witness2Phone !== undefined ? data.witness2Phone : existing.witness2Phone,
        guarantorName:
          data.guarantorName !== undefined ? data.guarantorName : existing.guarantorName,
        guarantorPhone:
          data.guarantorPhone !== undefined ? data.guarantorPhone : existing.guarantorPhone,
        propertyType,
        areaSqm: areaSqm ?? null,
        rentPurpose: data.rentPurpose !== undefined ? data.rentPurpose : existing.rentPurpose,
        startDate,
        endDate,
        durationMonths: durationMonths ?? null,
        signingDate,
        currency: data.currency ?? existing.currency,
        exchangeRate: data.exchangeRate ?? existing.exchangeRate,
        monthlyRentIqd,
        advancePaymentIqd,
        securityDepositIqd: depositIqd,
        dailyPenaltyIqd,
        cancelFeeIqd,
        lateFeeIqd: data.lateFeeIqd !== undefined ? data.lateFeeIqd : existing.lateFeeIqd,
        commissionTenantIqd,
        commissionLandlordIqd,
        depositStatus:
          data.depositStatus ??
          (depositIqd > 0 && existing.depositStatus === 'RETURNED'
            ? 'HELD'
            : existing.depositStatus),
        status: data.status ?? existing.status,
        propertyStatusNote:
          data.propertyStatusNote !== undefined
            ? data.propertyStatusNote
            : existing.propertyStatusNote,
        notes: [userNotes, '---', legalSnapshot].filter(Boolean).join('\n') || null,
        staffNote: data.staffNote !== undefined ? data.staffNote : existing.staffNote,
        organizerName,
        showOrganizer: data.showOrganizer ?? existing.showOrganizer,
        dealEmployeeId,
        dealEmployeeName,
        paymentSchedule:
          data.paymentSchedule !== undefined
            ? data.paymentSchedule
              ? JSON.stringify(data.paymentSchedule)
              : null
            : existing.paymentSchedule,
        houseId,
      },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'UPDATE_LEASE',
      projectCode: lease.propertyCode,
      amountIqd: lease.monthlyRentIqd,
      meta: lease.leaseNo,
    });

    return NextResponse.json({ lease });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
