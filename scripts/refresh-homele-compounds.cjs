/**
 * Refresh compound index + plot pointers from https://homele.com/plots
 *
 * Usage (on VPS):
 *   node scripts/refresh-homele-compounds.cjs
 *   node scripts/refresh-homele-compounds.cjs --prefetch=all
 *   node scripts/refresh-homele-compounds.cjs --prefetch=426,2540,1342
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = process.cwd();
const outDir = path.join(ROOT, 'public', 'data', 'compounds');
const standaloneDir = path.join(ROOT, '.next', 'standalone', 'public', 'data', 'compounds');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'ckb,ku,ar,en;q=0.8',
        },
        timeout: 120000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve, reject);
          res.resume();
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
  });
}

function extractPage(html) {
  // New Homele: <script data-page="app" type="application/json">{...}</script>
  const m =
    html.match(
      /<script[^>]*data-page=["']app["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i,
    ) ||
    html.match(
      /<script[^>]*type=["']application\/json["'][^>]*data-page=["']app["'][^>]*>([\s\S]*?)<\/script>/i,
    );
  if (m && m[1]) return JSON.parse(m[1].trim());

  const start = html.indexOf('data-page="');
  if (start < 0) throw new Error('no data-page');
  const after = html.slice(start + 'data-page="'.length);
  if (after.startsWith('app"')) throw new Error('no inertia json payload');
  let i = start + 'data-page="'.length;
  let out = '';
  while (i < html.length && html[i] !== '"') out += html[i++];
  return JSON.parse(
    out
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
  );
}

function tileFolder(plot, plotBaseUrl) {
  const m = String(plotBaseUrl || '').match(/\/tiles\/([^/]+)\//);
  if (m) return m[1];
  return plot.version ? `${plot.area_id}_${plot.version}` : String(plot.area_id ?? '');
}

function writeBoth(relName, content) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, relName), content);
  try {
    fs.mkdirSync(standaloneDir, { recursive: true });
    fs.writeFileSync(path.join(standaloneDir, relName), content);
  } catch {
    /* standalone may not exist in local build */
  }
}

function clearCachedCompounds() {
  for (const dir of [outDir, standaloneDir]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name === 'index.json') continue;
      if (name.endsWith('.json')) {
        try {
          fs.unlinkSync(path.join(dir, name));
        } catch {
          /* ignore */
        }
      }
    }
  }
}

function parseArgs(argv) {
  const out = { prefetch: [] };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--prefetch=')) {
      const v = a.slice('--prefetch='.length).trim();
      if (v === 'all') out.prefetch = 'all';
      else out.prefetch = v.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return out;
}

async function fetchCompound(id) {
  // Detail pages still live on new.homele.com (legacy inertia attribute)
  const html = await fetchText(`https://new.homele.com/plots/${id}`);
  const page = extractPage(html);
  const plot = page.props?.plot;
  if (!plot || !page.props?.plot_base_url) {
    throw new Error(`no plot map for ${id}`);
  }
  const folder = tileFolder(plot, page.props.plot_base_url);
  let georef = null;
  try {
    if (typeof plot.georef === 'string') georef = JSON.parse(plot.georef);
    else if (plot.georef && typeof plot.georef === 'object') georef = plot.georef;
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

  const pointers = (plot.pointers || []).map((p) => ({
    id: String(p.id ?? ''),
    no: String(p.title ?? ''),
    x: Number(p.x),
    y: Number(p.y),
    lat: Number(p.lat),
    lng: Number(p.lng),
  }));

  const imgW = georef?.img_w ? Math.max(1, Math.round(Number(georef.img_w))) : 0;
  const imgH = georef?.img_h ? Math.max(1, Math.round(Number(georef.img_h))) : imgW;

  const meta = {
    id: String(id),
    title: plot.area?.title || String(id),
    titleKu: kuTitle,
    tileFolder: folder,
    plotBaseUrl: page.props.plot_base_url,
    minZoom: plot.min_zoom ?? 0,
    maxZoom: plot.max_zoom ?? 6,
    center: { x: cx || 0, y: cy || 0 },
    image: imgW
      ? { width: imgW, height: imgH || imgW, corners: georef?.corners }
      : null,
    pointerCount: pointers.length,
  };

  writeBoth(`${id}.json`, JSON.stringify(meta, null, 2));
  writeBoth(`${id}-pointers.json`, JSON.stringify(pointers));
  return { id, title: meta.titleKu || meta.title, pointers: pointers.length, folder };
}

(async () => {
  const args = parseArgs(process.argv);
  console.log('fetching https://homele.com/ku/plots …');
  const html = await fetchText('https://homele.com/ku/plots');
  const page = extractPage(html);
  const areas = page.props?.areas || [];
  const withPlots = areas.filter((a) => a.plot_map_url);

  const index = withPlots.map((a) => ({
    id: String(a.id),
    title: a.title,
    titleEn: a.translations?.en?.title || a.title,
    keywords: a.search_keywords || '',
    latlng: a.latlng || null,
    plotMapUrl: a.plot_map_url,
  }));

  fs.mkdirSync(outDir, { recursive: true });
  clearCachedCompounds();
  writeBoth('index.json', JSON.stringify(index, null, 2));
  console.log('index written', index.length, 'compounds (cache cleared)');

  let ids = [];
  if (args.prefetch === 'all') {
    ids = index.map((a) => a.id);
  } else if (Array.isArray(args.prefetch) && args.prefetch.length) {
    ids = args.prefetch;
  } else {
    // Default: refresh the biggest / most-used maps so numbers are complete
    ids = ['426', '2540', '1342', '2224', '1821', '226', '1611', '550', '825'];
    ids = ids.filter((id) => index.some((a) => a.id === id));
  }

  console.log('prefetching', ids.length, 'compounds…');
  let ok = 0;
  let fail = 0;
  let totalPointers = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const r = await fetchCompound(id);
      ok += 1;
      totalPointers += r.pointers;
      console.log(`[${i + 1}/${ids.length}] OK ${id} ${r.title} pointers=${r.pointers} tiles=${r.folder}`);
    } catch (e) {
      fail += 1;
      console.log(`[${i + 1}/${ids.length}] FAIL ${id}`, e.message || e);
    }
    // gentle pacing — avoid hammering homele
    await new Promise((r) => setTimeout(r, 350));
  }
  console.log(JSON.stringify({ index: index.length, prefetched: ok, failed: fail, totalPointers }));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
