'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Loader2, Map as MapIcon, ChevronDown, ExternalLink } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';

const MapView = dynamic(
  () => import('@/features/map/MapView').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(45vh,380px)] items-center justify-center rounded-2xl border border-border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

/** Map stays off the critical path until the user opens it. */
export function DashboardMapSection({ t, lang }: { t: Dictionary; lang: string }) {
  const [open, setOpen] = useState(false);
  const m = (t.pages as { map?: Record<string, string> }).map ?? {};

  if (!open) {
    return (
      <section className="w-full max-w-[1400px] mx-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground inline-flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-primary shrink-0" />
              {m.title ?? t.nav.map}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {m.subtitleCompound ??
                'نەخشەی زەویەکانی پڕۆژەکان — کلیک بکە بۆ کردنەوە'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ChevronDown className="h-4 w-4" />
              {m.openMap ?? 'کردنەوەی نەخشە'}
            </button>
            <Link
              href={`/${lang}/map`}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl text-sm font-medium border border-border hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              {m.fullPage ?? 'پەڕەی تەواو'}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-3">
      <div className="max-w-[1400px] mx-auto flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          {m.hideMap ?? 'شاردنەوەی نەخشە'}
        </button>
      </div>
      <MapView t={t} lang={lang} />
    </section>
  );
}
