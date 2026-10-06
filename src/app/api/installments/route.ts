import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import { createVoucher } from '@/lib/finance/engine';
import {
  assertInstallmentInBranch,
  dealEmployeeBranchWhere,
} from '@/lib/access/branch-scope';

export async function GET() {
  const auth = await requireApiPermission('VIEW_CONTRACTS');
  if ('error' in auth) return auth.error;

  const branchFilter = dealEmployeeBranchWhere(auth.session);
  const items = await prisma.installment.findMany({
    where: branchFilter ? { contract: branchFilter } : undefined,
    orderBy: { dueDate: 'asc' },
    include: {
      contract: {
        select: {
          id: true,
          contractNo: true,
          title: true,
          buyerName: true,
          house: { select: { code: true } },
        },
      },
    },
    take: 300,
  });

  return NextResponse.json({ items });
}

const patchSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']),
});

export async function PATCH(req: Request) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;
  try {
    const body = await req.json();
    const id = z.string().min(1).parse(body.id);
    const data = patchSchema.parse(body);

    const ok = await assertInstallmentInBranch(auth.session, id);
    if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const existing = await prisma.installment.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            houseId: true,
            buyerName: true,
            customerId: true,
            exchangeRate: true,
            contractNo: true,
          },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const item = await prisma.installment.update({
      where: { id },
      data: {
        status: data.status,
        paidDate: data.status === 'PAID' ? new Date() : null,
      },
    });

    // Ledger posts only when newly marking PAID (idempotent note check)
    if (
      data.status === 'PAID' &&
      existing.status !== 'PAID' &&
      existing.amount > 0
    ) {
      const note = `Installment payment — ${existing.contract.contractNo} — ${existing.id}`;
      const already = await prisma.voucher.findFirst({
        where: {
          note,
          status: 'POSTED',
          accountType: 'BUYER_PAYMENT',
        },
        select: { id: true },
      });
      if (!already) {
        // Prefer linked house; otherwise post as receivable without blocking payment status
        try {
          await createVoucher({
            houseId: existing.contract.houseId,
            accountType: 'BUYER_PAYMENT',
            amountIqd: existing.amount,
            exchangeRate: existing.contract.exchangeRate || 150000,
            paymentMethod: 'CASH_VAULT',
            partyName: existing.contract.buyerName?.trim() || 'Buyer',
            customerId: existing.contract.customerId,
            note,
            createdById: auth.session.id,
          });
        } catch (err) {
          // If house missing, still keep installment PAID — surface via log
          console.error('installment voucher', err);
        }
      }
    }

    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
