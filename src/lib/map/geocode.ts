import { matchErbilDistrict, offsetPlot, ERBIL_VIEWBOX } from '@/lib/map/erbil';

export type GeoPoint = { lat: number; lng: number; source: 'stored' | 'district' | 'nominatim' };

type NominatimHit = {
  lat: string;
  lon: string;
  display_name?: string;
};

/**
 * Resolve coordinates for an Erbil place.
 * Priority: stored lat/lng → curated Erbil district match → OpenStreetMap Nominatim.
 */
export async function resolveErbilCoords(input: {
  lat?: number | null;
  lng?: number | null;
  neighborhood?: string;
  name?: string;
  city?: string;
  province?: string;
  seed?: string;
}): Promise<GeoPoint | null> {
  if (
    typeof input.lat === 'number' &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    return { lat: input.lat, lng: input.lng, source: 'stored' };
  }

  const queries = [input.neighborhood, input.name].filter(Boolean) as string[];
  for (const q of queries) {
    const district = matchErbilDistrict(q);
    if (district) {
      const seed = input.seed || `${q}-${input.name || ''}`;
      const p = offsetPlot(district.lat, district.lng, seed);
      return { ...p, source: 'district' };
    }
  }

  for (const q of queries) {
    const hit = await nominatimSearch(q, input.city || 'Erbil', input.province || 'Erbil');
    if (hit) {
      const seed = input.seed || q;
      const p = offsetPlot(hit.lat, hit.lng, seed);
      return { ...p, source: 'nominatim' };
    }
  }

  return null;
}

async function nominatimSearch(
  place: string,
  city: string,
  province: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = `${place}, ${city}, ${province}, Iraq`;
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q,
      format: 'json',
      limit: '1',
      countrycodes: 'iq',
      viewbox: ERBIL_VIEWBOX,
      bounded: '1',
    }).toString();

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RoadHomeZMKH/1.0 (erbil-property-map; local-app)',
      },
      signal: AbortSignal.timeout(8000),
      cache: 'force-cache',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimHit[];
    const first = data[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
