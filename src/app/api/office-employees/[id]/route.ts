import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, logActivity } from '@/lib/access/permissions';

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  jobTitle: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  currency: z.enum(['IQD', 'USD']).optional(),
  branchId: z.string().optional().nullable(),
});

async function requireWrite() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const allowed = await hasPermission(session.id, session.role, 'ADD_VOUCHERS');
  if (!allowed) return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  return { session };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireWrite();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  try {
    const data = bodySchema.parse(await req.json());
    const existing = await prisma.payrollEmployee.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    if (data.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
      if (!branch) return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 400 });
    }

    const item = await prisma.payrollEmployee.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.jobTitle !== undefined ? { jobTitle: data.jobTitle.trim() } : {}),
        ...(data.baseSalary !== undefined ? { baseSalary: data.baseSalary } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.branchId !== undefined ? { branchId: data.branchId || null } : {}),
      },
      include: { branch: { select: { id: true, name: true, code: true } } },
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
  const auth = await requireWrite();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const existing = await prisma.payrollEmployee.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  await prisma.payrollEmployee.update({
    where: { id },
    data: { isActive: false },
  });

  await logActivity({
    userId: auth.session.id,
    userName: auth.session.name,
    action: 'DELETE_PAYROLL_EMPLOYEE',
    projectCode: 'OFFICE',
    meta: existing.name,
  });

  return NextResponse.json({ ok: true });
}
