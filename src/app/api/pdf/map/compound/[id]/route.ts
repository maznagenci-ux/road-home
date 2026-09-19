import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import { requireApiPermission } from '@/lib/api-auth';
import { loadCompound } from '@/lib/map/compound-loader';
import { stitchCompoundMap } from '@/lib/map/stitch-compound';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Page long-edge in PDF points (≈ A2). Keep modest so Edge/Chrome can render. */
const MAX_PAGE_PT = 1400;
/** Rasterize embed at 2× page size for sharper zoom. */
const EMBED_SCALE = 2;

/**
 * Compound map PDF. Query: ?force=1 · ?format=jpg · ?full=1
 */
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

  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const format = url.searchParams.get('format') === 'jpg' ? 'jpg' : 'pdf';
  const fullQuality = url.searchParams.get('full') === '1';

  try {
    const data = await loadCompound(id, false);
    if (!data?.meta?.tileFolder) {
      return NextResponse.json(
        { error: 'no_plot_map', message: 'ئەم پڕۆژەیە نەخشەی زەوی نییە' },
        { status: 404 },
      );
    }

    const stitched = await stitchCompoundMap(data.meta, {
      quality: fullQuality ? 92 : 88,
      force,
      fullQuality,
    });

    if (!stitched.bytes?.length || stitched.width < 16 || stitched.height < 16) {
      return NextResponse.json({ error: 'empty_map' }, { status: 502 });
    }

    const titleEn = (data.meta.title || `map-${id}`).replace(/[^\w\s\-()]+/g, '').trim();
    const safeName = `road-home-map-${id}`;

    const scale = Math.min(MAX_PAGE_PT / stitched.width, MAX_PAGE_PT / stitched.height, 1);
    const pageW = Math.max(200, Math.round(stitched.width * scale));
    const pageH = Math.max(200, Math.round(stitched.height * scale));
    const embedW = Math.min(stitched.width, pageW * EMBED_SCALE);
    const embedH = Math.min(stitched.height, pageH * EMBED_SCALE);

    // Downscale + baseline JPEG — huge progressive embeds render blank in Edge/Chrome
    const embedJpg = await sharp(stitched.bytes)
      .resize(embedW, embedH, { fit: 'fill' })
      .jpeg({ quality: 92, progressive: false, mozjpeg: false })
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
    const pad = 10;
    const textSize = Math.max(10, Math.min(14, pageW / 90));
    const textW = font.widthOfTextAtSize(label, textSize);
    const boxH = textSize + 12;
    page.drawRectangle({
      x: pad,
      y: pageH - pad - boxH,
      width: Math.min(textW + 20, pageW - pad * 2),
      height: boxH,
      color: rgb(0.043, 0.122, 0.22),
      opacity: 0.9,
    });
    page.drawText(label, {
      x: pad + 10,
      y: pageH - pad - boxH + 6,
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
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'export_failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
