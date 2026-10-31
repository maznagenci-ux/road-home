import type { CompoundPointer } from '@/features/map/CompoundPlotCanvas';

/** Eastern Arabic / Persian digits → ASCII 0-9. */
export function normalizePlotDigits(raw: string): string {
  return String(raw || '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export type NumberedPointer = CompoundPointer & { seq: number };

function plotNoValue(p: CompoundPointer): string {
  return normalizePlotDigits(p.no).trim();
}

export function sortPointersByNo(list: CompoundPointer[]): CompoundPointer[] {
  const out = [...list];
  out.sort((a, b) => {
    const na = Number(plotNoValue(a));
    const nb = Number(plotNoValue(b));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return plotNoValue(a).localeCompare(plotNoValue(b), 'en', { numeric: true });
  });
  return out;
}

/**
 * Attach list order. `seq` equals the stored map plot number when numeric —
 * it is never used as the displayed land number.
 */
export function withPlotSeq(list: CompoundPointer[]): NumberedPointer[] {
  return sortPointersByNo(list).map((p) => {
    const n = Number(plotNoValue(p));
    return { ...p, seq: Number.isFinite(n) && n > 0 ? n : 0 };
  });
}

/** Search by the map plot number (`no`), never by array index. */
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
    const no = plotNoValue(p);
    if (no === s) exact.push(p);
    else if (no.startsWith(s)) starts.push(p);
    else if (s.length >= 3 && no.includes(s)) contains.push(p);
  }

  const byNo = (a: NumberedPointer, b: NumberedPointer) => {
    const na = Number(plotNoValue(a));
    const nb = Number(plotNoValue(b));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return plotNoValue(a).localeCompare(plotNoValue(b), 'en', { numeric: true });
  };
  exact.sort(byNo);
  if (exact.length) return exact;
  starts.sort(byNo);
  contains.sort(byNo);
  return [...starts, ...contains];
}

export function plotRangeLabel(pointers: NumberedPointer[]): string {
  if (!pointers.length) return '';
  const first = plotNoValue(pointers[0] ?? { no: '' });
  const last = plotNoValue(pointers[pointers.length - 1] ?? { no: '' });
  if (!first && !last) return '';
  if (!first || !last || first === last) return first || last;
  return `${first} – ${last}`;
}
