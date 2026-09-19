import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import { loadCompound } from '@/lib/map/compound-loader';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireApiPermission('VIEW_PROPERTIES');
  if ('error' in auth) {
    const alt = await requireApiPermission('VIEW_CONTRACTS');
    if ('error' in alt) return alt.error;
  }

  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }

  const wantPointers = new URL(req.url).searchParams.get('pointers') === '1';

  try {
    const data = await loadCompound(id, wantPointers);
    if (!data) {
      return NextResponse.json(
        { error: 'no_plot_map', message: 'ئەم پڕۆژەیە نەخشەی زەوی نییە' },
        { status: 404 },
      );
    }
    return NextResponse.json(
      wantPointers ? { ...data.meta, pointers: data.pointers ?? [] } : data.meta,
    );
  } catch {
    return NextResponse.json({ error: 'compound_fetch_failed' }, { status: 502 });
  }
}
