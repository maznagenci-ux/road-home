import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getHouseFinancials, getVendorDebts } from '@/lib/finance/engine';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await params;
  const decoded = decodeURIComponent(code).toUpperCase();

  const house = await prisma.house.findUnique({
    where: { code: decoded },
    include: { property: true },
  });

  if (!house) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [financials, vendorDebts, vouchers] = await Promise.all([
    getHouseFinancials(house.id),
    getVendorDebts(house.id),
    prisma.voucher.findMany({
      where: { houseId: house.id },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    project: {
      id: house.id,
      code: house.code,
      name: house.name,
      location: house.location ?? house.property?.location ?? null,
      status: house.status,
      budgetIqd: house.budgetIqd,
      description: house.description,
      area: house.area,
      price: house.price,
    },
    financials,
    vendorDebts: vendorDebts.map((d) => ({
      id: d.id,
      voucherNo: d.voucherNo,
      partyName: d.partyName,
      category: d.category,
      amountIqd: d.amountIqd,
      outstanding: d.outstanding,
      dueDate: d.dueDate,
      alert: d.alert,
      exchangeRate: d.exchangeRate,
      amountUsd: d.amountUsd,
    })),
    expenses: vouchers
      .filter((v) => v.accountType === 'EXPENSE')
      .map((v) => ({
        id: v.id,
        voucherNo: v.voucherNo,
        category: v.category,
        partyName: v.partyName,
        amountIqd: v.amountIqd,
        amountUsd: v.amountUsd,
        exchangeRate: v.exchangeRate,
        exchangeLockedAt: v.exchangeLockedAt,
        paymentMethod: v.paymentMethod,
        status: v.status,
        note: v.note,
        attachmentUrl: v.attachmentUrl,
        createdAt: v.createdAt,
        unlockApprovedAt: v.unlockApprovedAt,
        staffName: v.createdBy?.name ?? null,
      })),
  });
}
