import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  const file = path.join(process.cwd(), 'public', 'data', 'compounds', 'index.json');
  try {
    const raw = await readFile(file, 'utf8');
    const areas = JSON.parse(raw) as unknown[];
    return NextResponse.json(
      { areas },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      },
    );
  } catch {
    return NextResponse.json({ areas: [] });
  }
}
