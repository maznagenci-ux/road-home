import { prisma } from '@/lib/prisma';
import type { CompoundPointer } from '@/lib/map/compound-loader';

function sourceKey(p: CompoundPointer, index: number): string {
  const id = String(p.id ?? '').trim();
  if (id) return id;
  return `idx:${index}`;
}

function cadastralFromSource(p: CompoundPointer, existing?: string): string {
  const fromField = String(p.cadastralNo ?? '').trim();
  if (fromField) return fromField;
  if (existing) return existing;
  return String(p.no ?? '').trim();
}

/**
 * Persist compound map plots. The user-facing `plotNo` is assigned once from
 * original source order (the number drawn on tiles: 1, 2, 3…) and never
 * recomputed from sort order, pagination, or cadastral titles like 2891.
 */
export async function syncCompoundPlots(
  compoundId: string,
  source: CompoundPointer[],
): Promise<CompoundPointer[]> {
  const existing = await prisma.compoundPlot.findMany({
    where: { compoundId },
  });

  if (existing.length === 0 && source.length > 0) {
    await prisma.compoundPlot.createMany({
      skipDuplicates: true,
      data: source.map((p, i) => ({
        compoundId,
        sourceId: sourceKey(p, i),
        plotNo: String(i + 1),
        cadastralNo: cadastralFromSource(p),
        x: Number(p.x) || 0,
        y: Number(p.y) || 0,
        lat: Number(p.lat) || 0,
        lng: Number(p.lng) || 0,
      })),
    });
  } else if (source.length > 0) {
    const bySource = new Map(existing.map((row) => [row.sourceId, row]));
    let nextNo = 0;
    for (const row of existing) {
      const n = Number.parseInt(row.plotNo, 10);
      if (Number.isFinite(n) && n > nextNo) nextNo = n;
    }

    for (let i = 0; i < source.length; i++) {
      const p = source[i]!;
      const key = sourceKey(p, i);
      const found = bySource.get(key);
      const x = Number(p.x) || 0;
      const y = Number(p.y) || 0;
      const lat = Number(p.lat) || 0;
      const lng = Number(p.lng) || 0;
      const cadastralNo = cadastralFromSource(p, found?.cadastralNo);

      if (found) {
        if (
          found.x !== x ||
          found.y !== y ||
          found.lat !== lat ||
          found.lng !== lng ||
          found.cadastralNo !== cadastralNo
        ) {
          await prisma.compoundPlot.update({
            where: { id: found.id },
            data: { x, y, lat, lng, cadastralNo },
          });
        }
        continue;
      }

      nextNo += 1;
      await prisma.compoundPlot.create({
        data: {
          compoundId,
          sourceId: key,
          plotNo: String(nextNo),
          cadastralNo,
          x,
          y,
          lat,
          lng,
        },
      });
    }
  }

  const rows = await prisma.compoundPlot.findMany({
    where: { compoundId },
    orderBy: { plotNo: 'asc' },
  });

  rows.sort((a, b) => {
    const na = Number.parseInt(a.plotNo, 10);
    const nb = Number.parseInt(b.plotNo, 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.plotNo.localeCompare(b.plotNo, 'en', { numeric: true });
  });

  return rows.map((row) => ({
    id: row.sourceId || row.id,
    no: row.plotNo,
    cadastralNo: row.cadastralNo,
    x: row.x,
    y: row.y,
    lat: row.lat,
    lng: row.lng,
  }));
}
