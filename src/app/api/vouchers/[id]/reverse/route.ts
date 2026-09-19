import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { reverseVoucher } from '@/lib/finance/engine';
import {
  hasPermission,
  isVoucherTimeLocked,
  logActivity,
} from '@/lib/access/permissions';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await hasPermission(session.id, session.role, 'REVERSE_VOUCHERS');
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const { id } = await params;
  const original = await prisma.voucher.findUnique({
    where: { id },
    include: { house: true },
  });
  if (!original) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  if (isVoucherTimeLocked(original.createdAt, original.unlockApprovedAt)) {
    return NextResponse.json(
      { error: 'VOUCHER_LOCKED', message: 'Requires Super Admin unlock after 12 hours.' },
      { status: 423 },
    );
  }

  try {
    const reversal = await reverseVoucher(id, session.id);
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'REVERSE_VOUCHER',
      projectCode: original.house.code,
      amountIqd: original.amountIqd,
      meta: original.voucherNo,
    });
    return NextResponse.json({ reversal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SERVER_ERROR';
    const status =
      message === 'NOT_FOUND'
        ? 404
        : message === 'ALREADY_REVERSED' || message === 'CANNOT_REVERSE_REVERSAL'
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'DELETION_FORBIDDEN', message: 'Use reversal vouchers instead of deleting.' },
    { status: 405 },
  );
}
