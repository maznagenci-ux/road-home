import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import { resolveErbilCoords } from '@/lib/map/geocode';
import { ERBIL_CENTER, ERBIL_BOUNDS, ERBIL_DISTRICTS } from '@/lib/map/erbil';
import type { MapPlot } from '@/lib/map/types';

export type { MapPlot };

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_PROPERTIES');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_CONTRACTS');
    if ('error' in alt) return alt.error;
  }

  const persist = new URL(req.url).searchParams.get('persist') === '1';

  const places = await prisma.place.findMany({
    orderBy: [{ neighborhood: 'asc' }, { name: 'asc' }],
    take: 500,
  });

  const plots: MapPlot[] = [];
  const updates: Promise<unknown>[] = [];

  for (const place of places) {
    const geo = await resolveErbilCoords({
      lat: place.lat,
      lng: place.lng,
      neighborhood: place.neighborhood,
      name: place.name,
      city: place.city,
      province: place.province,
      seed: place.code || place.id,
    });
    if (!geo) continue;

    plots.push({
      id: place.id,
      code: place.code,
      plotNo: place.plotNo?.trim() || place.code,
      name: place.name,
      neighborhood: place.neighborhood,
      city: place.city,
      province: place.province,
      lat: geo.lat,
      lng: geo.lng,
      source: geo.source,
    });

    if (persist && geo.source !== 'stored' && (place.lat == null || place.lng == null)) {
      updates.push(
        prisma.place.update({
          where: { id: place.id },
          data: { lat: geo.lat, lng: geo.lng },
        }),
      );
    }
  }

  if (updates.length) {
    await Promise.all(updates);
  }

  return NextResponse.json({
    center: ERBIL_CENTER,
    bounds: ERBIL_BOUNDS,
    source: {
      basemap: 'OpenStreetMap',
      attribution: '© OpenStreetMap contributors',
      geocode: 'OpenStreetMap Nominatim + Erbil district anchors',
      region: 'Erbil Governorate, Kurdistan Region, Iraq',
    },
    districts: ERBIL_DISTRICTS.map((d) => ({
      id: d.id,
      nameCkb: d.nameCkb,
      nameAr: d.nameAr,
      nameEn: d.nameEn,
      lat: d.lat,
      lng: d.lng,
    })),
    plots,
    totalPlaces: places.length,
    plotted: plots.length,
  });
}
