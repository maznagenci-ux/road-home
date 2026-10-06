import { NextResponse } from 'next/server';

const ALLOWED = /^[a-zA-Z0-9_-]+$/;

type Ctx = { params: Promise<{ folder: string; z: string; x: string; y: string }> };

/**
 * Proxy plot tiles. Public GET for login /map land browser.
 * Images are not modified — proxied as-is from upstream.
 */
export async function GET(_req: Request, ctx: Ctx) {
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
