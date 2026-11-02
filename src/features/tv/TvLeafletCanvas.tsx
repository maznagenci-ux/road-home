'use client';

import { useEffect, useRef } from 'react';
import type { CompoundMeta, CompoundPointer } from '@/features/map/CompoundPlotCanvas';

type LeafletNS = typeof import('leaflet');

function ensureLeafletCss() {
  if (document.querySelector('link[data-rh-leaflet]')) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vendor/leaflet/leaflet.css';
    link.setAttribute('data-rh-leaflet', '1');
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('leaflet css'));
    document.head.appendChild(link);
  });
}

async function loadLeaflet(): Promise<LeafletNS> {
  await ensureLeafletCss();
  try {
    const mod = await import('leaflet');
    return mod;
  } catch {
    const w = window as Window & { L?: LeafletNS };
    if (!w.L) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[data-rh-leaflet]');
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('leaflet js')));
          return;
        }
        const script = document.createElement('script');
        script.src = '/vendor/leaflet/leaflet.js';
        script.async = true;
        script.setAttribute('data-rh-leaflet', '1');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('leaflet js'));
        document.body.appendChild(script);
      });
    }
    if (!w.L) throw new Error('leaflet missing');
    return w.L;
  }
}

function destroyMap(map: import('leaflet').Map | null, root: HTMLElement | null) {
  try {
    map?.remove();
  } catch {
    /* ignore */
  }
  if (!root) return;
  delete (root as HTMLElement & { _leaflet_id?: number })._leaflet_id;
  root.replaceChildren();
  root.className = 'rh-tv-leaflet-map';
}

const TILE = 256;

/**
 * Draw XYZ plot tiles onto one canvas in the TV viewport.
 * Hisense/WebOS cannot keep HTML Leaflet tiles flush (gaps or tiny squares).
 */
function attachCanvasTiles(
  L: LeafletNS,
  map: import('leaflet').Map,
  folder: string,
): { redraw: () => void; destroy: () => void } {
  const canvas = document.createElement('canvas');
  canvas.className = 'rh-tv-plot-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const pane = map.getPane('tilePane') ?? map.getContainer();
  pane.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const cache = new Map<string, HTMLImageElement>();
  const inflight = new Map<string, HTMLImageElement>();
  let alive = true;
  let gen = 0;
  let raf = 0;

  const urlFor = (z: number, x: number, y: number) =>
    `/api/map/plot-tiles/${folder}/${z}/${x}/${y}?v=rh34`;

  const paint = () => {
    if (!alive || !ctx) return;
    const myGen = ++gen;
    const size = map.getSize();
    if (!size.x || !size.y) return;

    const w = Math.max(1, Math.round(size.x));
    const h = Math.max(1, Math.round(size.y));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint(L.point(0, 0)));

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const z = Math.round(map.getZoom());
    const pb = map.getPixelBounds();
    const originX = pb.min.x;
    const originY = pb.min.y;
    const minX = Math.floor(pb.min.x / TILE);
    const maxX = Math.floor(pb.max.x / TILE);
    const minY = Math.floor(pb.min.y / TILE);
    const maxY = Math.floor(pb.max.y / TILE);

    const drawTile = (img: HTMLImageElement, x: number, y: number) => {
      if (!alive || myGen !== gen) return;
      const sx = Math.floor(x * TILE - originX);
      const sy = Math.floor(y * TILE - originY);
      const sw = Math.floor((x + 1) * TILE - originX) - sx;
      const sh = Math.floor((y + 1) * TILE - originY) - sy;
      if (sw < 1 || sh < 1) return;
      ctx.drawImage(img, sx, sy, sw, sh);
    };

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (x < 0 || y < 0) continue;
        const key = `${z}/${x}/${y}`;
        const hit = cache.get(key);
        if (hit) {
          drawTile(hit, x, y);
          continue;
        }
        if (inflight.has(key)) continue;
        const img = new Image();
        inflight.set(key, img);
        img.onload = () => {
          inflight.delete(key);
          cache.set(key, img);
          if (alive && myGen === gen) drawTile(img, x, y);
        };
        img.onerror = () => {
          inflight.delete(key);
        };
        img.src = urlFor(z, x, y);
      }
    }
  };

  const redraw = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      paint();
    });
  };

  map.on('move zoom resize viewreset', redraw);
  paint();

  return {
    redraw,
    destroy() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      map.off('move zoom resize viewreset', redraw);
      inflight.forEach((img) => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      });
      inflight.clear();
      cache.clear();
      canvas.remove();
    },
  };
}

/**
 * Vanilla Leaflet plot map for Smart TVs — one canvas, not an HTML tile grid.
 */
