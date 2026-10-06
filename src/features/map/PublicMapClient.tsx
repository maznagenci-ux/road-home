'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';

const MapView = dynamic(
  () => import('@/features/map/MapView').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(60vh,520px)] items-center justify-center rounded-2xl border border-border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export function PublicMapClient({
  t,
  lang,
  guestMode,
}: {
  t: Dictionary;
  lang: string;
  guestMode: boolean;
}) {
  return <MapView t={t} lang={lang} guestMode={guestMode} />;
}
