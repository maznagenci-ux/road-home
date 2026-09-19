import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import type { PermissionKey } from '@prisma/client';

const partySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
});

type PartyKind = 'owners' | 'customers' | 'suppliers';

type PartyData = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  nationalId?: string | null;
};

function viewPerm(kind: PartyKind): PermissionKey {
  return kind === 'owners' ? 'VIEW_PROPERTIES' : 'VIEW_CONTRACTS';
}

function managePerm(kind: PartyKind): PermissionKey {
  return kind === 'owners' ? 'MANAGE_PROJECTS' : 'MANAGE_CONTRACTS';
}

async function listParties(kind: PartyKind, q?: string | null) {
  const query = q?.trim();
  if (kind === 'owners') {
    return prisma.owner.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { email: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 300,
    });
  }
  if (kind === 'customers') {
    return prisma.customer.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { email: { contains: query } },
              { nationalId: { contains: query } },
              { address: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 300,
    });
  }
  return prisma.supplier.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { name: 'asc' },
    take: 300,
  });
}

async function createParty(kind: PartyKind, data: PartyData) {
  if (kind === 'owners') {
    const { nationalId: _, ...rest } = data;
    return prisma.owner.create({ data: rest });
  }
  if (kind === 'customers') {
    return prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        notes: data.notes,
        nationalId: data.nationalId ?? null,
      },
    });
  }
  const { nationalId: _, ...rest } = data;
  return prisma.supplier.create({ data: rest });
}

async function updateParty(kind: PartyKind, id: string, data: Partial<PartyData>) {
  if (kind === 'owners') {
    const { nationalId: _, ...rest } = data;
    return prisma.owner.update({ where: { id }, data: rest });
  }
  if (kind === 'customers') {
    return prisma.customer.update({ where: { id }, data });
  }
  const { nationalId: _, ...rest } = data;
  return prisma.supplier.update({ where: { id }, data: rest });
}

async function deleteParty(kind: PartyKind, id: string) {
  if (kind === 'owners') return prisma.owner.delete({ where: { id } });
  if (kind === 'customers') return prisma.customer.delete({ where: { id } });
  return prisma.supplier.delete({ where: { id } });
}

export function createPartyRoutes(kind: PartyKind) {
  return {
    async GET(req: Request) {
      const auth = await requireApiPermission(viewPerm(kind));
      if ('error' in auth) return auth.error;
      const q = new URL(req.url).searchParams.get('q');
      const items = await listParties(kind, q);
      return NextResponse.json({ items });
    },
    async POST(req: Request) {
      const auth = await requireApiPermission(managePerm(kind));
      if ('error' in auth) return auth.error;
      try {
        const data = partySchema.parse(await req.json());
        const item = await createParty(kind, {
          name: data.name,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          notes: data.notes ?? null,
          nationalId: data.nationalId ?? null,
        });
        return NextResponse.json({ item }, { status: 201 });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
      }
    },
  };
}

export function createPartyIdRoutes(kind: PartyKind) {
  return {
    async GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
      const auth = await requireApiPermission(viewPerm(kind));
      if ('error' in auth) return auth.error;
      const { id } = await ctx.params;

      if (kind === 'customers') {
        const customer = await prisma.customer.findUnique({
          where: { id },
          include: {
            contracts: {
              orderBy: { createdAt: 'desc' },
              include: {
                house: { select: { code: true, name: true } },
                installments: { orderBy: { dueDate: 'asc' } },
              },
            },
          },
        });
        if (!customer) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

        const { getCustomerStatement } = await import('@/lib/accounting/statements');
        let balanceIqd = 0;
        let statementRows: Awaited<ReturnType<typeof getCustomerStatement>>['rows'] = [];
        try {
          const st = await getCustomerStatement(id);
          balanceIqd = st.balanceIqd;
          statementRows = st.rows.slice(-20).reverse();
        } catch {
          /* no ledger yet */
        }

        const contracts = customer.contracts.map((c) => {
          const paidInstallments = c.installments.filter((i) => i.status === 'PAID');
          const pending = c.installments.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');
          return {
            id: c.id,
            contractNo: c.contractNo,
            title: c.title,
            status: c.status,
            kind: c.kind,
            totalAmount: c.totalAmount,
            houseCode: c.house?.code ?? null,
            houseName: c.house?.name ?? null,
            installmentCount: c.installments.length,
            paidCount: paidInstallments.length,
            pendingCount: pending.length,
            pendingAmount: pending.reduce((s, i) => s + i.amount, 0),
            createdAt: c.createdAt.toISOString(),
          };
        });

        return NextResponse.json({
          customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            nationalId: customer.nationalId,
            notes: customer.notes,
            createdAt: customer.createdAt.toISOString(),
          },
          balanceIqd,
          contracts,
          recentLedger: statementRows,
        });
      }

      if (kind === 'owners') {
        const item = await prisma.owner.findUnique({ where: { id } });
        if (!item) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
        return NextResponse.json({ item });
      }
      const item = await prisma.supplier.findUnique({ where: { id } });
      if (!item) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      return NextResponse.json({ item });
    },
    async DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
      const auth = await requireApiPermission(managePerm(kind));
      if ('error' in auth) return auth.error;
      const { id } = await ctx.params;
      await deleteParty(kind, id);
      return NextResponse.json({ ok: true });
    },
    async PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
      const auth = await requireApiPermission(managePerm(kind));
      if ('error' in auth) return auth.error;
      const { id } = await ctx.params;
      try {
        const data = partySchema.partial().parse(await req.json());
        const item = await updateParty(kind, id, {
          ...(data.name != null ? { name: data.name } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.nationalId !== undefined ? { nationalId: data.nationalId } : {}),
        });
        return NextResponse.json({ item });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
      }
    },
  };
}
