'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type Party = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

export function PartyCrudView({
  t,
  apiPath,
  title,
  addLabel,
  emptyMessage,
}: {
  t: Dictionary;
  apiPath: '/api/owners' | '/api/customers' | '/api/suppliers';
  title: string;
  addLabel: string;
  emptyMessage: string;
}) {
  const [items, setItems] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch(apiPath);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else {
      setError(t.pages.projects.error);
    }
    setLoading(false);
  }, [apiPath, t.pages.projects.error]);

  useEffect(() => {
    void load();
  }, [load]);

  const importExcel = async (file: File) => {
    if (apiPath !== '/api/customers') return;
    setImporting(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/imports/customers', { method: 'POST', body });
    setImporting(false);
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    const data = (await res.json()) as { created?: number; skipped?: number };
    await load();
    window.alert(
      `${(t.pages.customers as { imported?: string }).imported ?? 'هاوردەکرا'}: ${data.created ?? 0} · ${(t.pages.customers as { skipped?: string }).skipped ?? 'پەڕێنرا'}: ${data.skipped ?? 0}`,
    );
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
      }),
    });
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setShowCreate(false);
    setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.confirm.delete)) return;
    const res = await fetch(`${apiPath}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <div className="flex flex-wrap gap-2">
          {apiPath === '/api/customers' ? (
            <>
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
                {(t.pages.customers as { importExcel?: string }).importExcel ?? 'هاوردە لە Excel'}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {showCreate && (
        <form onSubmit={(e) => void create(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5">
          <input className={field} placeholder={t.table.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={field} placeholder={t.table.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className={field} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={field} placeholder={t.pages.owners.address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input className={cn(field, 'sm:col-span-2')} placeholder={t.pages.owners.notes} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="sm:col-span-2 justify-self-end px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-medium">
            {t.common.save}
          </button>
        </form>
      )}

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{t.table.name}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.phone}</th>
                  <th className="px-4 py-3 text-start font-medium">Email</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.owners.address}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.address ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => void remove(row.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10" aria-label={t.common.delete}>
                        <Trash2 className="h-4 w-4" />
                      </button>
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
