'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Loader2, Minus, Plus, Search, X } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { CompoundMeta, CompoundPointer } from '@/features/map/CompoundPlotCanvas';
import { TvLeafletCanvas } from '@/features/tv/TvLeafletCanvas';

type CompoundArea = {
  id: string;
  title: string;
  titleEn?: string;
  keywords?: string;
};

type SearchHit =
  | { kind: 'compound'; id: string; label: string; sub?: string }
  | { kind: 'plot'; no: string; label: string };

function clickZoom(wrap: HTMLElement | null, sel: string) {
  wrap?.querySelector<HTMLElement>(sel)?.click();
}

/**
 * TV-only fullscreen compound map — vanilla Leaflet (Hisense-safe, no dynamic import).
 */
export function TvCompoundMap({ t }: { t: Dictionary; lang: string }) {
  const m = (t.pages as { map?: Record<string, string> }).map ?? {};
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [areas, setAreas] = useState<CompoundArea[]>([]);
  const [index, setIndex] = useState(0);
  const [meta, setMeta] = useState<CompoundMeta | null>(null);
  const [pointers, setPointers] = useState<CompoundPointer[]>([]);
  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/map/compounds');
        if (!res.ok) throw new Error('compounds');
        const json = (await res.json()) as { areas?: CompoundArea[] };
        const list = json.areas ?? [];
        if (cancelled) return;
        setAreas(list);
        const preferred = list.findIndex((a) => a.id === '426');
        setIndex(preferred >= 0 ? preferred : 0);
        if (list.length === 0) {
          setLoading(false);
          setError(m.loadError ?? 'نەتوانرا نەخشە باربکرێت');
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setError(m.loadError ?? 'نەتوانرا نەخشە باربکرێت');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [m.loadError]);

  const compoundId = areas[index]?.id ?? null;

  useEffect(() => {
    if (!compoundId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setSelectedNo(null);
    (async () => {
      try {
        // Meta first so tiles paint; pointers later (TV memory).
        const res = await fetch(`/api/map/compounds/${compoundId}`);
        if (!res.ok) throw new Error('compound');
        const json = (await res.json()) as CompoundMeta & {
          pointers?: CompoundPointer[];
        };
        if (cancelled) return;
        setMeta(json);
        setPointers([]);
        setLoading(false);

        window.setTimeout(() => {
          if (cancelled) return;
          void (async () => {
            try {
              const pr = await fetch(`/api/map/compounds/${compoundId}?pointers=slim`);
              if (!pr.ok || cancelled) return;
              const full = (await pr.json()) as CompoundMeta & {
                pointerFormat?: string;
                pointers?: CompoundPointer[] | Array<[string, number, number]>;
              };
              if (cancelled) return;
              const raw = full.pointers ?? [];
              const list: CompoundPointer[] =
                full.pointerFormat === 'slim'
                  ? (raw as Array<[string, number, number]>).map(([no, x, y], i) => ({
                      id: `${compoundId}-${i}`,
                      no: String(no),
                      x,
                      y,
                      lat: 0,
                      lng: 0,
                    }))
                  : (raw as CompoundPointer[]);
              setPointers(list);
              setMeta((prev) =>
                prev ? { ...prev, pointerCount: full.pointerCount ?? list.length } : full,
              );
            } catch {
              /* map already visible */
            }
          })();
        }, 300);
      } catch {
        if (!cancelled) {
          setMeta(null);
          setPointers([]);
          setError(m.loadError ?? 'نەتوانرا نەخشە باربکرێت');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compoundId, m.loadError]);

  const title =
    meta?.titleKu || meta?.title || areas[index]?.title || (m.title ?? 'نەخشە');

  const hits = useMemo((): SearchHit[] => {
    const s = query.trim().toLowerCase();
    if (!s) return [];
    const out: SearchHit[] = [];

    for (const a of areas) {
      const blob = `${a.id} ${a.title} ${a.titleEn ?? ''} ${a.keywords ?? ''}`.toLowerCase();
      if (blob.includes(s) || a.id === query.trim()) {
        out.push({
          kind: 'compound',
          id: a.id,
          label: a.title || a.titleEn || a.id,
          sub: `#${a.id}`,
        });
      }
      if (out.filter((h) => h.kind === 'compound').length >= 8) break;
    }

    const plotMatches = pointers
      .filter((p) => p.no.toLowerCase().includes(s) || p.no === query.trim())
      .slice(0, 12)
      .map(
        (p): SearchHit => ({
          kind: 'plot',
          no: p.no,
          label: `${m.plotNo ?? 'رەقەمی ئەرز'} ${p.no}`,
        }),
      );

    return [...out, ...plotMatches].slice(0, 16);
  }, [areas, pointers, query, m.plotNo]);

  const pickCompound = (id: string) => {
    const i = areas.findIndex((a) => a.id === id);
    if (i >= 0) setIndex(i);
    setQuery('');
    setSearchOpen(false);
  };

  const pickPlot = (no: string) => {
    setSelectedNo(no);
    setQuery('');
    setSearchOpen(false);
  };

  const resetView = () => {
    setSelectedNo(null);
    const w = wrapRef.current;
    // Remount-friendly: zoom out then in triggers FitCompound via selection clear;
    // also poke leaflet zoom as fallback.
    for (let i = 0; i < 4; i++) clickZoom(w, '.leaflet-control-zoom-out');
    for (let i = 0; i < 3; i++) clickZoom(w, '.leaflet-control-zoom-in');
  };

  return (
    <div className="rh-tv-map-only">
      <header className="rh-tv-map-topbar">
        <div className="rh-tv-map-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark.png"
            alt="ZMKH Road Home"
            width={88}
            height={88}
            className="rh-tv-map-logo"
          />
          <div className="rh-tv-map-brand-text">
            <span className="rh-tv-map-brand-name">ZMKH رۆد هۆم</span>
            <span className="rh-tv-map-brand-sub">{title}</span>
          </div>
        </div>

        <div className="rh-tv-map-search-wrap">
          <div className="rh-tv-map-search-row">
            <label className="rh-tv-map-search" htmlFor="tv-map-search">
              <Search className="rh-tv-icon-inline" aria-hidden />
              <input
                ref={searchRef}
                id="tv-map-search"
                type="search"
                inputMode="search"
                autoComplete="off"
                data-tv-focus
                className="rh-tv-map-search-input"
                placeholder={
                  m.tvSearchPlaceholder ?? 'گەڕان: ناوی نەخشە یان ژمارەی نەخشە / ئەرز'
                }
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const first = hits[0];
                    if (!first) return;
                    if (first.kind === 'compound') pickCompound(first.id);
                    else pickPlot(first.no);
                  }
                }}
              />
              {query ? (
                <button
                  type="button"
                  className="rh-tv-map-search-clear"
                  data-tv-focus
                  aria-label="Clear"
                  onClick={() => {
                    setQuery('');
                    setSearchOpen(false);
                    searchRef.current?.focus();
                  }}
                >
                  <X className="rh-tv-icon-inline" />
                </button>
              ) : null}
            </label>
            <button
              type="button"
              className="rh-tv-btn rh-tv-btn-primary rh-tv-map-search-btn"
              data-tv-focus
              onClick={() => {
                setSearchOpen(true);
                const first = hits[0];
                if (first?.kind === 'compound') pickCompound(first.id);
                else if (first?.kind === 'plot') pickPlot(first.no);
                else searchRef.current?.focus();
              }}
            >
              <Search className="rh-tv-icon-inline" />
              گەڕان
            </button>
          </div>

          {searchOpen && query.trim() ? (
            <div className="rh-tv-map-search-results" role="listbox">
              {hits.length === 0 ? (
                <p className="rh-tv-map-search-empty">هیچ ئەنجامێک نەدۆزرایەوە</p>
              ) : (
                hits.map((h) =>
                  h.kind === 'compound' ? (
                    <button
                      key={`c-${h.id}`}
                      type="button"
                      role="option"
                      className="rh-tv-map-search-hit"
                      data-tv-focus
                      onClick={() => pickCompound(h.id)}
                    >
                      <span className="rh-tv-map-search-hit-kind">نەخشە</span>
                      <span className="rh-tv-map-search-hit-label">{h.label}</span>
                      {h.sub ? (
                        <span className="rh-tv-map-search-hit-sub">{h.sub}</span>
                      ) : null}
                    </button>
                  ) : (
                    <button
                      key={`p-${h.no}`}
                      type="button"
                      role="option"
                      className="rh-tv-map-search-hit"
                      data-tv-focus
                      onClick={() => pickPlot(h.no)}
                    >
                      <span className="rh-tv-map-search-hit-kind">ئەرز</span>
                      <span className="rh-tv-map-search-hit-label">{h.label}</span>
                    </button>
                  ),
                )
              )}
            </div>
          ) : null}
        </div>

        <div className="rh-tv-map-tools">
          <button
            type="button"
            className="rh-tv-btn rh-tv-btn-primary"
            data-tv-focus
            onClick={() => clickZoom(wrapRef.current, '.leaflet-control-zoom-in')}
          >
            <Plus className="rh-tv-icon-inline" /> Zoom +
          </button>
          <button
            type="button"
            className="rh-tv-btn"
            data-tv-focus
            onClick={() => clickZoom(wrapRef.current, '.leaflet-control-zoom-out')}
          >
            <Minus className="rh-tv-icon-inline" /> Zoom −
          </button>
          <button type="button" className="rh-tv-btn" data-tv-focus onClick={resetView}>
            <Crosshair className="rh-tv-icon-inline" /> Reset
          </button>
        </div>
      </header>

      <div className="rh-tv-map-stage" ref={wrapRef}>
        {loading ? (
          <div className="rh-tv-map-loading">
            <Loader2 className="rh-tv-icon rh-tv-spin" />
            <p>بارکردنی نەخشە…</p>
          </div>
        ) : error ? (
          <div className="rh-tv-map-loading">
            <p className="rh-tv-error">{error}</p>
            <button
              type="button"
              className="rh-tv-btn rh-tv-btn-primary"
              data-tv-focus
              onClick={() => window.location.reload()}
            >
              نوێکردنەوە
            </button>
          </div>
        ) : meta ? (
          <TvLeafletCanvas
            meta={meta}
            pointers={pointers}
            focus={pointers.find((p) => p.no === selectedNo) ?? null}
          />
        ) : null}

        {selectedNo ? (
          <div className="rh-tv-map-chip" aria-live="polite">
            {m.plotNo ?? 'رەقەمی ئەرز'}: {selectedNo}
          </div>
        ) : null}
      </div>
    </div>
  );
}
