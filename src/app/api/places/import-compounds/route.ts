import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import { syncHouseFromPlace } from '@/lib/houses-places-sync';

async function requirePlaceWrite() {
  const a = await requireApiPermission('MANAGE_PROJECTS');
  if (!('error' in a)) return a;
  return requireApiPermission('MANAGE_CONTRACTS');
}

type CompoundIndexRow = {
  id?: string;
  title?: string;
  titleEn?: string;
};

/** Next place code: max(100, highest numeric code + 1). */
async function nextPlaceCodeFromDb(): Promise<string> {
  const places = await prisma.place.findMany({
    select: { code: true },
    take: 5000,
  });
  let max = 99;
  for (const p of places) {
    const n = Number.parseInt(p.code.replace(/\D/g, ''), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

/**
 * Import all compound/project map titles as places.
 * Codes start at 100 and increment. Skips names that already exist.
 */
export async function POST() {
  const auth = await requirePlaceWrite();
  if ('error' in auth) return auth.error;

  try {
    const file = path.join(process.cwd(), 'public', 'data', 'compounds', 'index.json');
    const raw = await readFile(file, 'utf8');
    const rows = JSON.parse(raw) as CompoundIndexRow[];
    const names: string[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const name = (r.title || r.titleEn || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }

    const existing = await prisma.place.findMany({ select: { name: true, code: true } });
    const existingNames = new Set(existing.map((p) => p.name.trim().toLowerCase()));

    let next = 100;
    for (const p of existing) {
      const n = Number.parseInt(p.code.replace(/\D/g, ''), 10);
      if (Number.isFinite(n) && n >= next) next = n + 1;
    }

    let created = 0;
    let skipped = 0;
    for (const name of names) {
      if (existingNames.has(name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      const code = String(next);
      next += 1;
      const item = await prisma.place.create({
        data: {
          code,
          name,
          neighborhood: name,
          province: 'هەولێر',
          city: 'هەولێر',
          plotNo: '',
        },
      });
      await syncHouseFromPlace(item);
      existingNames.add(name.toLowerCase());
      created += 1;
    }

    return NextResponse.json({
      ok: true,
      totalMaps: names.length,
      created,
      skipped,
      nextCode: String(next),
    });
  } catch (err) {
    console.error('[places/import-compounds]', err);
    return NextResponse.json({ error: 'IMPORT_FAILED' }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireApiPermission('VIEW_PROPERTIES');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_CONTRACTS');
    if ('error' in alt) return alt.error;
  }
  const nextCode = await nextPlaceCodeFromDb();
  return NextResponse.json({ nextCode });
}
