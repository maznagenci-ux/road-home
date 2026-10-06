'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Map as MapIcon } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { CompoundMeta, CompoundPointer } from '@/features/map/CompoundPlotCanvas';
import { TvLeafletCanvas } from '@/features/tv/TvLeafletCanvas';
import {
  filterPlotPointers,
  normalizePlotDigits,
  plotRangeLabel,
  withPlotSeq,
  type NumberedPointer,
} from '@/lib/map/plot-search';

type CompoundArea = {
  id: string;
  title: string;
  titleEn?: string;
  keywords?: string;
  plotMapUrl?: string;
};

/**
 * Web-TV map matching desktop MapView layout (toolbar + sidebar + plot map).
 * Hisense-safe: no next/dynamic, vanilla Leaflet.
 */
export function TvSystemMap({ t, lang }: { t: Dictionary; lang: string }) {
  const m = (t.pages as { map?: Record<string, string> }).map ?? {};
  const [areas, setAreas] = useState<CompoundArea[]>([]);
  const [areaQ, setAreaQ] = useState('');
  const [compoundId, setCompoundId] = useState<string | null>('426');
  const [compoundMeta, setCompoundMeta] = useState<CompoundMeta | null>(null);
  const [pointers, setPointers] = useState<NumberedPointer[]>([]);
  const [compoundLoading, setCompoundLoading] = useState(false);
  const [compoundError, setCompoundError] = useState('');
  const [plotQ, setPlotQ] = useState('');
  const [selectedPlotNo, setSelectedPlotNo] = useState<string | null>(null);
  const plotListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/map/compounds');
        if (!res.ok) return;
        const json = (await res.json()) as { areas?: CompoundArea[] };
        setAreas(json.areas ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!compoundId) return;
    let cancelled = false;
    void (async () => {
      setCompoundLoading(true);
      setCompoundError('');
      setSelectedPlotNo(null);
      setPlotQ('');
      setCompoundMeta(null);
      setPointers([]);
      if (plotListRef.current) plotListRef.current.scrollTop = 0;
      try {
        const res = await fetch(`/api/map/compounds/${compoundId}`);
        if (cancelled) return;
        if (!res.ok) {
          setCompoundError(
            res.status === 404
              ? (m.compoundNotReady ?? 'ئەم پڕۆژەیە نەخشەی زەوی نییە')
              : (m.compoundLoadError ?? 'نەتوانرا نەخشەی پڕۆژە باربکرێت'),
          );
          setCompoundLoading(false);
          return;
        }
        const json = (await res.json()) as CompoundMeta;
        setCompoundMeta(json);
        setCompoundLoading(false);

        // Load ALL plot numbers (slim) — needed for complete list + map labels
        void (async () => {
          try {
            const pr = await fetch(`/api/map/compounds/${compoundId}?pointers=slim&v=rh31`);
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
            setPointers(withPlotSeq(list));
            setCompoundMeta((prev) =>
              prev ? { ...prev, pointerCount: full.pointerCount ?? list.length } : full,
            );
          } catch {
            /* map visible without list */
          }
        })();
      } catch {
        if (!cancelled) {
          setCompoundError(m.compoundLoadError ?? 'نەتوانرا نەخشەی پڕۆژە باربکرێت');
          setCompoundLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compoundId, m.compoundLoadError, m.compoundNotReady]);

  useEffect(() => {
    if (!compoundId || !areas.length) return;
    const tmr = window.setTimeout(() => {
      const safe =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(compoundId)
          : compoundId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      document
        .querySelector(`[data-compound-id="${safe}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }, 120);
    return () => window.clearTimeout(tmr);
  }, [compoundId, areas.length]);

  const filteredAreas = useMemo(() => {
    const s = areaQ.trim().toLowerCase();
    const list = areas.filter((a) => {
      if (!a.plotMapUrl) return false;
      if (!s) return true;
      return (
        a.title.toLowerCase().includes(s) ||
        (a.titleEn || '').toLowerCase().includes(s) ||
        (a.keywords || '').toLowerCase().includes(s)
      );
    });
    return s ? list.slice(0, 100) : list;
  }, [areas, areaQ]);

  /** Full matching list — official no OR sequential index (1 = first plot). */
  const filteredPointers = useMemo(
    () => filterPlotPointers(pointers, plotQ),
    [pointers, plotQ],
  );

  // One exact hit (e.g. search "1" or "32") → jump map to that plot
  useEffect(() => {
    if (!plotQ.trim() || filteredPointers.length !== 1) return;
    const only = filteredPointers[0];
    if (!only) return;
    setSelectedPlotNo(only.no);
  }, [plotQ, filteredPointers]);

  const rangeLabel = useMemo(() => plotRangeLabel(pointers), [pointers]);

  const compoundTitle =
    lang === 'en'
      ? compoundMeta?.title
      : compoundMeta?.titleKu || compoundMeta?.title;

  const focus = useMemo(
    () => pointers.find((p) => p.no === selectedPlotNo) ?? null,
    [pointers, selectedPlotNo],
  );

  return (
    <div className="rh-tv-mapview">
      <div className="rh-tv-mapview-toolbar">
        <div>
          <h1 className="rh-tv-mapview-title">
            <MapIcon className="rh-tv-mapview-title-icon" />
            {m.title ?? 'نەخشە'}
          </h1>
          <p className="rh-tv-mapview-sub">
            {m.subtitleCompound ??
              'نەخشەی زەویەکانی پڕۆژەکان — پڕۆژە هەڵبژێرە و ژمارەی پارچەکان ببینە'}
          </p>
        </div>
        <div className="rh-tv-mapview-actions">
          <div className="rh-tv-mapview-mode">
            <button type="button" className="is-active" data-tv-focus>
              {m.modeCompound ?? 'نەخشەی پڕۆژە'}
            </button>
          </div>
        </div>
      </div>

      <div className="rh-tv-mapview-grid">
        <aside className="rh-tv-mapview-aside">
          <div className="rh-tv-mapview-aside-head">
            <p className="rh-tv-mapview-aside-label">{m.compoundList ?? 'پڕۆژە / ناوچەکان'}</p>
            <input
              className="rh-tv-mapview-input"
              placeholder={m.searchCompound ?? 'گەڕان بە ناوی پڕۆژە'}
              value={areaQ}
              onChange={(e) => setAreaQ(e.target.value)}
              data-tv-focus
            />
          </div>
          <div className="rh-tv-mapview-aside-list rh-tv-mapview-aside-areas">
            <ul>
              {filteredAreas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    data-compound-id={a.id}
                    data-tv-focus
                    onClick={() => setCompoundId(a.id)}
                    className={compoundId === a.id ? 'is-active' : undefined}
                  >
                    <span className="rh-tv-mapview-area-title">{a.title}</span>
                    {a.titleEn && a.titleEn !== a.title ? (
                      <span className="rh-tv-mapview-area-en" dir="ltr">
                        {a.titleEn}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rh-tv-mapview-aside-head">
            <p className="rh-tv-mapview-aside-label">
              {m.plotList ?? 'رەقەمی ئەرزەکان'}
              <span className="rh-tv-mapview-count">
                {' '}
                ({pointers.length}
                {plotQ.trim() ? ` · ${filteredPointers.length}` : ''})
              </span>
            </p>
            {pointers.length > 0 && rangeLabel ? (
              <p className="rh-tv-mapview-range" dir="ltr">
                {rangeLabel}
              </p>
            ) : null}
            <input
              className="rh-tv-mapview-input rh-tv-mapview-input-num"
              placeholder={m.searchPlotNo ?? 'گەڕان بە رەقەمی ئەرز'}
              value={plotQ}
              inputMode="numeric"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              dir="ltr"
              onChange={(e) => {
                const next = normalizePlotDigits(e.target.value);
                setPlotQ(next);
                setSelectedPlotNo(null);
                if (plotListRef.current) plotListRef.current.scrollTop = 0;
              }}
              data-tv-focus
            />
            {plotQ.trim() && filteredPointers.length === 0 ? (
              <p className="rh-tv-mapview-aside-hint">
                {m.plotNotFound ?? 'ئەم ژمارەیە لەم پڕۆژەیەدا نییە'}
                {rangeLabel ? ` (${rangeLabel})` : ''}
              </p>
            ) : null}
          </div>
          <div
            className="rh-tv-mapview-aside-list rh-tv-mapview-aside-plots"
            ref={plotListRef}
          >
            {compoundLoading && !pointers.length ? (
              <div className="rh-tv-mapview-aside-empty">
                <Loader2 className="rh-tv-spin" />
              </div>
            ) : filteredPointers.length === 0 ? (
              <div className="rh-tv-mapview-aside-empty">
                {m.emptyCompoundPlots ?? 'رەقەمێک نەدۆزرایەوە'}
              </div>
            ) : (
              <ul dir="ltr">
                {filteredPointers.map((p) => (
                  <li key={`${p.id}-${p.seq}`}>
                    <button
                      type="button"
                      data-tv-focus
                      onClick={() => setSelectedPlotNo(p.no)}
                      className={selectedPlotNo === p.no ? 'is-active' : undefined}
                    >
                      <span className="rh-tv-mapview-plot-no">{p.no}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="rh-tv-mapview-stage">
          {compoundLoading && !compoundMeta ? (
            <div className="rh-tv-mapview-stage-empty">
              <Loader2 className="rh-tv-spin" />
            </div>
          ) : compoundError ? (
            <div className="rh-tv-mapview-stage-empty">{compoundError}</div>
          ) : compoundMeta ? (
            <>
              <div className="rh-tv-mapview-chip" aria-hidden>
                {compoundTitle}
              </div>
              <TvLeafletCanvas
                meta={compoundMeta}
                pointers={pointers}
                focus={focus}
              />
            </>
          ) : (
            <div className="rh-tv-mapview-stage-empty">
              {m.compoundHelp ?? 'پڕۆژە هەڵبژێرە بۆ بینینی نەخشە'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
