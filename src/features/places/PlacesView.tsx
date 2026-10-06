'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';
import {
  openStaffGroupForHouseReserve,
  STAFF_WHATSAPP_GROUP_URL,
} from '@/lib/whatsapp';

type PlaceRow = {
  id: string;
  code: string;
  neighborhood: string;
  name: string;
  province: string;
  city: string;
  plotNo?: string;
  lat?: number | null;
  lng?: number | null;
  price?: number | null;
  finalPrice?: number | null;
  area?: number | null;
  facadeM?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  guestRooms?: number | null;
  address?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  createdAt: string;
};

type FormState = {
  code: string;
  name: string;
};

const emptyForm = (): FormState => ({
  code: '',
  name: '',
});

export function PlacesView({ t, lang }: { t: Dictionary; lang: string }) {
  const p = t.pages.places as Record<string, string>;
  const [items, setItems] = useState<PlaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [reserveHint, setReserveHint] = useState('');

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  const load = useCallback(async () => {
    setLoading(true);
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const res = await fetch(`/api/places${qs}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  const fetchNextCode = async () => {
    const res = await fetch('/api/places/import-compounds');
    if (!res.ok) return '100';
    const data = (await res.json()) as { nextCode?: string };
    return data.nextCode || '100';
  };

  const openCreate = async () => {
    setEditingId(null);
    const next = await fetchNextCode();
    setForm({ code: next, name: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: PlaceRow) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
    });
    setError('');
    setMenuId(null);
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!form.code.trim() || !form.name.trim()) {
      setError(t.pages.projects.required);
      return;
    }
    setSaving(true);
    const name = form.name.trim();
    const payload = {
      code: form.code.trim(),
      name,
      neighborhood: name,
      province: 'هەولێر',
      city: 'هەولێر',
      plotNo: '',
    };
    const res = await fetch(editingId ? `/api/places/${editingId}` : '/api/places', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.status === 409) {
      setError(p.codeExists ?? 'ئەم کۆدە پێشتر تۆمارکراوە');
      return;
    }
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setModalOpen(false);
    await load();
  };

  const remove = async (id: string) => {
    setMenuId(null);
    await fetch(`/api/places/${id}`, { method: 'DELETE' });
    await load();
  };

  const importFromMaps = async () => {
    setImporting(true);
    setError('');
    const res = await fetch('/api/places/import-compounds', { method: 'POST' });
    setImporting(false);
    if (!res.ok) {
      setError(p.importError ?? 'نەتوانرا لە نەخشە هاوردە بکرێت');
      return;
    }
    const data = (await res.json()) as { created?: number; skipped?: number };
    await load();
    if ((data.created ?? 0) === 0 && (data.skipped ?? 0) > 0) {
      setError(p.importDone ?? `هەموو پڕۆژەکان پێشتر هەن (${data.skipped})`);
      window.setTimeout(() => setError(''), 3500);
    }
  };

  const reserveInGroup = async (row: PlaceRow) => {
    setMenuId(null);
    const address =
      row.address?.trim() ||
      [row.neighborhood, row.city, row.province, row.plotNo ? `پارچە ${row.plotNo}` : '']
        .filter(Boolean)
        .join(' — ');
    const { copied, opened } = await openStaffGroupForHouseReserve({
      code: row.code,
      name: row.name,
      price: row.price,
      finalPrice: row.finalPrice,
      area: row.area,
      facadeM: row.facadeM,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      guestRooms: row.guestRooms,
      address,
      neighborhood: row.neighborhood,
      city: row.city,
      province: row.province,
      plotNo: row.plotNo,
      imageUrl: row.imageUrl,
      imageUrls: row.imageUrls,
      videoUrl: row.videoUrl,
      lat: row.lat,
      lng: row.lng,
    });
    setReserveHint(
      opened
        ? (p.reserveOpened ??
          'واتساپ کرایەوە — گرووپی کارمەندان هەڵبژێرە و ناردن دابگرە' +
            (copied ? ' (دەقیش کۆپی کرا)' : ''))
        : copied
          ? (p.reserveCopied ?? 'دەقی حەرز کۆپی کرا — لە واتساپ پەیست بکە')
          : (p.reserveFailed ?? 'نەتوانرا واتساپ بکرێتەوە — دەق کۆپی بکە بە دەست'),
    );
    window.setTimeout(() => setReserveHint(''), 4500);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{p.title ?? 'شوێنەکان'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {p.subtitleSimple ?? 'ناوی شوێن و کۆدی شوێن — کۆدەکان لە ١٠٠ەوە'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={STAFF_WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15"
          >
            <MessageCircle className="h-4 w-4" />
            {p.whatsappGroup ?? 'گرووپی واتساپ (حەرز)'}
          </a>
          <button
            type="button"
            disabled={importing}
            onClick={() => void importFromMaps()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted disabled:opacity-60"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {p.importMaps ?? 'هاوردە لە نەخشەی پڕۆژەکان'}
          </button>
          <button
            type="button"
            onClick={() => void openCreate()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {p.add ?? 'زیادکردنی شوێن'}
          </button>
        </div>
      </div>

      {reserveHint ? (
        <p className="text-sm text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
          {reserveHint}
        </p>
      ) : null}

      {error && !modalOpen ? (
        <p className="text-sm text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {p.title ?? 'شوێنەکان'}
            <span className="text-muted-foreground font-normal tabular-nums">({items.length})</span>
          </p>
          <input
            className={cn(field, 'sm:max-w-xs')}
            placeholder={p.search ?? 'گەڕان'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm text-start">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">{p.serial ?? 'زنجیرە'}</th>
                <th className="px-4 py-3 font-medium">{p.placeCode ?? p.code ?? 'کۆدی شوێن'}</th>
                <th className="px-4 py-3 font-medium">{p.name ?? 'ناوی شوێن'}</th>
                <th className="px-4 py-3 font-medium w-14" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    {t.common.loading}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-14 text-center text-muted-foreground">
                    {p.emptyImportHint ??
                      'هیچ شوێنێک نییە — «هاوردە لە نەخشەی پڕۆژەکان» دابگرە یان زیاد بکە'}
                  </td>
                </tr>
              ) : (
                items.map((row, i) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-primary tabular-nums">{row.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-3 relative">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void reserveInGroup(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                          title={p.reserveWhatsApp ?? 'حەرز لە گرووپ'}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {p.reserveWhatsApp ?? 'حەرز'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuId((cur) => (cur === row.id ? null : row.id))}
                          className="p-2 rounded-lg bg-muted/80 text-muted-foreground hover:text-foreground"
                          aria-label="menu"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      {menuId === row.id ? (
                        <div className="absolute end-4 z-20 mt-1 min-w-[10rem] rounded-xl border border-border bg-card p-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t.common.edit}
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(row.id)}
                            className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t.common.delete}
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingId ? (p.edit ?? 'دەستکاری شوێن') : (p.add ?? 'زیادکردنی شوێن')}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {p.name ?? 'ناوی شوێن'}
                </label>
                <input
                  className={field}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={lang === 'en' ? 'e.g. 32 Park' : 'بۆ نموونە: ٣٢ پارک'}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {p.placeCode ?? p.code ?? 'کۆدی شوێن'}
                </label>
                <input
                  className={cn(field, 'font-mono tabular-nums')}
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.replace(/[^\d]/g, '') }))
                  }
                  placeholder="100"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {p.codeHint ?? 'کۆدەکان لە ١٠٠ەوە دەست پێدەکەن'}
                </p>
              </div>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-muted"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
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
