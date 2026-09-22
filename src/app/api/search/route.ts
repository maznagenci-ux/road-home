import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiSession } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireApiSession();
  if ('error' in auth) return auth.error;

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) {
    return NextResponse.json({ items: [] });
  }

  const [houses, owners, customers, suppliers, contracts, leases, users, receipts, ankets, vouchers, ledgerTxns] =
    await Promise.all([
      prisma.house.findMany({
        where: {
          OR: [
            { code: { contains: q } },
            { name: { contains: q } },
            { location: { contains: q } },
          ],
        },
        take: 6,
        select: { id: true, code: true, name: true },
      }),
      prisma.owner.findMany({
        where: { OR: [{ name: { contains: q } }, { phone: { contains: q } }] },
        take: 5,
        select: { id: true, name: true, phone: true },
      }),
      prisma.customer.findMany({
        where: { OR: [{ name: { contains: q } }, { phone: { contains: q } }] },
        take: 5,
        select: { id: true, name: true, phone: true },
      }),
      prisma.supplier.findMany({
        where: { OR: [{ name: { contains: q } }, { phone: { contains: q } }] },
        take: 5,
        select: { id: true, name: true, phone: true },
      }),
      prisma.contract.findMany({
        where: {
          OR: [
            { contractNo: { contains: q } },
            { title: { contains: q } },
            { buyerName: { contains: q } },
            { sellerName: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, contractNo: true, title: true },
      }),
      prisma.lease.findMany({
        where: {
          OR: [
            { leaseNo: { contains: q } },
            { tenantName: { contains: q } },
            { propertyCode: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, leaseNo: true, tenantName: true, propertyCode: true },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          OR: [{ name: { contains: q } }, { phone: { contains: q } }],
        },
        take: 5,
        select: { id: true, name: true, phone: true },
      }),
      prisma.receipt.findMany({
        where: {
          OR: [{ receiptNo: { contains: q } }, { partyName: { contains: q } }],
        },
        take: 5,
        select: { id: true, receiptNo: true, partyName: true },
      }),
      prisma.anket.findMany({
        where: {
          OR: [
            { anketNo: { contains: q } },
            { party1Name: { contains: q } },
            { party2Name: { contains: q } },
            { projectName: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, anketNo: true, projectName: true },
      }),
      prisma.voucher.findMany({
        where: {
          OR: [{ voucherNo: { contains: q } }, { partyName: { contains: q } }],
        },
        take: 5,
        select: { id: true, voucherNo: true, partyName: true, amountIqd: true },
      }),
      prisma.ledgerTransaction.findMany({
        where: {
          deletedAt: null,
          OR: [
            { txnNo: { contains: q } },
            { receiptNo: { contains: q } },
            { voucherNo: { contains: q } },
            { partyName: { contains: q } },
            ...(Number.isFinite(Number(q)) && Number(q) > 0
              ? [{ amountBaseIqd: Number(q) }, { amountOriginal: Number(q) }]
              : []),
          ],
        },
        take: 8,
        select: {
          id: true,
          txnNo: true,
          partyName: true,
          amountBaseIqd: true,
          type: true,
        },
      }),
    ]);

  const items = [
    ...houses.map((h) => ({
      type: 'project' as const,
      id: h.id,
      title: `${h.code} · ${h.name}`,
      href: `/projects/${h.code}`,
    })),
    ...owners.map((o) => ({
      type: 'owner' as const,
      id: o.id,
      title: o.name,
      subtitle: o.phone,
      href: `/owners`,
    })),
    ...customers.map((c) => ({
      type: 'customer' as const,
      id: c.id,
      title: c.name,
      subtitle: c.phone,
      href: `/customers`,
    })),
    ...suppliers.map((s) => ({
      type: 'supplier' as const,
      id: s.id,
      title: s.name,
      subtitle: s.phone,
      href: `/suppliers`,
    })),
    ...contracts.map((c) => ({
      type: 'contract' as const,
      id: c.id,
      title: `${c.contractNo} · ${c.title}`,
      href: `/contracts`,
    })),
    ...leases.map((l) => ({
      type: 'rental' as const,
      id: l.id,
      title: `${l.leaseNo} · ${l.tenantName}`,
      subtitle: l.propertyCode,
      href: `/rentals`,
    })),
    ...users.map((u) => ({
      type: 'user' as const,
      id: u.id,
      title: u.name,
      subtitle: u.phone,
      href: `/access`,
    })),
    ...receipts.map((r) => ({
      type: 'receipt' as const,
      id: r.id,
      title: `${r.receiptNo} · ${r.partyName}`,
      href: `/receipts`,
    })),
    ...ankets.map((a) => ({
      type: 'anket' as const,
      id: a.id,
      title: `${a.anketNo}${a.projectName ? ` · ${a.projectName}` : ''}`,
      href: `/anket`,
    })),
    ...vouchers.map((v) => ({
      type: 'voucher' as const,
      id: v.id,
      title: `${v.voucherNo} · ${v.partyName}`,
      subtitle: String(v.amountIqd),
      href: `/accounting/transactions`,
    })),
    ...ledgerTxns.map((t) => ({
      type: 'ledger' as const,
      id: t.id,
      title: `${t.txnNo} · ${t.type}`,
      subtitle: t.partyName ? `${t.partyName} · ${t.amountBaseIqd}` : String(t.amountBaseIqd),
      href: `/accounting/transactions`,
    })),
  ];

  return NextResponse.json({ items });
}
