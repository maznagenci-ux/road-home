import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type CompoundMeta = {
  id: string;
  title: string;
  titleKu?: string;
  tileFolder: string;
  plotBaseUrl: string;
  minZoom: number;
  maxZoom: number;
  center: { x: number; y: number };
  image: {
    width: number;
    height: number;
    corners?: Record<string, [number, number]>;
  } | null;
  pointerCount: number;
};

export type CompoundPointer = {
  id: string;
  no: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
};

function compoundsDir() {
  return path.join(process.cwd(), 'public', 'data', 'compounds');
}

export async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    const raw = await readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractInertiaPage(html: string) {
  const start = html.indexOf('data-page="');
  if (start < 0) throw new Error('no data-page');
  let i = start + 'data-page="'.length;
  let out = '';
  while (i < html.length && html[i] !== '"') out += html[i++];
  return JSON.parse(
    out
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
  ) as {
    props: {
      plot_base_url?: string;
      plot: Record<string, unknown> & {
        pointers?: Array<Record<string, unknown>>;
        area?: { title?: string; search_keywords?: string };
        georef?: string | Record<string, unknown>;
        center?: string;
        min_zoom?: number;
        max_zoom?: number;
        version?: string;
        area_id?: number;
      };
    };
  };
}

function tileFolder(plot: { version?: string; area_id?: number }, plotBaseUrl?: string) {
  const m = String(plotBaseUrl || '').match(/\/tiles\/([^/]+)\//);
  if (m) return m[1];
  return plot.version ? `${plot.area_id}_${plot.version}` : String(plot.area_id ?? '');
}

function parseCompound(id: string, html: string): { meta: CompoundMeta; pointers: CompoundPointer[] } {
  const page = extractInertiaPage(html);
  const plot = page.props.plot;
  if (!plot || !page.props.plot_base_url) {
    throw new Error('no plot map');
  }
  const folder = tileFolder(plot, page.props.plot_base_url);
  if (!folder) throw new Error('no tile folder');

  let georef: { img_w?: number; img_h?: number; corners?: Record<string, [number, number]> } | null =
    null;
  try {
    georef =
      typeof plot.georef === 'string'
        ? (JSON.parse(plot.georef) as typeof georef)
        : ((plot.georef as typeof georef) ?? null);
  } catch {
    georef = null;
  }

  const [cx, cy] = String(plot.center || '0,0')
    .split(',')
    .map((n) => Number(n.trim()));

  const keywords = plot.area?.search_keywords || '';
  const kuTitle =
    keywords
      .split(',')
      .map((s) => s.trim())
      .find((s) => /[\u0600-\u06FF]/.test(s)) || plot.area?.title;

  const pointers: CompoundPointer[] = (plot.pointers || []).map((p) => ({
    id: String(p.id ?? ''),
    no: String(p.title ?? ''),
    x: Number(p.x),
    y: Number(p.y),
    lat: Number(p.lat),
    lng: Number(p.lng),
  }));

  const meta: CompoundMeta = {
    id,
    title: plot.area?.title || id,
    titleKu: kuTitle,
    tileFolder: folder,
    plotBaseUrl: page.props.plot_base_url,
    minZoom: plot.min_zoom ?? 0,
    maxZoom: plot.max_zoom ?? 6,
    center: { x: cx || 0, y: cy || 0 },
    image: georef?.img_w
      ? {
          width: Number(georef.img_w),
          height: Number(georef.img_h ?? georef.img_w),
          corners: georef.corners,
        }
      : null,
    pointerCount: pointers.length,
  };

  return { meta, pointers };
}

export async function loadCompound(
  id: string,
  wantPointers: boolean,
): Promise<{ meta: CompoundMeta; pointers?: CompoundPointer[] } | null> {
  const dir = compoundsDir();
  const metaPath = path.join(dir, `${id}.json`);
  const ptrPath = path.join(dir, `${id}-pointers.json`);

  let meta = await readJsonFile<CompoundMeta>(metaPath);
  let pointers = wantPointers ? await readJsonFile<CompoundPointer[]>(ptrPath) : null;

  if (meta && (!wantPointers || pointers)) {
    return wantPointers ? { meta, pointers: pointers ?? [] } : { meta };
  }

  const res = await fetch(`https://new.homele.com/plots/${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,*/*' },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const html = await res.text();
  let parsed: { meta: CompoundMeta; pointers: CompoundPointer[] };
  try {
    parsed = parseCompound(id, html);
  } catch {
    return null;
  }

  await mkdir(dir, { recursive: true });
  await writeFile(metaPath, JSON.stringify(parsed.meta, null, 2), 'utf8');
  await writeFile(ptrPath, JSON.stringify(parsed.pointers), 'utf8');

  return wantPointers
    ? { meta: parsed.meta, pointers: parsed.pointers }
    : { meta: parsed.meta };
}
