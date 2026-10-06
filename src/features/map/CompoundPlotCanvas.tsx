'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type CompoundMeta = {
  id: string;
  title: string;
  titleKu?: string;
  tileFolder: string;
  minZoom: number;
  maxZoom: number;
  center: { x: number; y: number };
  image: { width: number; height: number } | null;
  pointerCount?: number;
};

export type CompoundPointer = {
  id: string;
  no: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
};

function createPlotCrs(maxZoom: number) {
  const s = Math.pow(2, Math.max(0, maxZoom));
  return L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(1 / s, 0, 1 / s, 0),
  }) as typeof L.CRS.Simple;
}

function plotIcon(plotNo: string) {
  const label = (plotNo || '—').slice(0, 10);
  return L.divIcon({
    className: 'rh-compound-marker',
    html: `<div class="rh-compound-pin is-active"><span>${escapeHtml(label)}</span></div>`,
    iconSize: [44, 28],
    iconAnchor: [22, 14],
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function FitCompound({
  meta,
  focusPointer,
  fillViewport = false,
}: {
  meta: CompoundMeta;
  focusPointer?: CompoundPointer | null;
  /** TV / large screens — fit image to container instead of fixed low zoom */
  fillViewport?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const w = Math.max(1, Math.round(meta.image?.width ?? 16384));
    const h = Math.max(1, Math.round(meta.image?.height ?? 8192));
    const bounds = L.latLngBounds([0, 0], [h, w]);
    map.setMaxBounds(bounds.pad(0.08));

    const apply = () => {
      map.invalidateSize({ animate: false });

      if (focusPointer && Number.isFinite(focusPointer.x) && Number.isFinite(focusPointer.y)) {
        map.setView(
          [focusPointer.y, focusPointer.x],
          Math.max(map.getZoom(), Math.min(meta.maxZoom, meta.maxZoom - 1)),
        );
        return;
      }

      // Always cover-fill the stage so the plot map isn't a tiny white patch
      const size = map.getSize();
      if (!size.x || !size.y) {
        map.invalidateSize({ animate: false });
      }
      let z = map.getBoundsZoom(bounds, true, L.point(8, 8));
      if (!Number.isFinite(z) || z < (meta.minZoom ?? 0)) {
        z = map.getBoundsZoom(bounds, false, L.point(16, 16));
      }
      const openZ = Math.min(
        meta.maxZoom ?? 6,
        Math.max(Number.isFinite(z) ? z : 2, (meta.minZoom ?? 0)),
      );
      map.setView(bounds.getCenter(), openZ);
    };

    apply();
    const t = window.setTimeout(apply, 80);
    const t2 = window.setTimeout(apply, 320);
    const t3 = window.setTimeout(apply, 700);
    const t4 = window.setTimeout(apply, 1400);

    const el = map.getContainer();
    const stage = el?.parentElement;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize({ animate: false });
            if (fillViewport && !focusPointer) apply();
          })
        : null;
    if (ro && el) ro.observe(el);
    if (ro && stage) ro.observe(stage);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      ro?.disconnect();
    };
  }, [map, meta, focusPointer, fillViewport]);

  return null;
}

export type CompoundPlotCanvasProps = {
  meta: CompoundMeta;
  pointers: CompoundPointer[];
  selectedNo?: string | null;
  onSelect?: (p: CompoundPointer) => void;
  labels: { plotNo: string };
  /** When true, fit the plot image to the map container (TV fullscreen). */
  fillViewport?: boolean;
};

export function CompoundPlotCanvas({
  meta,
  pointers,
  selectedNo,
  onSelect,
  labels,
  fillViewport = false,
}: CompoundPlotCanvasProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const crs = useMemo(() => createPlotCrs(meta.maxZoom ?? 6), [meta.maxZoom]);

  const focus = useMemo(
    () => pointers.find((p) => p.no === selectedNo) ?? null,
    [pointers, selectedNo],
  );

  const visible = useMemo(() => {
    if (!selectedNo) return [];
    return pointers.filter((p) => p.no === selectedNo).slice(0, 1);
  }, [pointers, selectedNo]);

  if (!mounted) {
    return <div className="h-full w-full bg-muted/40" />;
  }

  const tileUrl = `/api/map/plot-tiles/${meta.tileFolder}/{z}/{x}/{y}?v=rh21`;
  const minZ = meta.minZoom ?? 0;
  const maxZ = meta.maxZoom ?? 6;
  const imgW = Math.max(1, Math.round(meta.image?.width ?? 16384));
  const imgH = Math.max(1, Math.round(meta.image?.height ?? 8192));
  const centerY = Number(meta.center?.y);
  const centerX = Number(meta.center?.x);

  return (
    <MapContainer
      key={`${meta.id}-${maxZ}-${imgW}x${imgH}`}
      crs={crs}
      center={[Number.isFinite(centerY) ? centerY : imgH / 2, Number.isFinite(centerX) ? centerX : imgW / 2]}
      zoom={1}
      minZoom={minZ}
      maxZoom={maxZ}
      scrollWheelZoom
      className="h-full w-full z-0 rh-compound-map"
      style={{
        height: '100%',
        width: '100%',
        minHeight: fillViewport ? '100%' : 480,
        background: '#1a2332',
      }}
      attributionControl={false}
      keyboard={false}
    >
      <TileLayer
        url={tileUrl}
        tileSize={256}
        noWrap
        minZoom={minZ}
        maxZoom={maxZ}
        maxNativeZoom={maxZ}
        bounds={L.latLngBounds([0, 0], [imgH, imgW])}
        errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
      />
      <FitCompound meta={meta} focusPointer={focus} fillViewport />
      {visible.map((p) => (
        <Marker
          key={p.id}
          position={[p.y, p.x]}
          icon={plotIcon(p.no)}
          eventHandlers={{
            click: () => onSelect?.(p),
          }}
        >
          <Popup>
            <div className="text-sm" dir="ltr">
              <p className="font-bold tabular-nums">
                {labels.plotNo}: {p.no}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
