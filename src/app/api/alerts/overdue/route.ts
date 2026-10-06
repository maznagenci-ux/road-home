import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import { computeRentDue } from '@/lib/rentals/due';
import { formatCurrency } from '@/lib/utils';
import {
  installmentOverdueMessage,
  ownerMonthlyReportMessage,
  tenantRentDueMessage,
  whatsappUrl,
} from '@/lib/whatsapp';

/**
 * Overdue installments + rent dues with WhatsApp deep-links,
 * plus monthly owner report message/PDF URL.
 */
export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_REPORTS');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_RENTALS');
    if ('error' in alt) return alt.error;
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
  const month = Number(url.searchParams.get('month')) || new Date().getMonth() + 1;
  const xfProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const xfHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const origin =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    `${xfProto || url.protocol.replace(':', '')}://${xfHost || url.host}`;

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const overdueInstallments = await prisma.installment.findMany({
    where: {
      status: { in: ['PENDING', 'OVERDUE'] },
      dueDate: { lt: startOfToday },
    },
    include: {
      contract: {
        select: {
          contractNo: true,
          buyerName: true,
          buyerPhone: true,
          customer: { select: { name: true, phone: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 200,
  });

  const installmentAlerts = overdueInstallments.map((row) => {
    const name = row.contract.buyerName || row.contract.customer?.name || 'کڕیار';
    const phone = row.contract.buyerPhone || row.contract.customer?.phone || null;
    const amountLabel = formatCurrency(row.amount, 'ckb', 'IQD');
    const due = row.dueDate.toISOString().slice(0, 10);
    const message = installmentOverdueMessage({
      partyName: name,
      amountLabel,
      contractNo: row.contract.contractNo,
      dueDate: due,
    });
    return {
      kind: 'installment' as const,
      id: row.id,
      ref: row.contract.contractNo,
      partyName: name,
      phone,
      amount: row.amount,
      dueDate: due,
      whatsapp: whatsappUrl(phone, message),
      message,
    };
  });

  const leases = await prisma.lease.findMany({
    where: { status: 'ACTIVE' },
    include: { rentPayments: { select: { periodLabel: true, paidAt: true, amountIqd: true } } },
    take: 500,
  });

  const rentAlerts = leases.flatMap((l) => {
    const due = computeRentDue(l, l.rentPayments, now);
    if (!due.rentDue && !due.overdue) return [];
    const amountLabel = formatCurrency(due.nextDueAmountIqd || l.monthlyRentIqd, 'ckb', 'IQD');
    const message = tenantRentDueMessage({
      tenantName: l.tenantName,
      amountLabel,
      propertyCode: l.propertyCode,
      period: due.nextDueLabel || due.periodLabel,
    });
    return [
      {
        kind: 'rent' as const,
        id: l.id,
        ref: l.leaseNo,
        partyName: l.tenantName,
        phone: l.tenantPhone,
        amount: due.nextDueAmountIqd || l.monthlyRentIqd,
        dueDate: due.nextDueDate,
        whatsapp: whatsappUrl(l.tenantPhone, message),
        message,
      },
    ];
  });

  const monthlyPdfUrl = `${origin.replace(/\/$/, '')}/api/pdf/report/monthly?year=${year}&month=${month}&locale=ckb&print=1`;
  const ownerMessage = ownerMonthlyReportMessage({ year, month, pdfUrl: monthlyPdfUrl });

  return NextResponse.json({
    generatedAt: now.toISOString(),
    counts: {
      installments: installmentAlerts.length,
      rents: rentAlerts.length,
    },
    installments: installmentAlerts,
    rents: rentAlerts,
    monthlyOwner: {
      year,
      month,
      pdfUrl: monthlyPdfUrl,
      message: ownerMessage,
    },
  });
}
