'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Map as MapIcon, MapPinPlus, RefreshCw, X, FileDown } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { MapPlot } from '@/lib/map/types';
import { KASNAZAN_VIEW } from '@/features/map/ErbilMapCanvas';
import type { CompoundMeta, CompoundPointer } from '@/features/map/CompoundPlotCanvas';

const ErbilMapCanvas = dynamic(
  () => import('./ErbilMapCanvas').then((m) => m.ErbilMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,640px)] items-center justify-center rounded-2xl border border-border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const CompoundPlotCanvas = dynamic(
  () => import('./CompoundPlotCanvas').then((m) => m.CompoundPlotCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,640px)] items-center justify-center rounded-2xl border border-border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

type MapPayload = {
  plots: MapPlot[];
  source: {
    basemap: string;
    attribution: string;
    geocode: string;
    region: string;
  };
  totalPlaces: number;
  plotted: number;
};

type DraftPin = { lat: number; lng: number };

type CompoundArea = {
  id: string;
  title: string;
  titleEn?: string;
  keywords?: string;
  plotMapUrl?: string;
};

type MapMode = 'city' | 'compound';

export function MapView({ t, lang }: { t: Dictionary; lang: string }) {
  const m = (t.pages as { map?: Record<string, string> }).map ?? {};
  const [mode, setMode] = useState<MapMode>('compound');
  const [data, setData] = useState<MapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [plotNo, setPlotNo] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    KASNAZAN_VIEW,
  );

  const [areas, setAreas] = useState<CompoundArea[]>([]);
  const [areaQ, setAreaQ] = useState('');
  const [compoundId, setCompoundId] = useState<string | null>('426');
  const [compoundMeta, setCompoundMeta] = useState<CompoundMeta | null>(null);
  const [pointers, setPointers] = useState<CompoundPointer[]>([]);
  const [compoundLoading, setCompoundLoading] = useState(false);
  const [compoundError, setCompoundError] = useState('');
  const [plotQ, setPlotQ] = useState('');
  const [selectedPlotNo, setSelectedPlotNo] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  const load = useCallback(
    async (persist = false) => {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/map${persist ? '?persist=1' : ''}`);
      if (!res.ok) {
        setError(m.loadError ?? 'نەتوانرا نەخشە باربکرێت');
        setData(null);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as MapPayload;
      setData(json);
      setLoading(false);
    },
    [m.loadError],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/map/compounds');
      if (!res.ok) return;
      const json = (await res.json()) as { areas: CompoundArea[] };
      setAreas(json.areas ?? []);
    })();
  }, []);

  useEffect(() => {
    if (mode !== 'compound' || !compoundId) return;
    let cancelled = false;
    void (async () => {
      setCompoundLoading(true);
      setCompoundError('');
      setSelectedPlotNo(null);
      setPlotQ('');
      setCompoundMeta(null);
      setPointers([]);
      const res = await fetch(`/api/map/compounds/${compoundId}?pointers=1`);
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
      const json = (await res.json()) as CompoundMeta & { pointers?: CompoundPointer[] };
      setCompoundMeta(json);
      setPointers(json.pointers ?? []);
      setCompoundLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, compoundId, m.compoundLoadError, m.compoundNotReady]);

  const plots = (data?.plots ?? []).filter((p) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      p.plotNo.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) ||
      p.name.toLowerCase().includes(s) ||
      p.neighborhood.toLowerCase().includes(s)
    );
  });

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
    if (!s) return list;
    return list.slice(0, 100);
  }, [areas, areaQ]);

  const filteredPointers = useMemo(() => {
    const s = plotQ.trim();
    if (!s) return pointers.slice(0, 40);
    return pointers.filter((p) => p.no.includes(s)).slice(0, 60);
  }, [pointers, plotQ]);

  const onMapClick = (lat: number, lng: number) => {
    if (!pinMode) return;
    setDraft({ lat, lng });
    setPlotNo('');
    setNeighborhood(lang === 'en' ? 'Kasnazan' : lang === 'ar' ? 'كسنزان' : 'کەسنەزان');
    setName('');
    setSaveError('');
  };

  const savePlot = async () => {
    if (!draft) return;
    const no = plotNo.trim();
    if (!no) {
      setSaveError(m.plotNoRequired ?? 'رەقەمی ئەرز پێویستە');
      return;
    }
    setSaving(true);
    setSaveError('');
    const code = `P-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        plotNo: no,
        neighborhood: neighborhood.trim() || (lang === 'en' ? 'Erbil' : 'هەولێر'),
        name: name.trim() || `${m.plotNo ?? 'رەقەمی ئەرز'} ${no}`,
        province: 'هەولێر',
        city: 'هەولێر',
        lat: draft.lat,
        lng: draft.lng,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(m.saveError ?? 'نەتوانرا رەقەم تۆمار بکرێت');
      return;
    }
    setDraft(null);
    setPinMode(false);
    setFocus({ lat: draft.lat, lng: draft.lng, zoom: 17 });
    await load(false);
  };

  const compoundTitle =
    lang === 'en'
      ? compoundMeta?.title
      : compoundMeta?.titleKu || compoundMeta?.title;

  async function downloadCompoundPdf() {
    if (!compoundId || exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const res = await fetch(`/api/pdf/map/compound/${compoundId}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(err?.message || err?.error || 'export_failed');
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `road-home-map-${compoundId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      setExportError(m.exportError ?? 'نەتوانرا PDF دروست بکرێت — دووبارە هەوڵ بدە');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground inline-flex items-center gap-2">
            <MapIcon className="h-6 w-6 text-primary" />
            {m.title ?? 'نەخشە'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {mode === 'compound'
              ? (m.subtitleCompound ??
                'نەخشەی زەویەکانی پڕۆژەکان — پڕۆژە هەڵبژێرە و ژمارەی پارچەکان ببینە')
              : (m.subtitleParcels ??
                'سندوقە سپییەکان پارچەی زەوین — کلیک بکە و رەقەمی ئەرز تۆمار بکە.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-xl border border-border overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setMode('compound')}
              className={`px-3 py-2 ${
                mode === 'compound' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {m.modeCompound ?? 'نەخشەی پڕۆژە'}
            </button>
            <button
              type="button"
              onClick={() => setMode('city')}
              className={`px-3 py-2 ${
                mode === 'city' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {m.modeCity ?? 'نەخشەی شار'}
            </button>
          </div>
          {mode === 'compound' ? (
            <button
              type="button"
              disabled={!compoundMeta || compoundLoading || exporting}
              onClick={() => void downloadCompoundPdf()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-primary bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50"
              title={m.exportPdfHint ?? 'نەخشە بە کوالێتی تەواو وەک PDF'}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {exporting
                ? (m.exportingPdf ?? 'ئامادەکردنی PDF…')
                : (m.downloadPdf ?? 'داگرتنی PDF')}
            </button>
          ) : null}
          {mode === 'city' ? (
            <>
              <button
                type="button"
                onClick={() => setFocus({ ...KASNAZAN_VIEW })}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border hover:bg-muted"
              >
                {m.gotoKasnazan ?? 'کەسنەزان / ١٠٠ مەتری'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinMode((v) => !v);
                  setDraft(null);
                }}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
                  pinMode
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-primary text-primary-foreground border-primary'
                }`}
              >
                <MapPinPlus className="h-4 w-4" />
                {pinMode
                  ? (m.cancelPin ?? 'هەڵوەشاندنەوەی زیادکردن')
                  : (m.addPlotOnMap ?? 'رەقەم لەسەر نەخشە زیاد بکە')}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void load(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border hover:bg-muted disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {m.refresh ?? 'نوێکردنەوە'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {mode === 'compound' ? (
        <>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {m.compoundHelp ??
              'وەک نەخشەی هۆمڵی: پڕۆژە هەڵبژێرە (بۆ نموونە ٣٢ پارک / سەربەستی) — ژمارەی زەویەکان لەسەر نەخشە دەردەکەون.'}
          </div>
          {exportError ? (
            <p className="text-sm text-rose-600 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              {exportError}
            </p>
          ) : null}
          {exporting ? (
            <p className="text-sm text-amber-900 rounded-xl border border-amber-600/25 bg-amber-500/10 px-4 py-3">
              {m.exportingPdfHint ??
                'نەخشە بە کوالێتی تەواو ئامادە دەکرێت — یەکەم جار چەند خولەک دەخایەنێت.'}
            </p>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">
            <aside className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col max-h-[min(78vh,720px)]">
              <div className="p-3 border-b border-border space-y-2">
                <p className="text-sm font-medium">{m.compoundList ?? 'پڕۆژە / ناوچەکان'}</p>
                <input
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50"
                  placeholder={m.searchCompound ?? 'گەڕان بە ناوی پڕۆژە'}
                  value={areaQ}
                  onChange={(e) => setAreaQ(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto max-h-[220px] border-b border-border">
                <ul className="divide-y divide-border">
                  {filteredAreas.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setCompoundId(a.id)}
                        className={`w-full text-start px-3 py-2.5 hover:bg-muted/60 transition-colors ${
                          compoundId === a.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        {a.titleEn && a.titleEn !== a.title ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5" dir="ltr">
                            {a.titleEn}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 border-b border-border space-y-2">
                <p className="text-sm font-medium">
                  {m.plotList ?? 'رەقەمی ئەرزەکان'}
                  {compoundMeta?.pointerCount != null ? (
                    <span className="text-muted-foreground font-normal tabular-nums">
                      {' '}
                      ({compoundMeta.pointerCount})
                    </span>
                  ) : null}
                </p>
                <input
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50 tabular-nums"
                  placeholder={m.searchPlotNo ?? 'گەڕان بە رەقەمی ئەرز'}
                  value={plotQ}
                  onChange={(e) => {
                    setPlotQ(e.target.value);
                    setSelectedPlotNo(null);
                  }}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {compoundLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : filteredPointers.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    {m.emptyCompoundPlots ?? 'رەقەمێک نەدۆزرایەوە'}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredPointers.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedPlotNo(p.no)}
                          className={`w-full text-start px-3 py-2 hover:bg-muted/60 ${
                            selectedPlotNo === p.no ? 'bg-primary/10' : ''
                          }`}
                        >
                          <p className="font-semibold tabular-nums text-base">{p.no}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>

            <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden relative h-[min(78vh,720px)]">
              {compoundLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : compoundError ? (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  {compoundError}
                </div>
              ) : compoundMeta ? (
                <>
                  <div className="absolute top-3 start-3 z-[500] pointer-events-none">
                    <span className="rounded-xl bg-[#0b1f38]/75 text-white text-sm px-3.5 py-2 backdrop-blur-md shadow-lg ring-1 ring-white/10">
                      {compoundTitle}
                    </span>
                  </div>
                  <CompoundPlotCanvas
                    meta={compoundMeta}
                    pointers={pointers}
                    selectedNo={selectedPlotNo}
                    onSelect={(p) => setSelectedPlotNo(p.no)}
                    labels={{ plotNo: m.plotNo ?? 'رەقەمی ئەرز' }}
                  />
                </>
              ) : null}
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-amber-600/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
            {m.parcelHelp ??
              'ئەو پارچە سپییانەی دەیانبینیت تەنها سنووری زەوین — ژمارەی ئەرز دەبێت خۆت تۆماری بکەیت.'}
          </div>

          {pinMode ? (
            <p className="text-sm font-medium text-amber-800">
              {m.pinModeHint ?? 'ئێستا کلیک لەسەر پارچەی ئەرز بکە بۆ دانانی رەقەم'}
            </p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] text-muted-foreground">
                {m.statPlots ?? 'رەقەمی ئەرز لەسەر نەخشە'}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{data?.plotted ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] text-muted-foreground">
                {m.statPlaces ?? 'شوێنە تۆمارکراوەکان'}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{data?.totalPlaces ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] text-muted-foreground">{m.statSource ?? 'سەرچاوە'}</p>
              <p className="mt-1 text-sm font-medium">{data?.source.basemap ?? 'OpenStreetMap'}</p>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-rose-600 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
            <aside className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col max-h-[min(70vh,640px)]">
              <div className="p-3 border-b border-border space-y-2">
                <p className="text-sm font-medium">{m.plotList ?? 'رەقەمی ئەرزەکان'}</p>
                <input
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50"
                  placeholder={m.search ?? 'گەڕان بە رەقەم / کۆد / گەرەک'}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && !data ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">{t.common.loading}</div>
                ) : plots.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm leading-relaxed">
                    {m.emptyParcels ??
                      'هیچ رەقەمێک لەسەر نەخشە نییە — «رەقەم لەسەر نەخشە زیاد بکە» دابگرە'}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {plots.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId((cur) => (cur === p.id ? null : p.id));
                            setFocus({ lat: p.lat, lng: p.lng, zoom: 17 });
                          }}
                          className={`w-full text-start px-3 py-2.5 hover:bg-muted/60 transition-colors ${
                            selectedId === p.id ? 'bg-primary/10' : ''
                          }`}
                        >
                          <p className="font-semibold tabular-nums text-foreground text-base">
                            {p.plotNo}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.neighborhood || p.name}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>

            <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden relative h-[min(70vh,640px)]">
              {!loading || data ? (
                <ErbilMapCanvas
                  plots={plots}
                  lang={lang}
                  pinMode={pinMode}
                  focus={focus}
                  selectedId={selectedId}
                  onMapClick={onMapClick}
                  labels={{
                    plotNo: m.plotNo ?? 'رەقەمی ئەرز',
                    code: m.code ?? 'کۆد',
                    neighborhood: m.neighborhood ?? 'گەرەک',
                    name: m.name ?? 'ناو',
                    clickHint: m.pinModeHint ?? '',
                  }}
                />
              ) : null}
              <p className="absolute bottom-2 start-2 end-2 z-[500] pointer-events-none text-[10px] text-center text-slate-700 bg-white/85 rounded-lg px-2 py-1">
                {m.attribution ??
                  'نەخشە: © OpenStreetMap — رەقەمی ئەرز لە تەپۆ تۆمار دەکرێت'}
              </p>
            </section>
          </div>
        </>
      )}

      {draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">{m.addPlotTitle ?? 'رەقەمی ئەرز لەسەر پارچە'}</h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground tabular-nums" dir="ltr">
                {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}
              </p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {m.plotNo ?? 'رەقەمی ئەرز'} *
                </label>
                <input
                  className={`${field} tabular-nums text-lg font-semibold`}
                  value={plotNo}
                  onChange={(e) => setPlotNo(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. 1248' : 'بۆ نموونە: ١٢٤٨'}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {m.neighborhood ?? 'گەرەک'}
                </label>
                <input
                  className={field}
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{m.name ?? 'ناو'}</label>
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-muted"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void savePlot()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t.common.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
