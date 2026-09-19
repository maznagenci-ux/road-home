'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, FileSpreadsheet, Search, Pencil, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  nationalId: string | null;
  notes: string | null;
};

type FormState = {
  name: string;
  phone: string;
  address: string;
  nationalId: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: '',
  phone: '',
  address: '',
  nationalId: '',
  notes: '',
});

export function CustomersView({ t, lang }: { t: Dictionary; lang: string }) {
  const c = t.pages.customers as Record<string, string>;
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(tmr);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const qs = debounced ? `?q=${encodeURIComponent(debounced)}` : '';
    const res = await fetch(`/api/customers${qs}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else {
      setError(c.loadError ?? t.pages.projects.error);
    }
    setLoading(false);
  }, [debounced, c.loadError, t.pages.projects.error]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(row: Customer) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      phone: row.phone ?? '',
      address: row.address ?? '',
      nationalId: row.nationalId ?? '',
      notes: row.notes ?? '',
    });
    setFormOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      nationalId: form.nationalId.trim() || null,
      notes: form.notes.trim() || null,
    };
    const res = editingId
      ? await fetch(`/api/customers/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
    setSaving(false);
    if (!res.ok) {
      setError(c.saveError ?? t.pages.projects.error);
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm(t.confirm.delete)) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(c.saveError ?? t.pages.projects.error);
      return;
    }
    await load();
  }

  async function importExcel(file: File) {
    setImporting(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/imports/customers', { method: 'POST', body });
    setImporting(false);
    if (!res.ok) {
      setError(c.loadError ?? t.pages.projects.error);
      return;
    }
    const data = (await res.json()) as { created?: number; skipped?: number };
    await load();
    window.alert(
      `${c.imported ?? 'هاوردەکرا'}: ${data.created ?? 0} · ${c.skipped ?? 'پەڕێنرا'}: ${data.skipped ?? 0}`,
    );
  }

  const countLabel = useMemo(
    () => (c.count ?? '{n} کڕیار').replace('{n}', String(items.length)),
    [c.count, items.length],
  );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{c.title ?? 'کڕیارەکان'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {c.subtitle ?? 'ناو، پەیوەندی، ناسنامە، گرێبەست و قەرز'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importExcel(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {c.importExcel ?? 'هاوردە لە Excel'}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {c.add ?? 'کڕیاری نوێ'}
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={c.searchPlaceholder ?? 'گەڕان بە ناو، تەلەفون، ناسنامە…'}
          className="w-full rounded-xl border border-border bg-card py-2.5 pe-3 ps-9 text-sm outline-none focus:border-primary/40"
        />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {formOpen ? (
        <form
          onSubmit={(e) => void save(e)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5"
        >
          <p className="sm:col-span-2 text-sm font-medium">
            {editingId ? (c.editTitle ?? 'دەستکاری کڕیار') : (c.add ?? 'کڕیاری نوێ')}
          </p>
          <input
            className={field}
            placeholder={t.table.name}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={field}
            placeholder={t.table.phone}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className={field}
            placeholder={c.nationalId ?? 'ژمارەی ناسنامە'}
            value={form.nationalId}
            onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
          />
          <input
            className={field}
            placeholder={c.address ?? 'ناونیشان'}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            className={cn(field, 'sm:col-span-2')}
            placeholder={c.notes ?? 'تێبینی'}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
              className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {t.common.save}
            </button>
          </div>
        </form>
      ) : null}

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs text-muted-foreground">
          {countLabel}
        </div>
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">
            {debounced
              ? (c.searchEmpty ?? 'هیچ ئەنجامێک نەدۆزرایەوە')
              : (c.empty ?? 'هیچ کڕیارێک تۆمار نەکراوە')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{t.table.name}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.phone}</th>
                  <th className="px-4 py-3 text-start font-medium">{c.nationalId ?? 'ناسنامە'}</th>
                  <th className="px-4 py-3 text-start font-medium">{c.address ?? 'ناونیشان'}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {row.nationalId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.address ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/${lang}/customers/${row.id}`}
                          className="p-2 rounded-lg text-primary hover:bg-primary/10"
                          aria-label={c.viewProfile ?? 'پڕۆفایل'}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg text-foreground/70 hover:bg-muted"
                          aria-label={c.edit ?? 'دەستکاری'}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10"
                          aria-label={t.common.delete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
