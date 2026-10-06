'use client';

import type { Dictionary } from '@/i18n/dictionaries';
import { TvSystemMap } from '@/features/tv/TvSystemMap';

/**
 * Web-TV = same system MapView layout (sidebar + map).
 * Static import only — Hisense cannot load next/dynamic MapView chunks.
 */
export function TvMapPanel({
  t,
  lang,
}: {
  t: Dictionary;
  lang: string;
  fill?: boolean;
  guestMode?: boolean;
}) {
  return (
    <div className="rh-tv-mapview-host">
      <TvSystemMap t={t} lang={lang} />
    </div>
  );
}
