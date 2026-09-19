import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { requireApiPermission } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireApiPermission('VIEW_PROPERTIES');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_CONTRACTS');
    if ('error' in alt) return alt.error;
  }

  const file = path.join(process.cwd(), 'public', 'data', 'compounds', 'index.json');
  try {
    const raw = await readFile(file, 'utf8');
    const areas = JSON.parse(raw) as unknown[];
    return NextResponse.json({ areas });
  } catch {
    return NextResponse.json({ areas: [] });
  }
}
