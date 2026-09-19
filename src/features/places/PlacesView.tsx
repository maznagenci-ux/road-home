'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

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
  createdAt: string;
};

type FormState = {
  code: string;
  neighborhood: string;
  name: string;
  province: string;
  city: string;
  plotNo: string;
  lat: string;
  lng: string;
};

const emptyForm = (): FormState => ({
  code: '',
  neighborhood: '',
  name: '',
  province: 'هەولێر',
  city: 'هەولێر',
  plotNo: '',
  lat: '',
  lng: '',
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
  const [error, setError] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);

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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: PlaceRow) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      neighborhood: row.neighborhood,
      name: row.name,
      province: row.province,
      city: row.city,
      plotNo: row.plotNo ?? '',
      lat: row.lat != null ? String(row.lat) : '',
      lng: row.lng != null ? String(row.lng) : '',
    });
    setError('');
    setMenuId(null);
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!form.code.trim() || !form.neighborhood.trim() || !form.name.trim()) {
      setError(t.pages.projects.required);
      return;
    }
    setSaving(true);
    const latNum = form.lat.trim() ? Number(form.lat) : null;
    const lngNum = form.lng.trim() ? Number(form.lng) : null;
    if (
      (form.lat.trim() && !Number.isFinite(latNum)) ||
      (form.lng.trim() && !Number.isFinite(lngNum))
    ) {
      setError(t.pages.projects.error);
      setSaving(false);
      return;
    }
    const payload = {
      code: form.code.trim().toUpperCase(),
      neighborhood: form.neighborhood.trim(),
      name: form.name.trim(),
      province: form.province.trim() || 'هەولێر',
      city: form.city.trim() || 'هەولێر',
      plotNo: form.plotNo.trim(),
      lat: latNum,
      lng: lngNum,
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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{p.title ?? 'شوێنەکان'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {p.subtitle ?? 'کۆدی خانوو، گەرەک و شوێن تۆمار بکە بۆ هەڵبژاردن لە گرێبەست'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {p.add ?? 'زیادکردنی شوێن'}
        </button>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {p.title ?? 'شوێنەکان'}
          </p>
          <input
            className={cn(field, 'sm:max-w-xs')}
            placeholder={p.search ?? 'گەڕان'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm text-start">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">{p.serial ?? 'زنجیرە'}</th>
                <th className="px-4 py-3 font-medium">{p.code ?? 'کۆدی خانوو'}</th>
                <th className="px-4 py-3 font-medium">{p.plotNo ?? 'رەقەمی ئەرز'}</th>
                <th className="px-4 py-3 font-medium">{p.neighborhood ?? 'ناوی گەرەک'}</th>
                <th className="px-4 py-3 font-medium">{p.name ?? 'ناوی شوێن'}</th>
                <th className="px-4 py-3 font-medium">{p.province ?? 'پارێزگا'}</th>
                <th className="px-4 py-3 font-medium">{p.city ?? 'شار'}</th>
                <th className="px-4 py-3 font-medium w-14" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {t.common.loading}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                    {p.empty ?? 'هیچ شوێنێک تۆمار نەکراوە — زیادکردنی شوێن دابگرە'}
                  </td>
                </tr>
              ) : (
                items.map((row, i) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-primary">{row.code}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{row.plotNo || '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.neighborhood}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.province}</td>
                    <td className="px-4 py-3">{row.city}</td>
                    <td className="px-4 py-3 relative">
                      <button
                        type="button"
                        onClick={() => setMenuId((cur) => (cur === row.id ? null : row.id))}
                        className="p-2 rounded-lg bg-muted/80 text-muted-foreground hover:text-foreground"
                        aria-label="menu"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuId === row.id ? (
                        <div className="absolute end-4 z-20 mt-1 min-w-[8.5rem] rounded-xl border border-border bg-card p-1 shadow-lg">
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
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border sticky top-0 bg-card">
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
                  {p.code ?? 'کۆدی خانوو'}
                </label>
                <input
                  className={cn(field, 'font-mono uppercase')}
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder={lang === 'en' ? 'e.g. H-101' : 'بۆ نموونە: H-101'}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {p.plotNo ?? 'رەقەمی ئەرز'}
                </label>
                <input
                  className={cn(field, 'tabular-nums')}
                  value={form.plotNo}
                  onChange={(e) => setForm((f) => ({ ...f, plotNo: e.target.value }))}
                  placeholder={lang === 'en' ? 'e.g. 1248' : 'بۆ نموونە: ١٢٤٨'}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {p.neighborhood ?? 'ناوی گەرەک'}
                </label>
                <input
                  className={field}
                  value={form.neighborhood}
                  onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                  placeholder={lang === 'en' ? 'e.g. 7 Nisan / Ankawa' : 'بۆ نموونە: ٧ نیسان / عينكاوا'}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {p.name ?? 'ناوی شوێن'}
                </label>
                <input
                  className={field}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={lang === 'en' ? 'e.g. Villa 12' : 'بۆ نموونە: ڤیلا ١٢'}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {p.province ?? 'پارێزگا'}
                </label>
                <input
                  className={field}
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {p.city ?? 'شار'}
                </label>
                <input
                  className={field}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{p.lat ?? 'lat'}</label>
                  <input
                    className={cn(field, 'tabular-nums')}
                    value={form.lat}
                    onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                    placeholder="36.19"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{p.lng ?? 'lng'}</label>
                  <input
                    className={cn(field, 'tabular-nums')}
                    value={form.lng}
                    onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                    placeholder="44.01"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">{p.coordsHint}</p>
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
