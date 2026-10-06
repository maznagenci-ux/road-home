/** Shared place helpers for contracts / rentals. */

export type PlaceOption = {
  id: string;
  code: string;
  neighborhood: string;
  name: string;
  province: string;
  city: string;
};

/** Unique non-empty parts, preserving order (avoids "ئازادی — ئازادی"). */
function uniqParts(parts: Array<string | null | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of parts) {
    const s = (raw ?? '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function placeLocationLabel(
  p: Pick<PlaceOption, 'neighborhood' | 'name' | 'city' | 'province'>,
) {
  return uniqParts([p.neighborhood, p.name, p.city, p.province]).join(' — ');
}

export function placeSelectLabel(p: Pick<PlaceOption, 'code' | 'neighborhood' | 'name'>) {
  const area = uniqParts([p.neighborhood, p.name]).join(' — ');
  return area ? `${p.code} — ${area}` : p.code;
}

export function placeMatchesQuery(p: PlaceOption, query: string) {
  const s = query.trim().toLowerCase();
  if (!s) return true;
  return (
    p.code.toLowerCase().includes(s) ||
    p.name.toLowerCase().includes(s) ||
    p.neighborhood.toLowerCase().includes(s) ||
    p.city.toLowerCase().includes(s) ||
    p.province.toLowerCase().includes(s)
  );
}
