import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  hasPermission,
  isSuperAdmin,
  isVoucherTimeLocked,
  logActivity,
} from '@/lib/access/permissions';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: { house: true },
  });
  if (!voucher) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const locked = isVoucherTimeLocked(voucher.createdAt, voucher.unlockApprovedAt);
  if (!locked) {
    return NextResponse.json({ error: 'NOT_LOCKED' }, { status: 400 });
  }

  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED' }, { status: 403 });
  }

  const canEdit = await hasPermission(session.id, session.role, 'EDIT_TRANSACTIONS');
  if (!canEdit) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const updated = await prisma.voucher.update({
    where: { id },
    data: {
      unlockApprovedAt: new Date(),
      unlockApprovedById: session.id,
    },
  });

  await logActivity({
    userId: session.id,
    userName: session.name,
    action: 'UNLOCK_VOUCHER',
    projectCode: voucher.house?.code ?? 'SYSTEM',
    amountIqd: voucher.amountIqd,
    meta: voucher.voucherNo,
  });

  return NextResponse.json({ voucher: updated });
}
