import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import {
  assertReceiptInBranch,
  assertContractInBranch,
  assertLeaseInBranch,
  receiptBranchWhere,
} from '@/lib/access/branch-scope';

async function nextReceiptNo() {
  const year = new Date().getFullYear();
  const prefix = `RC-${year}`;
  const latest = await prisma.receipt.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: 'desc' },
    select: { receiptNo: true },
  });
  let seq = 1;
  if (latest?.receiptNo) {
    const tail = latest.receiptNo.slice(prefix.length);
    const n = Number.parseInt(tail, 10);
    if (Number.isFinite(n) && n >= seq) seq = n + 1;
  }
  for (let i = 0; i < 20; i++) {
    const candidate = `${prefix}${String(seq + i).padStart(4, '0')}`;
    const exists = await prisma.receipt.findUnique({
      where: { receiptNo: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${prefix}${String(Date.now()).slice(-6)}`;
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

/** Fill total/remaining from linked contract when client left them blank. */
async function withContractAmounts(data: z.infer<typeof createSchema>) {
  let totalAmount = data.totalAmount ?? null;
  let remainingAmount = data.remainingAmount ?? null;
  if (!data.contractId) return { totalAmount, remainingAmount };

  const contract = await prisma.contract.findUnique({
    where: { id: data.contractId },
    select: {
      currency: true,
      exchangeRate: true,
      totalAmount: true,
      totalAmountUsd: true,
      downPayment: true,
      downPaymentUsd: true,
      installments: { select: { amount: true, status: true } },
    },
  });
  if (!contract) return { totalAmount, remainingAmount };

  const currency = data.currency === 'USD' ? 'USD' : 'IQD';
  const rate = Math.max(1, contract.exchangeRate || 150_000);
  const toCur = (iqd: number) => (currency === 'USD' ? iqd / rate : iqd);
  const total =
    currency === 'USD'
      ? contract.totalAmountUsd || toCur(contract.totalAmount)
      : contract.totalAmount;
  const down =
    currency === 'USD'
      ? contract.downPaymentUsd || toCur(contract.downPayment)
      : contract.downPayment;
  const paidInstallments = contract.installments
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + toCur(i.amount), 0);
  const paid = down + paidInstallments;
  const remaining = Math.max(0, total - paid - data.amount);

  if (totalAmount == null) totalAmount = total;
  if (remainingAmount == null) remainingAmount = remaining;
  return { totalAmount, remainingAmount };
}

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
  const and: Record<string, unknown>[] = [];
  const branchFilter = receiptBranchWhere(auth.session);
  if (branchFilter) and.push(branchFilter);
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
    and.push({
      OR: [
        { receiptNo: { contains: q } },
        { partyName: { contains: q } },
        { description: { contains: q } },
        { contract: { contractNo: { contains: q } } },
        { contract: { title: { contains: q } } },
        { contract: { buyerName: { contains: q } } },
        { lease: { leaseNo: { contains: q } } },
        { lease: { tenantName: { contains: q } } },
      ],
    });
  }
  if (and.length) where.AND = and;

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

    if (data.contractId) {
      const ok = await assertContractInBranch(auth.session, data.contractId);
      if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (data.leaseId) {
      const ok = await assertLeaseInBranch(auth.session, data.leaseId);
      if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const amounts = await withContractAmounts(data);

    const item = await prisma.receipt.create({
      data: {
        receiptNo: await nextReceiptNo(),
        type: data.type,
        partyName: data.partyName.trim(),
        currency: data.currency,
        amount: data.amount,
        totalAmount: amounts.totalAmount,
        remainingAmount: amounts.remainingAmount,
        description: data.description ?? null,
        contractId: data.contractId || null,
        leaseId: data.leaseId || null,
        purpose,
        ...(data.issuedAt ? { issuedAt: new Date(data.issuedAt) } : {}),
      },
    });

    let ledgerWarning: string | null = null;
    if (purpose !== 'SECURITY_DEPOSIT' && purpose !== 'RENT') {
      try {
        const { dualWriteReceipt } = await import('@/lib/accounting/bridge');
        await dualWriteReceipt(item.id, auth.session.id);
      } catch (err) {
        console.error('receipts POST dualWrite', err);
        ledgerWarning = 'LEDGER_SYNC_FAILED';
      }
    }
    return NextResponse.json({ item, ledgerWarning }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Unique constraint') || msg.includes('receiptNo')) {
      return NextResponse.json({ error: 'DUPLICATE_RECEIPT_NO' }, { status: 409 });
    }
    console.error('receipts POST', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;
  try {
    const body = updateSchema.parse(await req.json());
    const { id, ...rest } = body;

    const ok = await assertReceiptInBranch(auth.session, id);
    if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    if (rest.contractId) {
      const cOk = await assertContractInBranch(auth.session, rest.contractId);
      if (!cOk) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (rest.leaseId) {
      const lOk = await assertLeaseInBranch(auth.session, rest.leaseId);
      if (!lOk) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

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

    let ledgerWarning: string | null = null;
    try {
      const { resyncReceiptLedger } = await import('@/lib/accounting/bridge');
      await resyncReceiptLedger(item.id, auth.session.id);
    } catch (err) {
      console.error('receipts PATCH ledger', err);
      ledgerWarning = 'LEDGER_SYNC_FAILED';
    }
    return NextResponse.json({ item, ledgerWarning });
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

    const ok = await assertReceiptInBranch(auth.session, id);
    if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const existing = await prisma.receipt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    try {
      const { voidReceiptLedger } = await import('@/lib/accounting/bridge');
      await voidReceiptLedger(id, auth.session.id);
    } catch (err) {
      console.error('receipts DELETE ledger', err);
    }

    await prisma.receipt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
