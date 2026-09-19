import { mkdir, readFile, writeFile, access } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import type { CompoundMeta } from '@/lib/map/compound-loader';

const TILE = 256;
const CONCURRENCY = 10;
const BATCH = 36;

function exportsDir() {
  return path.join(process.cwd(), 'data', 'map-exports');
}

export function exportCachePath(meta: CompoundMeta, quality: number) {
  return path.join(exportsDir(), `${meta.id}-z${meta.maxZoom}-q${quality}.jpg`);
}

async function fetchTile(
  folder: string,
  z: number,
  x: number,
  y: number,
): Promise<Buffer | null> {
  const url = `https://static.homele.com/maps/plots/tiles/${folder}/${z}/${x}/${y}.png`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/png,*/*' },
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()),
  );
  return out;
}

type Composite = { input: Buffer; left: number; top: number };

/** Flatten tile to opaque RGB PNG so composite never upgrades the canvas to RGBA. */
async function tileToRgbPng(
  buf: Buffer,
  tw: number,
  th: number,
): Promise<Buffer> {
  let pipeline = sharp(buf);
  if (tw < TILE || th < TILE) {
    pipeline = pipeline.extract({
      left: 0,
      top: 0,
      width: Math.max(1, tw),
      height: Math.max(1, th),
    });
  }
  return pipeline
    .ensureAlpha()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .removeAlpha()
    .png()
    .toBuffer();
}

async function loadTileComposite(
  folder: string,
  z: number,
  job: { x: number; y: number; left: number; top: number },
  width: number,
  height: number,
): Promise<Composite | null> {
  const buf = await fetchTile(folder, z, job.x, job.y);
  if (!buf) return null;
  const tw = Math.min(TILE, width - job.left);
  const th = Math.min(TILE, height - job.top);
  const input = await tileToRgbPng(buf, tw, th);
  return { input, left: job.left, top: job.top };
}

/**
 * Stitch compound plot tiles into one JPEG.
 * Default: maxZoom-1 (faster). Pass fullQuality for true maxZoom.
 */
export async function stitchCompoundMap(
  meta: CompoundMeta,
  opts?: { quality?: number; force?: boolean; fullQuality?: boolean },
): Promise<{ filePath: string; width: number; height: number; bytes: Buffer; zoom: number }> {
  const quality = opts?.quality ?? 92;
  const fullW = Math.max(
    1,
    Math.ceil(meta.image?.width ?? Math.pow(2, meta.maxZoom) * TILE),
  );
  const fullH = Math.max(
    1,
    Math.ceil(meta.image?.height ?? Math.pow(2, meta.maxZoom) * TILE),
  );
  const z = opts?.fullQuality
    ? meta.maxZoom
    : Math.max(meta.minZoom ?? 0, meta.maxZoom - 1);
  const scale = Math.pow(2, meta.maxZoom - z);
  const width = Math.max(1, Math.ceil(fullW / scale));
  const height = Math.max(1, Math.ceil(fullH / scale));
  const cols = Math.ceil(width / TILE);
  const rows = Math.ceil(height / TILE);
  const filePath = path.join(
    exportsDir(),
    `${meta.id}-z${z}-q${quality}.jpg`,
  );
  const expectedRaw = width * height * 3;

  await mkdir(exportsDir(), { recursive: true });

  if (!opts?.force) {
    try {
      await access(filePath);
      const bytes = await readFile(filePath);
      if (bytes.length > 10_000) {
        const m = await sharp(bytes).metadata();
        // Reject old broken caches (almost pure white / wrong size)
        if (m.width === width && m.height === height) {
          const stats = await sharp(bytes).stats();
          const mean = stats.channels[0]?.mean ?? 255;
          if (mean < 245) {
            return { filePath, width, height, bytes, zoom: z };
          }
        }
      }
    } catch {
      /* rebuild */
    }
  }

  let raw = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .raw()
    .toBuffer();

  let placed = 0;

  for (let ty = 0; ty < rows; ty++) {
    const jobs: { x: number; y: number; left: number; top: number }[] = [];
    for (let tx = 0; tx < cols; tx++) {
      jobs.push({ x: tx, y: ty, left: tx * TILE, top: ty * TILE });
    }

    const rowTiles = await mapPool(jobs, CONCURRENCY, (job) =>
      loadTileComposite(meta.tileFolder, z, job, width, height),
    );
    const composites = rowTiles.filter((t): t is Composite => t != null);
    placed += composites.length;

    for (let i = 0; i < composites.length; i += BATCH) {
      const chunk = composites.slice(i, i + BATCH);
      raw = await sharp(raw, { raw: { width, height, channels: 3 } })
        .composite(chunk)
        .removeAlpha()
        .raw()
        .toBuffer();
      if (raw.length !== expectedRaw) {
        // Safety: if alpha slipped through, re-pack as 3-channel
        raw = await sharp(raw, {
          raw: { width, height, channels: raw.length === expectedRaw * (4 / 3) ? 4 : 3 },
        })
          .removeAlpha()
          .raw()
          .toBuffer();
      }
    }
  }

  if (placed === 0) {
    throw new Error('no_tiles');
  }

  const bytes = await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality, progressive: false, mozjpeg: false })
    .toBuffer();

  await writeFile(filePath, bytes);
  return { filePath, width, height, bytes, zoom: z };
}
