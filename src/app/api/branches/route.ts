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

/** Ensure HQ exists so letters/forms always have a default branch. */
async function ensureHqBranch() {
  const count = await prisma.branch.count();
  if (count > 0) return;
  await prisma.branch.create({
    data: {
      code: 'MAIN',
      name: 'بارەگای سەرەکی',
      city: 'هەولێر',
      isActive: true,
      isHq: true,
      notes: 'هەموو حیسابات لەم بارەگایە کۆدەبێتەوە',
    },
  });
}

export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;

  await ensureHqBranch();

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const activeOnly = url.searchParams.get('active') === '1';

  const items = await prisma.branch.findMany({
    where: {
      AND: [
        activeOnly ? { isActive: true } : {},
        q
          ? {
              OR: [
                { code: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
                { address: { contains: q } },
              ],
            }
          : {},
      ],
    },
    orderBy: [{ isHq: 'desc' }, { code: 'asc' }],
    take: 500,
  });

  return NextResponse.json({ items });
}

const createSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(160),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  city: z.string().max(80).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;

  try {
    await ensureHqBranch();
    const data = createSchema.parse(await req.json());
    const code = data.code.trim().toUpperCase();
    const existing = await prisma.branch.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'CODE_EXISTS' }, { status: 409 });
    }

    const item = await prisma.branch.create({
      data: {
        code,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: (data.city || 'هەولێر').trim() || 'هەولێر',
        isActive: data.isActive ?? true,
        isHq: false,
        notes: data.notes?.trim() || null,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
