import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/access/permissions';

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!isSuperAdmin(session.role)) {
    return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const schema = z.object({
    code: z.string().min(1).max(32).optional(),
    name: z.string().min(1).max(160).optional(),
    phone: z.string().max(40).optional().nullable(),
    address: z.string().max(400).optional().nullable(),
    city: z.string().max(80).optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(500).optional().nullable(),
  });

  try {
    const data = schema.parse(await req.json());
    const nextCode = (data.code?.trim() || existing.code).toUpperCase();

    if (nextCode !== existing.code) {
      if (existing.isHq) {
        return NextResponse.json({ error: 'HQ_CODE_LOCKED' }, { status: 400 });
      }
      const clash = await prisma.branch.findUnique({ where: { code: nextCode } });
      if (clash) {
        return NextResponse.json({ error: 'CODE_EXISTS' }, { status: 409 });
      }
    }

    const item = await prisma.branch.update({
      where: { id },
      data: {
        code: nextCode,
        name: data.name?.trim() ?? existing.name,
        phone: data.phone !== undefined ? data.phone?.trim() || null : existing.phone,
        address: data.address !== undefined ? data.address?.trim() || null : existing.address,
        city: data.city?.trim() ?? existing.city,
        isActive:
          data.isActive !== undefined
            ? existing.isHq
              ? true
              : data.isActive
            : existing.isActive,
        notes: data.notes !== undefined ? data.notes?.trim() || null : existing.notes,
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) return NextResponse.json({ ok: true });
  if (branch.isHq) {
    return NextResponse.json({ error: 'HQ_LOCKED' }, { status: 400 });
  }

  await prisma.branch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
