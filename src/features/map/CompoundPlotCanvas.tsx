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
}: {
  meta: CompoundMeta;
  focusPointer?: CompoundPointer | null;
}) {
  const map = useMap();

  useEffect(() => {
    const w = meta.image?.width ?? 16384;
    const h = meta.image?.height ?? 8192;
    const bounds = L.latLngBounds([0, 0], [h, w]);
    map.setMaxBounds(bounds.pad(0.08));

    if (focusPointer && Number.isFinite(focusPointer.x) && Number.isFinite(focusPointer.y)) {
      map.setView(
        [focusPointer.y, focusPointer.x],
        Math.max(map.getZoom(), Math.min(meta.maxZoom, meta.maxZoom - 1)),
      );
      return;
    }

    if (meta.center?.x && meta.center?.y) {
      map.setView([meta.center.y, meta.center.x], Math.min(2, meta.maxZoom));
    } else {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, meta, focusPointer]);

  return null;
}

export type CompoundPlotCanvasProps = {
  meta: CompoundMeta;
  pointers: CompoundPointer[];
  selectedNo?: string | null;
  onSelect?: (p: CompoundPointer) => void;
  labels: { plotNo: string };
};

export function CompoundPlotCanvas({
  meta,
  pointers,
  selectedNo,
  onSelect,
  labels,
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
  const imgW = meta.image?.width ?? 16384;
  const imgH = meta.image?.height ?? 8192;

  return (
    <MapContainer
      key={`${meta.id}-${maxZ}-rh21`}
      crs={crs}
      center={[meta.center.y || 0, meta.center.x || 0]}
      zoom={1}
      minZoom={minZ}
      maxZoom={maxZ}
      scrollWheelZoom
      className="h-full w-full rounded-2xl z-0 rh-compound-map"
      style={{ minHeight: 480, background: '#1a2332' }}
      attributionControl={false}
    >
      <TileLayer
        url={tileUrl}
        tileSize={256}
        noWrap
        minZoom={minZ}
        maxZoom={maxZ}
        bounds={L.latLngBounds([0, 0], [imgH, imgW])}
      />
      <FitCompound meta={meta} focusPointer={focus} />
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
            <div className="text-sm" dir="auto">
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
