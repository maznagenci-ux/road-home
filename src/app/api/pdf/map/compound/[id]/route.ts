import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/access/permissions';
import { loadCompound } from '@/lib/map/compound-loader';
import { stitchCompoundMap } from '@/lib/map/stitch-compound';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Long-edge cap (px) — full compound tiles can be ~15k; keep sharp but bounded. */
const MAX_EMBED_PX = 14_336;

/**
 * Compound map PDF — Super Admin only.
 * Query: ?force=1 · ?format=jpg · ?fast=1 (maxZoom-1, quicker)
 */
export async function GET(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED' }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const format = url.searchParams.get('format') === 'jpg' ? 'jpg' : 'pdf';
  const fast = url.searchParams.get('fast') === '1';
  const fullQuality = !fast;

  try {
    const data = await loadCompound(id, false);
    if (!data?.meta?.tileFolder) {
      return NextResponse.json(
        { error: 'no_plot_map', message: 'ئەم پڕۆژەیە نەخشەی زەوی نییە' },
        { status: 404 },
      );
    }

    const stitched = await stitchCompoundMap(data.meta, {
      quality: fullQuality ? 96 : 88,
      force,
      fullQuality,
    });

    if (!stitched.bytes?.length || stitched.width < 16 || stitched.height < 16) {
      return NextResponse.json({ error: 'empty_map' }, { status: 502 });
    }

    const titleEn = (data.meta.title || `map-${id}`).replace(/[^\w\s\-()]+/g, '').trim();
    const safeName = `road-home-map-${id}`;

    let embedW = stitched.width;
    let embedH = stitched.height;
    const longEdge = Math.max(embedW, embedH);
    if (longEdge > MAX_EMBED_PX) {
      const s = MAX_EMBED_PX / longEdge;
      embedW = Math.max(1, Math.round(embedW * s));
      embedH = Math.max(1, Math.round(embedH * s));
    }

    const needsResize = embedW !== stitched.width || embedH !== stitched.height;
    let raster = sharp(stitched.bytes);
    if (needsResize) {
      raster = raster.resize(embedW, embedH, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
      });
    }
    const embedJpg = await raster
      .jpeg({ quality: 96, progressive: false, mozjpeg: true })
      .toBuffer();

    if (format === 'jpg') {
      return new NextResponse(new Uint8Array(embedJpg), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="${safeName}.jpg"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // 1 PDF point ≈ 1 pixel at embed resolution — best zoom in viewers
    const pageW = embedW;
    const pageH = embedH;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([pageW, pageH]);
    page.drawImage(await pdf.embedJpg(embedJpg), {
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
    });

    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const label = `Road Home  ·  ${titleEn || id}`;
    const pad = Math.max(10, Math.round(pageW / 400));
    const textSize = Math.max(12, Math.min(28, pageW / 80));
    const textW = font.widthOfTextAtSize(label, textSize);
    const boxH = textSize + pad;
    page.drawRectangle({
      x: pad,
      y: pageH - pad - boxH,
      width: Math.min(textW + pad * 2, pageW - pad * 2),
      height: boxH,
      color: rgb(0.043, 0.122, 0.22),
      opacity: 0.9,
    });
    page.drawText(label, {
      x: pad + pad / 2,
      y: pageH - pad - boxH + pad / 2,
      size: textSize,
      font,
      color: rgb(1, 1, 1),
    });

    const pdfBytes = await pdf.save();
    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Cache-Control': 'private, max-age=60',
        'X-Map-Zoom': String(stitched.zoom),
        'X-Map-Pixels': `${embedW}x${embedH}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'export_failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
