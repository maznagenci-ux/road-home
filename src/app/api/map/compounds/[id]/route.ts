import { NextResponse } from 'next/server';
import { loadCompound, refreshCompound } from '@/lib/map/compound-loader';

type Ctx = { params: Promise<{ id: string }> };

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

/** Public read — land plot maps from login /map */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('pointers');
  const force = url.searchParams.get('refresh') === '1';
  const wantPointers = mode === '1' || mode === 'slim' || force;

  try {
    const data = force
      ? await refreshCompound(id)
      : await loadCompound(id, wantPointers);
    if (!data) {
      return NextResponse.json(
        { error: 'no_plot_map', message: 'ئەم پڕۆژەیە نەخشەی زەوی نییە' },
        { status: 404, headers: NO_CACHE },
      );
    }
    const liveCount = data.pointers?.length ?? data.meta.pointerCount ?? 0;
    const meta = { ...data.meta, pointerCount: liveCount };

    if (!wantPointers) {
      return NextResponse.json(meta, { headers: NO_CACHE });
    }
    if (mode === 'slim') {
      const slim = (data.pointers ?? []).map(
        (p) => [p.no, Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100] as const,
      );
      return NextResponse.json(
        { ...meta, pointerFormat: 'slim', pointers: slim },
        { headers: NO_CACHE },
      );
    }
    return NextResponse.json(
      { ...meta, pointers: data.pointers ?? [] },
      { headers: NO_CACHE },
    );
  } catch {
    return NextResponse.json(
      { error: 'compound_fetch_failed' },
      { status: 502, headers: NO_CACHE },
    );
  }
}
