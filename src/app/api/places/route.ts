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
    orderBy: [{ neighborhood: 'asc' }, { name: 'asc' }],
    take: 500,
  });

  return NextResponse.json({ items });
}

const createSchema = z.object({
  code: z.string().min(1),
  neighborhood: z.string().min(1),
  name: z.string().min(1),
  province: z.string().min(1).default('هەولێر'),
  city: z.string().min(1).default('هەولێر'),
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

    const item = await prisma.place.create({
      data: {
        code,
        neighborhood: data.neighborhood.trim(),
        name: data.name.trim(),
        province: data.province.trim() || 'هەولێر',
        city: data.city.trim() || 'هەولێر',
        plotNo: data.plotNo?.trim() || '',
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      },
    });

    if (item.lat == null || item.lng == null) {
      const { resolveErbilCoords } = await import('@/lib/map/geocode');
      const geo = await resolveErbilCoords({
        neighborhood: item.neighborhood,
        name: item.name,
        city: item.city,
        province: item.province,
        seed: item.code,
      });
      if (geo) {
        const updated = await prisma.place.update({
          where: { id: item.id },
          data: { lat: geo.lat, lng: geo.lng },
        });
        await syncHouseFromPlace(updated);
        return NextResponse.json({ item: updated }, { status: 201 });
      }
    }

    await syncHouseFromPlace(item);

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
