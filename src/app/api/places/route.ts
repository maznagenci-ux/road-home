import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import { syncHouseFromPlace } from '@/lib/houses-places-sync';

async function requirePlaceWrite() {
  const a = await requireApiPermission('MANAGE_PROJECTS');
  if (!('error' in a)) return a;
  return requireApiPermission('MANAGE_CONTRACTS');
}

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_PROPERTIES');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_CONTRACTS');
    if ('error' in alt) return alt.error;
  }

  const q = new URL(req.url).searchParams.get('q')?.trim() || '';
  const items = await prisma.place.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q } },
            { name: { contains: q } },
            { neighborhood: { contains: q } },
            { province: { contains: q } },
            { city: { contains: q } },
            { plotNo: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ code: 'asc' }],
    take: 2000,
  });

  const codes = items.map((p) => p.code);
  const houses = codes.length
    ? await prisma.house.findMany({
        where: { code: { in: codes } },
        select: {
          code: true,
          price: true,
          finalPrice: true,
          area: true,
          facadeM: true,
          bedrooms: true,
          bathrooms: true,
          guestRooms: true,
          address: true,
          imageUrl: true,
          imageUrls: true,
          videoUrl: true,
        },
      })
    : [];
  const houseByCode = new Map(houses.map((h) => [h.code, h]));
  const enriched = items.map((p) => {
    const house = houseByCode.get(p.code);
    const imageUrls = Array.isArray(house?.imageUrls)
      ? (house!.imageUrls as string[]).filter((u) => typeof u === 'string' && u.trim())
      : house?.imageUrl
        ? [house.imageUrl]
        : [];
    return {
      ...p,
      price: house?.price ?? null,
      finalPrice: house?.finalPrice ?? null,
      area: house?.area ?? null,
      facadeM: house?.facadeM ?? null,
      bedrooms: house?.bedrooms ?? null,
      bathrooms: house?.bathrooms ?? null,
      guestRooms: house?.guestRooms ?? null,
      address: house?.address ?? null,
      imageUrl: imageUrls[0] ?? house?.imageUrl ?? null,
      imageUrls,
      videoUrl: house?.videoUrl ?? null,
    };
  });

  return NextResponse.json({ items: enriched });
}

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  neighborhood: z.string().optional().default(''),
  province: z.string().optional().default('هەولێر'),
  city: z.string().optional().default('هەولێر'),
  plotNo: z.string().optional(),
  lat: z.number().finite().optional().nullable(),
  lng: z.number().finite().optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requirePlaceWrite();
  if ('error' in auth) return auth.error;

  try {
    const data = createSchema.parse(await req.json());
    const code = data.code.trim().toUpperCase();
    const existing = await prisma.place.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'CODE_EXISTS' }, { status: 409 });
    }

    const name = data.name.trim();
    const item = await prisma.place.create({
      data: {
        code,
        neighborhood: (data.neighborhood || name).trim() || name,
        name,
        province: (data.province || 'هەولێر').trim() || 'هەولێر',
        city: (data.city || 'هەولێر').trim() || 'هەولێر',
        plotNo: data.plotNo?.trim() || '',
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      },
    });

    await syncHouseFromPlace(item);

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
