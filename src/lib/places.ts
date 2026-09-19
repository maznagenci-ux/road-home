/** Shared place helpers for contracts / rentals. */

export type PlaceOption = {
  id: string;
  code: string;
  neighborhood: string;
  name: string;
  province: string;
  city: string;
};

export function placeLocationLabel(p: Pick<PlaceOption, 'neighborhood' | 'name' | 'city' | 'province'>) {
  return [p.neighborhood, p.name, p.city, p.province].filter(Boolean).join(' — ');
}

export function placeSelectLabel(p: Pick<PlaceOption, 'code' | 'neighborhood' | 'name'>) {
  const area = [p.neighborhood, p.name].filter(Boolean).join(' — ');
  return area ? `${p.code} — ${area}` : p.code;
}
