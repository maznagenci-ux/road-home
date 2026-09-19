'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { MapPlot } from '@/lib/map/types';
import { ERBIL_BOUNDS, ERBIL_CENTER } from '@/lib/map/erbil';
import 'leaflet/dist/leaflet.css';

/** Kasnazan / 100m corridor — where empty land parcels appear on OSM. */
export const KASNAZAN_VIEW = { lat: 36.192, lng: 44.072, zoom: 15 } as const;

function plotIcon(plotNo: string) {
  const label = (plotNo || '—').slice(0, 14);
  return L.divIcon({
    className: 'rh-plot-marker',
    html: `<div class="rh-plot-pin"><span class="rh-plot-no">${escapeHtml(label)}</span></div>`,
    iconSize: [56, 40],
    iconAnchor: [28, 20],
    popupAnchor: [0, -18],
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function MapController({
  plots,
  focus,
  selectedId,
}: {
  plots: MapPlot[];
  focus?: { lat: number; lng: number; zoom?: number } | null;
  selectedId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(ERBIL_BOUNDS);
  }, [map]);

  useEffect(() => {
    if (focus) {
      map.setView([focus.lat, focus.lng], focus.zoom ?? 15);
      return;
    }
    if (selectedId) {
      const hit = plots.find((p) => p.id === selectedId);
      if (hit) {
        map.setView([hit.lat, hit.lng], Math.max(map.getZoom(), 16));
        return;
      }
    }
  }, [map, focus, selectedId, plots]);

  return null;
}

function MapClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export type ErbilMapCanvasProps = {
  plots: MapPlot[];
  lang: string;
  pinMode: boolean;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  selectedId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  labels: {
    plotNo: string;
    code: string;
    neighborhood: string;
    name: string;
    clickHint: string;
  };
};

export function ErbilMapCanvas({
  plots,
  pinMode,
  focus,
  selectedId,
  onMapClick,
  labels,
}: ErbilMapCanvasProps) {
  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const p of plots) {
      map.set(p.id, plotIcon(p.plotNo));
    }
    return map;
  }, [plots]);

  return (
    <MapContainer
      center={[KASNAZAN_VIEW.lat, KASNAZAN_VIEW.lng]}
      zoom={KASNAZAN_VIEW.zoom}
      minZoom={8}
      maxZoom={19}
      scrollWheelZoom
      className={`h-full w-full rounded-2xl z-0 ${pinMode ? 'rh-map-pin-mode' : ''}`}
      style={{ minHeight: 480, cursor: pinMode ? 'crosshair' : undefined }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <MapController plots={plots} focus={focus} selectedId={selectedId} />
      <MapClickHandler
        enabled={pinMode}
        onClick={(lat, lng) => onMapClick?.(lat, lng)}
      />

      {plots.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={icons.get(p.id)}
          zIndexOffset={selectedId === p.id ? 800 : 400}
        >
          <Popup>
            <div className="text-sm space-y-1 min-w-[11rem]" dir="auto">
              <p className="font-bold text-lg tabular-nums text-[#0b1f38]">
                {labels.plotNo}: {p.plotNo}
              </p>
              <p>
                {labels.code}: <span className="font-mono">{p.code}</span>
              </p>
              <p>
                {labels.name}: {p.name}
              </p>
              <p>
                {labels.neighborhood}: {p.neighborhood}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export { ERBIL_CENTER };
