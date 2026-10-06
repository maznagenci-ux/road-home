'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type BranchRow = {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  city: string;
  isActive: boolean;
  isHq: boolean;
  notes?: string | null;
};

type FormState = {
  code: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  isActive: boolean;
  notes: string;
};

const emptyForm = (): FormState => ({
  code: '',
  name: '',
  phone: '',
  address: '',
  city: 'هەولێر',
  isActive: true,
  notes: '',
});

export function BranchesView({ t, lang }: { t: Dictionary; lang: string }) {
  const b = (t.pages as { branches?: Record<string, string> }).branches ?? {};
  const [items, setItems] = useState<BranchRow[]>([]);
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
    const res = await fetch(`/api/branches${qs}`);
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

  const openEdit = (row: BranchRow) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      phone: row.phone ?? '',
      address: row.address ?? '',
      city: row.city || 'هەولێر',
      isActive: row.isActive,
      notes: row.notes ?? '',
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
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || 'هەولێر',
      isActive: form.isActive,
      notes: form.notes.trim() || null,
    };
    const res = await fetch(editingId ? `/api/branches/${editingId}` : '/api/branches', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.status === 409) {
      setError(b.codeExists ?? 'ئەم کۆدە پێشتر تۆمارکراوە');
      return;
    }
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setModalOpen(false);
    await load();
  };

  const remove = async (row: BranchRow) => {
    setMenuId(null);
    if (row.isHq) {
      setError(b.hqLocked ?? 'بارەگای سەرەکی ناتوانرێت بسڕدرێتەوە');
      return;
    }
    const res = await fetch(`/api/branches/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(b.hqLocked ?? 'ناتوانرێت بسڕدرێتەوە');
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{b.title ?? 'لقەکان'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {b.subtitle ??
              'تۆماری لقەکان — هەموو حیسابات و وەسڵ و داهات دەگەڕێتەوە بۆ بارەگای سەرەکی'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {b.add ?? 'زیادکردنی لق'}
        </button>
      </div>

      {error && !modalOpen ? (
        <p className="text-sm text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {b.title ?? 'لقەکان'}
            <span className="text-muted-foreground font-normal tabular-nums">({items.length})</span>
          </p>
          <input
            className={cn(field, 'sm:max-w-xs')}
            placeholder={b.search ?? 'گەڕان'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm text-start">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">{b.serial ?? 'زنجیرە'}</th>
                <th className="px-4 py-3 font-medium">{b.code ?? 'کۆد'}</th>
                <th className="px-4 py-3 font-medium">{b.name ?? 'ناو'}</th>
                <th className="px-4 py-3 font-medium">{b.city ?? 'شار'}</th>
                <th className="px-4 py-3 font-medium">{b.phone ?? 'تەلەفۆن'}</th>
                <th className="px-4 py-3 font-medium">{b.status ?? 'دۆخ'}</th>
                <th className="px-4 py-3 font-medium w-14" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {t.common.loading}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                    {b.empty ?? 'هیچ لقێک تۆمار نەکراوە'}
                  </td>
                </tr>
              ) : (
                items.map((row, i) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-primary tabular-nums">{row.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.name}
                      {row.isHq ? (
                        <span className="ms-2 text-[10px] font-semibold text-teal-700 bg-teal-500/10 border border-teal-500/20 rounded-md px-1.5 py-0.5">
                          {b.hqBadge ?? 'سەرەکی'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.city || '—'}</td>
                    <td className="px-4 py-3 font-mono tabular-nums dir-ltr text-start">
                      {row.phone || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[11px] font-medium rounded-md px-2 py-0.5 border',
                          row.isActive
                            ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-muted-foreground bg-muted border-border',
                        )}
                      >
                        {row.isActive ? (b.active ?? 'چالاک') : (b.inactive ?? 'ناچالاک')}
                      </span>
                    </td>
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
                          {!row.isHq ? (
                            <button
                              type="button"
                              onClick={() => void remove(row)}
                              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t.common.delete}
                            </button>
                          ) : null}
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
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingId ? (b.edit ?? 'دەستکاری لق') : (b.add ?? 'زیادکردنی لق')}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{b.name ?? 'ناو'}</label>
                  <input
                    className={field}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={lang === 'en' ? 'e.g. Ankawa branch' : 'بۆ نموونە: لقی عینکاوا'}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{b.code ?? 'کۆد'}</label>
                  <input
                    className={cn(field, 'font-mono uppercase')}
                    value={form.code}
                    disabled={!!editingId && items.find((x) => x.id === editingId)?.isHq}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase(),
                      }))
                    }
                    placeholder="ANK"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{b.phone ?? 'تەلەفۆن'}</label>
                  <input
                    className={cn(field, 'dir-ltr')}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="0750…"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{b.city ?? 'شار'}</label>
                  <input
                    className={field}
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{b.address ?? 'ناونیشان'}</label>
                <input
                  className={field}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{b.notes ?? 'تێبینی'}</label>
                <input
                  className={field}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  disabled={!!editingId && items.find((x) => x.id === editingId)?.isHq}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-border"
                />
                {b.active ?? 'چالاک'}
              </label>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {b.accountingNote ??
                  'تێبینی: حیسابات، وەسڵ، داهات و خەرجی هەموویان لە بارەگای سەرەکی کۆدەبنەوە — لق حیسابی جیاوازی نییە.'}
              </p>
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
