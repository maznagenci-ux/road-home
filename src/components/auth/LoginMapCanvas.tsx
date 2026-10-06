'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LoginCity } from './LoginMapPanel';
import type { Dictionary } from '@/i18n/dictionaries';
import 'leaflet/dist/leaflet.css';

const KURDISTAN_BOUNDS: [[number, number], [number, number]] = [
  [34.7, 42.2],
  [37.5, 46.3],
];

function cityIcon(label: string, active: boolean) {
  const safe = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return L.divIcon({
    className: 'rh-login-map-marker',
    html: `<div class="rh-login-pin${active ? ' is-active' : ''}"><span>${safe}</span></div>`,
    iconSize: [96, 36],
    iconAnchor: [48, 18],
  });
}

function FlyTo({
  focus,
}: {
  focus: { lat: number; lng: number; zoom: number };
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 1.35 });
  }, [map, focus.lat, focus.lng, focus.zoom]);
  return null;
}

export function LoginMapCanvas({
  cities,
  focus,
  selectedId,
  labels,
}: {
  cities: LoginCity[];
  focus: { lat: number; lng: number; zoom: number };
  selectedId: string;
  labels?: Dictionary['auth']['cities'];
}) {
  return (
    <MapContainer
      center={[focus.lat, focus.lng]}
      zoom={focus.zoom}
      className="absolute inset-0 z-0 h-full w-full"
      zoomControl={false}
      attributionControl={false}
      maxBounds={KURDISTAN_BOUNDS}
      maxBoundsViscosity={0.85}
      scrollWheelZoom={false}
      dragging
      doubleClickZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />
      <FlyTo focus={focus} />
      {cities.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={cityIcon(labels?.[c.id] ?? c.id, c.id === selectedId)}
        />
      ))}
    </MapContainer>
  );
}
