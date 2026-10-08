import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, logActivity } from '@/lib/access/permissions';

const bodySchema = z.object({
  name: z.string().min(1),
  jobTitle: z.string().default(''),
  baseSalary: z.number().min(0),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  branchId: z.string().optional().nullable(),
});

async function requireOfficeAccess(write = false) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const key = write ? 'ADD_VOUCHERS' : 'VIEW_ACCOUNTING';
  const allowed = await hasPermission(session.id, session.role, key);
  if (!allowed) return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const auth = await requireOfficeAccess(false);
  if ('error' in auth) return auth.error;

  const [items, branches] = await Promise.all([
    prisma.payrollEmployee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { branch: { select: { id: true, name: true, code: true } } },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ isHq: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, code: true, isHq: true },
    }),
  ]);

  return NextResponse.json({ items, branches });
}

export async function POST(req: Request) {
  const auth = await requireOfficeAccess(true);
  if ('error' in auth) return auth.error;

  try {
    const data = bodySchema.parse(await req.json());
    if (data.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
      if (!branch) return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 400 });
    }

    const item = await prisma.payrollEmployee.create({
      data: {
        name: data.name.trim(),
        jobTitle: data.jobTitle.trim(),
        baseSalary: data.baseSalary,
        currency: data.currency,
        branchId: data.branchId || null,
      },
      include: { branch: { select: { id: true, name: true, code: true } } },
    });

    await logActivity({
      userId: auth.session.id,
      userName: auth.session.name,
      action: 'CREATE_PAYROLL_EMPLOYEE',
      projectCode: 'OFFICE',
      meta: item.name,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
