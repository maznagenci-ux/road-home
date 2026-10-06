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

function normalizeImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean)
    .slice(0, 10);
}

const schema = z.object({
  name: z.string().min(1).optional(),
  unitNumber: z.string().optional().nullable(),
  area: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  finalPrice: z.number().optional().nullable(),
  facadeM: z.number().optional().nullable(),
  bedrooms: z.number().int().min(0).max(50).optional().nullable(),
  bathrooms: z.number().int().min(0).max(50).optional().nullable(),
  guestRooms: z.number().int().min(0).max(50).optional().nullable(),
  budgetIqd: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).max(10).optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  status: z.enum(['IN_CONSTRUCTION', 'SOLD', 'FINISHED']).optional(),
  targetFinishAt: z.string().datetime().optional().nullable().or(z.string().optional().nullable()),
  neighborhood: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  plotNo: z.string().optional().nullable(),
  lat: z.number().finite().optional().nullable(),
  lng: z.number().finite().optional().nullable(),
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
      data.plotNo !== undefined ||
      data.lat !== undefined ||
      data.lng !== undefined
    ) {
      const place = await prisma.place.findUnique({ where: { code: existing.code } });
      location = await syncPlaceFromHouse({
        code: existing.code,
        name: data.name ?? existing.name,
        neighborhood: data.neighborhood ?? place?.neighborhood ?? existing.location,
        province: data.province ?? place?.province ?? 'هەولێر',
        city: data.city ?? place?.city ?? 'هەولێر',
        plotNo: data.plotNo !== undefined ? data.plotNo : place?.plotNo,
        lat: data.lat !== undefined ? data.lat : place?.lat,
        lng: data.lng !== undefined ? data.lng : place?.lng,
      });
    }

    const finish =
      data.targetFinishAt === undefined
        ? undefined
        : data.targetFinishAt === null || data.targetFinishAt === ''
          ? null
          : new Date(data.targetFinishAt);

    const images =
      data.imageUrls !== undefined
        ? normalizeImageUrls(data.imageUrls)
        : data.imageUrl !== undefined
          ? normalizeImageUrls(data.imageUrl ? [data.imageUrl] : [])
          : undefined;

    const item = await prisma.house.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name.trim() } : {}),
        ...(data.unitNumber !== undefined ? { unitNumber: data.unitNumber } : {}),
        ...(data.area !== undefined ? { area: data.area } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.finalPrice !== undefined ? { finalPrice: data.finalPrice } : {}),
        ...(data.facadeM !== undefined ? { facadeM: data.facadeM } : {}),
        ...(data.bedrooms !== undefined ? { bedrooms: data.bedrooms } : {}),
        ...(data.bathrooms !== undefined ? { bathrooms: data.bathrooms } : {}),
        ...(data.guestRooms !== undefined ? { guestRooms: data.guestRooms } : {}),
        ...(data.budgetIqd !== undefined ? { budgetIqd: data.budgetIqd } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.address !== undefined ? { address: data.address?.trim() || null } : {}),
        ...(images !== undefined
          ? { imageUrls: images, imageUrl: images[0] ?? null }
          : {}),
        ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl?.trim() || null } : {}),
        ...(data.propertyId !== undefined ? { propertyId: data.propertyId || null } : {}),
        ...(data.status != null ? { status: data.status } : {}),
        ...(finish !== undefined ? { targetFinishAt: finish } : {}),
        location,
      },
      include: { property: { select: { id: true, name: true } } },
    });
    const imageList = normalizeImageUrls(item.imageUrls);
    return NextResponse.json({
      item: {
        ...item,
        imageUrls: imageList.length ? imageList : item.imageUrl ? [item.imageUrl] : [],
        imageUrl: imageList[0] ?? item.imageUrl,
      },
    });
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
