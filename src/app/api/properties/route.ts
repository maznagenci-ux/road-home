import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';

const schema = z.object({
  name: z.string().min(1),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireApiPermission('VIEW_PROPERTIES');
  if ('error' in auth) return auth.error;
  const items = await prisma.property.findMany({
    orderBy: { name: 'asc' },
    include: { owner: { select: { id: true, name: true } }, _count: { select: { houses: true } } },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('MANAGE_PROJECTS');
  if ('error' in auth) return auth.error;
  try {
    const data = schema.parse(await req.json());
    const item = await prisma.property.create({
      data: {
        name: data.name,
        location: data.location ?? null,
        description: data.description ?? null,
        ownerId: data.ownerId || null,
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