export function TvLeafletCanvas({
  meta,
  pointers = [],
  focus,
}: {
  meta: CompoundMeta;
  pointers?: CompoundPointer[];
  focus?: CompoundPointer | null;
  /** ignored — TV uses numbers baked into the plot image */
  showLabels?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const canvasRef = useRef<{ redraw: () => void; destroy: () => void } | null>(null);
  const LRef = useRef<LeafletNS | null>(null);
  const pointersRef = useRef(pointers);
  pointersRef.current = pointers;

  useEffect(() => {
    const root = mapRootRef.current;
    if (!root) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const timers: number[] = [];

    destroyMap(mapRef.current, root);
    mapRef.current = null;
    canvasRef.current?.destroy();
    canvasRef.current = null;

    void (async () => {
      try {
        const Lmod = await loadLeaflet();
        if (cancelled || !mapRootRef.current) return;
        const L = (Lmod as LeafletNS & { default?: LeafletNS }).default ?? Lmod;
        LRef.current = L;

        const browser = L.Browser as { retina?: boolean };
        browser.retina = false;

        destroyMap(mapRef.current, mapRootRef.current);

        const maxZ = meta.maxZoom ?? 6;
        const minZ = meta.minZoom ?? 0;
        const imgW = Math.max(1, Math.round(meta.image?.width ?? 16384));
        const imgH = Math.max(1, Math.round(meta.image?.height ?? 8192));
        const s = Math.pow(2, Math.max(0, maxZ));
        const crs = L.extend({}, L.CRS.Simple, {
          transformation: new L.Transformation(1 / s, 0, 1 / s, 0),
        }) as typeof L.CRS.Simple;
        const bounds = L.latLngBounds([0, 0], [imgH, imgW]);
        const centerY = meta.center?.y || imgH / 2;
        const centerX = meta.center?.x || imgW / 2;

        const map = L.map(mapRootRef.current, {
          crs,
          center: [centerY, centerX],
          zoom: Math.min(2, maxZ),
          minZoom: minZ,
          maxZoom: maxZ,
          zoomControl: true,
          attributionControl: false,
          keyboard: false,
          zoomSnap: 1,
          zoomDelta: 1,
          fadeAnimation: false,
          zoomAnimation: false,
          markerZoomAnimation: false,
          inertia: false,
        });
        if (cancelled) {
          destroyMap(map, mapRootRef.current);
          return;
        }
        mapRef.current = map;
        canvasRef.current = attachCanvasTiles(L, map, meta.tileFolder);

        map.setMaxBounds(bounds.pad(0.02));

        const fillStage = () => {
          if (cancelled || !mapRef.current) return;
          map.invalidateSize({ animate: false });
          const size = map.getSize();
          if (!size.x || !size.y) return;

          let z = map.getBoundsZoom(bounds, false, L.point(12, 12));
          if (!Number.isFinite(z) || z < minZ) {
            z = map.getBoundsZoom(bounds, true, L.point(8, 8));
          }
          if (!Number.isFinite(z)) z = Math.min(2, maxZ);
          const openZ = Math.min(maxZ, Math.max(minZ, Math.round(z)));
          map.setView(bounds.getCenter(), openZ, { animate: false });
          canvasRef.current?.redraw();
        };

        fillStage();
        timers.push(window.setTimeout(fillStage, 80));
        timers.push(window.setTimeout(fillStage, 400));

        if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
          let t = 0;
          ro = new ResizeObserver(() => {
            window.clearTimeout(t);
            t = window.setTimeout(() => {
              if (cancelled || !mapRef.current) return;
              map.invalidateSize({ animate: false });
              canvasRef.current?.redraw();
            }, 80);
          });
          ro.observe(hostRef.current);
        }
      } catch (err) {
        console.error('[tv-leaflet]', err);
        if (hostRef.current) {
          hostRef.current.innerHTML =
            '<div class="rh-tv-leaflet-err">نەتوانرا نەخشە باربکرێت — نوێکردنەوە</div>';
        }
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      ro?.disconnect();
      markerRef.current = null;
      canvasRef.current?.destroy();
      canvasRef.current = null;
      destroyMap(mapRef.current, mapRootRef.current);
      mapRef.current = null;
      LRef.current = null;
    };
  }, [
    meta.id,
    meta.tileFolder,
    meta.maxZoom,
    meta.minZoom,
    meta.center?.x,
    meta.center?.y,
    meta.image?.width,
    meta.image?.height,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.y)) return;

    const icon = L.divIcon({
      className: 'rh-compound-marker',
      html: `<div class="rh-compound-pin is-active"><span>${String(focus.no || '—').slice(0, 10)}</span></div>`,
      iconSize: [56, 34],
      iconAnchor: [28, 17],
    });
    const marker = L.marker([focus.y, focus.x], { icon }).addTo(map);
    markerRef.current = marker;
    const targetZ = Math.min(
      meta.maxZoom ?? 6,
      Math.max(Math.round(map.getZoom()), (meta.maxZoom ?? 6) - 1),
    );
    map.setView([focus.y, focus.x], targetZ, { animate: false });
    canvasRef.current?.redraw();
  }, [focus, meta.maxZoom]);

  return (
    <div ref={hostRef} className="rh-tv-leaflet">
      <div ref={mapRootRef} className="rh-tv-leaflet-map" />
    </div>
  );
}
