/**
 * Build local compound plot catalog from Homele props (Erbil compounds).
 * Writes public/data/compounds/* for the in-app plot map viewer.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const outDir = path.join(__dirname, '..', 'public', 'data', 'compounds');
fs.mkdirSync(outDir, { recursive: true });

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' } }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function extractPage(html) {
  const start = html.indexOf('data-page="');
  if (start < 0) throw new Error('no data-page');
  let i = start + 'data-page="'.length;
  let out = '';
  while (i < html.length && html[i] !== '"') {
    out += html[i++];
  }
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
  return plot.version ? `${plot.area_id}_${plot.version}` : String(plot.area_id);
}

(async () => {
  const page = JSON.parse(
    fs.readFileSync(path.join(__dirname, '_homele-plots-page.json'), 'utf8'),
  );
  const areas = page.props?.areas || page.areas || [];
  // Erbil city_id is typically 3 in Homele; also keep any with plot_map_url
  const withPlots = areas.filter((a) => a.plot_map_url && a.meta?.has_plot !== 0);

  const index = withPlots.map((a) => ({
    id: String(a.id),
    title: a.title,
    titleEn: a.translations?.en?.title || a.title,
    keywords: a.search_keywords || '',
    latlng: a.latlng || null,
    plotMapUrl: a.plot_map_url,
  }));

  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  console.log('index', index.length);

  // Seed featured compounds: 32 Park (user example / Sarbasti), 34 Park, Four Season
  const featured = [426, 2224, 1821];
  for (const id of featured) {
    const html = await get(`https://new.homele.com/plots/${id}`);
    const props = extractPage(html).props;
    const plot = props.plot;
    const folder = tileFolder(plot, props.plot_base_url);
    let georef = null;
    try {
      georef = typeof plot.georef === 'string' ? JSON.parse(plot.georef) : plot.georef;
    } catch {
      georef = null;
    }
    const [cx, cy] = String(plot.center || '0,0')
      .split(',')
      .map((n) => Number(n.trim()));
    const meta = {
      id: String(id),
      title: plot.area?.title || String(id),
      titleKu: plot.area?.search_keywords?.split(',')?.[2] || plot.area?.title,
      tileFolder: folder,
      plotBaseUrl: props.plot_base_url,
      minZoom: plot.min_zoom ?? 0,
      maxZoom: plot.max_zoom ?? 6,
      center: { x: cx, y: cy },
      image: georef
        ? { width: georef.img_w, height: georef.img_h, corners: georef.corners }
        : null,
      pointerCount: Array.isArray(plot.pointers) ? plot.pointers.length : 0,
    };
    const pointers = (plot.pointers || []).map((p) => ({
      id: String(p.id),
      no: String(p.title || ''),
      x: Number(p.x),
      y: Number(p.y),
      lat: Number(p.lat),
      lng: Number(p.lng),
    }));
    fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(meta, null, 2));
    fs.writeFileSync(path.join(outDir, `${id}-pointers.json`), JSON.stringify(pointers));
    console.log('wrote', id, meta.title, 'tiles', folder, 'pointers', pointers.length);
  }
})();
