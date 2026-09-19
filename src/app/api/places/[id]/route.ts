import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import {
  deleteOrphanHouseByCode,
  renameHouseCode,
  syncHouseFromPlace,
} from '@/lib/houses-places-sync';

async function requirePlaceWrite() {
  const a = await requireApiPermission('MANAGE_PROJECTS');
  if (!('error' in a)) return a;
  return requireApiPermission('MANAGE_CONTRACTS');
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlaceWrite();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const existing = await prisma.place.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const schema = z.object({
    code: z.string().min(1).optional(),
    neighborhood: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    province: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    plotNo: z.string().optional(),
    lat: z.number().finite().optional().nullable(),
    lng: z.number().finite().optional().nullable(),
  });

  try {
    const data = schema.parse(await req.json());
    const nextCode = (data.code?.trim() || existing.code).toUpperCase();

    if (nextCode !== existing.code) {
      const clash = await prisma.place.findUnique({ where: { code: nextCode } });
      if (clash) {
        return NextResponse.json({ error: 'CODE_EXISTS' }, { status: 409 });
      }
      await renameHouseCode(existing.code, nextCode);
    }

    let item = await prisma.place.update({
      where: { id },
      data: {
        code: nextCode,
        neighborhood: data.neighborhood?.trim() ?? existing.neighborhood,
        name: data.name?.trim() ?? existing.name,
        province: data.province?.trim() ?? existing.province,
        city: data.city?.trim() ?? existing.city,
        plotNo: data.plotNo !== undefined ? data.plotNo.trim() : existing.plotNo,
        lat: data.lat !== undefined ? data.lat : existing.lat,
        lng: data.lng !== undefined ? data.lng : existing.lng,
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
        item = await prisma.place.update({
          where: { id },
          data: { lat: geo.lat, lng: geo.lng },
        });
      }
    }

    await syncHouseFromPlace(item);

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
  const auth = await requirePlaceWrite();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const place = await prisma.place.findUnique({ where: { id } });
  if (!place) return NextResponse.json({ ok: true });

  await prisma.place.delete({ where: { id } });
  await deleteOrphanHouseByCode(place.code);
  return NextResponse.json({ ok: true });
}
