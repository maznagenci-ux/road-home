'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/I18nProvider';
import type { Dictionary } from '@/i18n/dictionaries';

type CityId = keyof Dictionary['auth']['cities'];

export type LoginCity = {
  id: CityId;
  lat: number;
  lng: number;
  zoom: number;
};

/** Kurdistan Region city anchors for the login map. */
export const LOGIN_CITIES: LoginCity[] = [
  { id: 'erbil', lat: 36.1911, lng: 44.0093, zoom: 12 },
  { id: 'sulaymaniyah', lat: 35.555, lng: 45.433, zoom: 12 },
  { id: 'duhok', lat: 36.867, lng: 42.983, zoom: 12 },
  { id: 'zakho', lat: 37.144, lng: 42.682, zoom: 12 },
  { id: 'halabja', lat: 35.179, lng: 45.986, zoom: 12 },
  { id: 'kirkuk', lat: 35.4681, lng: 44.3922, zoom: 12 },
];

const INTERVAL_MS = 6000;

const LoginMapCanvas = dynamic(
  () => import('./LoginMapCanvas').then((m) => m.LoginMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0b1f38] text-white/70">
        <MapPin className="h-8 w-8 animate-pulse" />
      </div>
    ),
  },
);

export function LoginMapPanel({
  className,
  developerCreditPrefix,
  developerName,
}: {
  className?: string;
  developerCreditPrefix?: string;
  developerName?: string;
}) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOGIN_CITIES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, mounted]);

  const active = LOGIN_CITIES[index];
  const cities = t.auth.cities;
  const label = cities?.[active.id] ?? active.id;
  const caption = t.auth.cityCaption ?? t.nav.map ?? 'نەخشە';
  const mapTitle = t.nav.map ?? 'نەخشە';

  const focus = useMemo(
    () => ({ lat: active.lat, lng: active.lng, zoom: active.zoom }),
    [active],
  );

  return (
    <div
      className={cn('relative isolate overflow-hidden bg-[#0b1f38] text-white', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <LoginMapCanvas cities={LOGIN_CITIES} focus={focus} selectedId={active.id} labels={cities} />

      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-black/15 to-black/25" />

      <div className="relative z-[3] flex h-full min-h-[inherit] flex-col justify-end p-5 sm:p-8 md:p-10 lg:p-12 pointer-events-none">
        <div className="pointer-events-auto space-y-4 max-w-xl">
          <div key={`${active.id}-${label}`} className="rh-city-caption">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-white/60 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {mapTitle} · {caption}
            </p>
            <p className="mt-1 text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-semibold text-white tracking-tight">
              {label}
            </p>
            <p className="mt-2 text-sm sm:text-base text-white/70 leading-relaxed max-w-md">
              {t.auth.heroLine}
            </p>
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label={mapTitle}
          >
            {LOGIN_CITIES.map((city, i) => (
              <button
                key={city.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  'min-h-10 px-3.5 rounded-full text-sm font-medium transition-all duration-300 border',
                  i === index
                    ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                    : 'bg-white/10 border-white/20 text-white/85 hover:bg-white/20',
                )}
              >
                {cities?.[city.id] ?? city.id}
              </button>
            ))}
          </div>

          {developerCreditPrefix ? (
            <p className="pt-2 text-[11px] sm:text-xs text-white/50 border-t border-white/10">
              {developerCreditPrefix}{' '}
              <a
                href="https://www.facebook.com/profile.php?id=61590509712166&mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white/80 hover:text-white underline-offset-2 hover:underline"
              >
                {developerName ?? 'Mazn Agency'}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
