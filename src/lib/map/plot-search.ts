import type { CompoundPointer } from '@/features/map/CompoundPlotCanvas';

/** Eastern Arabic / Persian digits → ASCII 0-9. */
export function normalizePlotDigits(raw: string): string {
  return String(raw || '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export type NumberedPointer = CompoundPointer & { seq: number };

export function sortPointersByNo(list: CompoundPointer[]): CompoundPointer[] {
  const out = [...list];
  out.sort((a, b) => {
    const na = Number(normalizePlotDigits(a.no));
    const nb = Number(normalizePlotDigits(b.no));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return normalizePlotDigits(a.no).localeCompare(normalizePlotDigits(b.no), 'en', {
      numeric: true,
    });
  });
  return out;
}

/** Sort only — list/search/pin use official map `no` (never remapped). */
export function withPlotSeq(list: CompoundPointer[]): NumberedPointer[] {
  return sortPointersByNo(list).map((p, i) => ({ ...p, seq: i + 1 }));
}

/** Search by official plot number printed on the map. */
export function filterPlotPointers(
  pointers: NumberedPointer[],
  query: string,
): NumberedPointer[] {
  const s = normalizePlotDigits(query).trim();
  if (!s) return pointers;

  const exact: NumberedPointer[] = [];
  const starts: NumberedPointer[] = [];
  const contains: NumberedPointer[] = [];

  for (const p of pointers) {
    const no = normalizePlotDigits(p.no);
    if (no === s) exact.push(p);
    else if (no.startsWith(s)) starts.push(p);
    else if (s.length >= 3 && no.includes(s)) contains.push(p);
  }

  const byNo = (a: NumberedPointer, b: NumberedPointer) =>
    normalizePlotDigits(a.no).localeCompare(normalizePlotDigits(b.no), 'en', {
      numeric: true,
    });
  exact.sort(byNo);
  if (exact.length) return exact;
  starts.sort(byNo);
  contains.sort(byNo);
  return [...starts, ...contains];
}

export function plotRangeLabel(pointers: NumberedPointer[]): string {
  if (!pointers.length) return '';
  const first = normalizePlotDigits(pointers[0]?.no ?? '');
  const last = normalizePlotDigits(pointers[pointers.length - 1]?.no ?? '');
  if (!first || !last) return '';
  return first === last ? first : `${first} – ${last}`;
}
