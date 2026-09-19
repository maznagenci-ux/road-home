import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';

const ALLOWED = /^[a-zA-Z0-9_-]+$/;

type Ctx = { params: Promise<{ folder: string; z: string; x: string; y: string }> };

/**
 * Proxy plot tiles. Homele logos are baked into source imagery (often large
 * semi-transparent watermarks); pixel scrubbing destroys map detail, so we
 * brand via the UI badge instead of mutating tiles.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireApiPermission('VIEW_PROPERTIES');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_CONTRACTS');
    if ('error' in alt) return alt.error;
  }

  const { folder, z, x, y } = await ctx.params;
  if (![folder, z, x, y].every((v) => ALLOWED.test(v))) {
    return NextResponse.json({ error: 'bad path' }, { status: 400 });
  }

  const upstream = `https://static.homele.com/maps/plots/tiles/${folder}/${z}/${x}/${y}.png`;
  try {
    const res = await fetch(upstream, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/png,*/*' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status === 404 ? 404 : 502 });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'tile fetch failed' }, { status: 502 });
  }
}
