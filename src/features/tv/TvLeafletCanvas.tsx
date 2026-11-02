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

function prepareTvLeaflet(L: LeafletNS) {
  const browser = L.Browser as {
    retina?: boolean;
    safari?: boolean;
  };
  // 4K TVs report retina and request @2x tiles at half CSS size → gapped grid.
  browser.retina = false;
  // leaflet-safari forces a 1600×1600 tile container that shatters this plot pyramid.
  browser.safari = false;

  const w = window as Window & { __rhTvLeafletTf?: boolean };
  if (w.__rhTvLeafletTf) return;
  w.__rhTvLeafletTf = true;
  const orig = L.DomUtil.setTransform;
  L.DomUtil.setTransform = function (el, offset, scale) {
    if (offset) {
      offset = L.point(Math.round(offset.x), Math.round(offset.y));
    }
    return orig.call(this, el, offset, scale);
  };
}

/**
 * TV plot map. Same Leaflet tile system as desktop — integer zoom, 256px tiles,
 * 3D positioning kept so the tile pane can scale without becoming tiny squares.
 */
export function TvLeafletCanvas({
  meta,
  pointers = [],
  focus,
}: {
  meta: CompoundMeta;
  pointers?: CompoundPointer[];
  focus?: CompoundPointer | null;
  showLabels?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
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

    void (async () => {
      try {
        const Lmod = await loadLeaflet();
        if (cancelled || !mapRootRef.current) return;
        const L = (Lmod as LeafletNS & { default?: LeafletNS }).default ?? Lmod;
        LRef.current = L;
        prepareTvLeaflet(L);

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

        L.tileLayer(`/api/map/plot-tiles/${meta.tileFolder}/{z}/{x}/{y}?v=rh35`, {
          tileSize: 256,
          zoomOffset: 0,
          detectRetina: false,
          noWrap: true,
          minZoom: minZ,
          maxZoom: maxZ,
          maxNativeZoom: maxZ,
          bounds,
          keepBuffer: 2,
          updateWhenIdle: true,
          updateWhenZooming: false,
          className: 'rh-tv-plot-tile',
          errorTileUrl:
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        }).addTo(map);

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
  }, [focus, meta.maxZoom]);

  return (
    <div ref={hostRef} className="rh-tv-leaflet">
      <div ref={mapRootRef} className="rh-tv-leaflet-map" />
    </div>
  );
}
