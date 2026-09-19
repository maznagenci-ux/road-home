import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';

async function nextReceiptNo() {
  const count = await prisma.receipt.count();
  return `RC-${new Date().getFullYear()}${String(count + 1).padStart(4, '0')}`;
}

const createSchema = z.object({
  type: z.enum(['PAYMENT', 'INCOME', 'EXPENSE']),
  partyName: z.string().min(1).max(200),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  amount: z.number().positive(),
  totalAmount: z.number().nonnegative().optional().nullable(),
  remainingAmount: z.number().nonnegative().optional().nullable(),
  description: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  leaseId: z.string().optional().nullable(),
  purpose: z.enum(['GENERAL', 'RENT', 'SECURITY_DEPOSIT']).optional(),
  issuedAt: z.string().datetime().optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['PAYMENT', 'INCOME', 'EXPENSE']).optional(),
  partyName: z.string().min(1).max(200).optional(),
  currency: z.enum(['IQD', 'USD']).optional(),
  amount: z.number().positive().optional(),
  totalAmount: z.number().nonnegative().optional().nullable(),
  remainingAmount: z.number().nonnegative().optional().nullable(),
  description: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  leaseId: z.string().optional().nullable(),
  purpose: z.enum(['GENERAL', 'RENT', 'SECURITY_DEPOSIT']).optional(),
  issuedAt: z.string().datetime().optional().nullable(),
});

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_CONTRACTS');
  if ('error' in auth) return auth.error;

  const url = new URL(req.url);
  const type = url.searchParams.get('type')?.trim() || '';
  const q = url.searchParams.get('q')?.trim() || '';
  const from = url.searchParams.get('from')?.trim() || '';
  const to = url.searchParams.get('to')?.trim() || '';
  const leaseId = url.searchParams.get('leaseId')?.trim() || '';
  const purpose = url.searchParams.get('purpose')?.trim() || '';

  const where: Record<string, unknown> = {};
  if (type && ['PAYMENT', 'INCOME', 'EXPENSE'].includes(type)) {
    where.type = type;
  }
  if (leaseId) where.leaseId = leaseId;
  if (purpose && ['GENERAL', 'RENT', 'SECURITY_DEPOSIT'].includes(purpose)) {
    where.purpose = purpose;
  }
  if (from || to) {
    where.issuedAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { receiptNo: { contains: q } },
      { partyName: { contains: q } },
      { description: { contains: q } },
      { contract: { contractNo: { contains: q } } },
      { contract: { title: { contains: q } } },
      { contract: { buyerName: { contains: q } } },
      { lease: { leaseNo: { contains: q } } },
      { lease: { tenantName: { contains: q } } },
    ];
  }

  const items = await prisma.receipt.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    include: {
      contract: { select: { contractNo: true, title: true, buyerName: true } },
      lease: { select: { leaseNo: true, tenantName: true, propertyCode: true } },
    },
    take: 300,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;
  try {
    const data = createSchema.parse(await req.json());
    const purpose = data.purpose ?? 'GENERAL';
    const item = await prisma.receipt.create({
      data: {
        receiptNo: await nextReceiptNo(),
        type: data.type,
        partyName: data.partyName.trim(),
        currency: data.currency,
        amount: data.amount,
        totalAmount: data.totalAmount ?? null,
        remainingAmount: data.remainingAmount ?? null,
        description: data.description ?? null,
        contractId: data.contractId || null,
        leaseId: data.leaseId || null,
        purpose,
        ...(data.issuedAt ? { issuedAt: new Date(data.issuedAt) } : {}),
      },
    });
    // Security deposits are held against the lease — never dual-write to general ledger
    if (purpose !== 'SECURITY_DEPOSIT') {
      try {
        const { dualWriteReceipt } = await import('@/lib/accounting/bridge');
        await dualWriteReceipt(item.id, auth.session.id);
      } catch {
        // non-blocking
      }
    }
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;
  try {
    const body = updateSchema.parse(await req.json());
    const { id, ...rest } = body;

    const item = await prisma.receipt.update({
      where: { id },
      data: {
        ...(rest.type !== undefined ? { type: rest.type } : {}),
        ...(rest.partyName !== undefined ? { partyName: rest.partyName.trim() } : {}),
        ...(rest.currency !== undefined ? { currency: rest.currency } : {}),
        ...(rest.amount !== undefined ? { amount: rest.amount } : {}),
        ...(rest.totalAmount !== undefined ? { totalAmount: rest.totalAmount } : {}),
        ...(rest.remainingAmount !== undefined ? { remainingAmount: rest.remainingAmount } : {}),
        ...(rest.description !== undefined ? { description: rest.description } : {}),
        ...(rest.contractId !== undefined ? { contractId: rest.contractId || null } : {}),
        ...(rest.leaseId !== undefined ? { leaseId: rest.leaseId || null } : {}),
        ...(rest.purpose !== undefined ? { purpose: rest.purpose } : {}),
        ...(rest.issuedAt ? { issuedAt: new Date(rest.issuedAt) } : {}),
      },
    });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get('id')?.trim() || '';
    if (!id) {
      const body = (await req.json().catch(() => null)) as { id?: string } | null;
      id = body?.id?.trim() || '';
    }
    if (!id) {
      return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 });
    }

    const existing = await prisma.receipt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    await prisma.receipt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
