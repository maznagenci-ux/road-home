import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import {
  deletePlaceByCode,
  houseDependencyCount,
  syncPlaceFromHouse,
} from '@/lib/houses-places-sync';

const schema = z.object({
  name: z.string().min(1).optional(),
  unitNumber: z.string().optional().nullable(),
  area: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  budgetIqd: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  status: z.enum(['IN_CONSTRUCTION', 'SOLD', 'FINISHED']).optional(),
  targetFinishAt: z.string().datetime().optional().nullable().or(z.string().optional().nullable()),
  neighborhood: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  plotNo: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission('MANAGE_PROJECTS');
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    const existing = await prisma.house.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const data = schema.parse(await req.json());

    let location = existing.location;
    if (
      data.name != null ||
      data.neighborhood != null ||
      data.province != null ||
      data.city != null ||
      data.plotNo !== undefined
    ) {
      const place = await prisma.place.findUnique({ where: { code: existing.code } });
      location = await syncPlaceFromHouse({
        code: existing.code,
        name: data.name ?? existing.name,
        neighborhood: data.neighborhood ?? place?.neighborhood ?? existing.location,
        province: data.province ?? place?.province ?? 'هەولێر',
        city: data.city ?? place?.city ?? 'هەولێر',
        plotNo: data.plotNo !== undefined ? data.plotNo : place?.plotNo,
      });
    }

    const finish =
      data.targetFinishAt === undefined
        ? undefined
        : data.targetFinishAt === null || data.targetFinishAt === ''
          ? null
          : new Date(data.targetFinishAt);

    const item = await prisma.house.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name.trim() } : {}),
        ...(data.unitNumber !== undefined ? { unitNumber: data.unitNumber } : {}),
        ...(data.area !== undefined ? { area: data.area } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.budgetIqd !== undefined ? { budgetIqd: data.budgetIqd } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.propertyId !== undefined ? { propertyId: data.propertyId || null } : {}),
        ...(data.status != null ? { status: data.status } : {}),
        ...(finish !== undefined ? { targetFinishAt: finish } : {}),
        location,
      },
      include: { property: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'CODE_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission('MANAGE_PROJECTS');
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const house = await prisma.house.findUnique({ where: { id } });
  if (!house) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const deps = await houseDependencyCount(id);
  if (deps > 0) {
    return NextResponse.json({ error: 'HAS_DEPENDENCIES' }, { status: 409 });
  }

  await prisma.house.delete({ where: { id } });
  await deletePlaceByCode(house.code);
  return NextResponse.json({ ok: true });
}
