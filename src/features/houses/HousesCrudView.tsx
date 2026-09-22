'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type HouseRow = {
  id: string;
  code: string;
  name: string;
  unitNumber: string | null;
  area: number | null;
  price: number | null;
  budgetIqd: number;
  location: string | null;
  description: string | null;
  status: string;
  targetFinishAt: string | null;
  property: { id: string; name: string } | null;
  place: {
    neighborhood: string;
    province: string;
    city: string;
    plotNo: string;
  } | null;
};

type PropertyOpt = { id: string; name: string };

const emptyForm = () => ({
  code: '',
  name: '',
  unitNumber: '',
  area: '',
  price: '',
  budgetIqd: '',
  description: '',
  propertyId: '',
  status: 'IN_CONSTRUCTION',
  targetFinishAt: '',
  neighborhood: '',
  province: 'هەولێر',
  city: 'هەولێر',
  plotNo: '',
});

export function HousesCrudView({ t, lang }: { t: Dictionary; lang: string }) {
  const h = t.pages.houses;
  const [items, setItems] = useState<HouseRow[]>([]);
  const [properties, setProperties] = useState<PropertyOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  const statusLabel = (status: string) => t.status.house?.[status as keyof typeof t.status.house] ?? status;


  const load = useCallback(async () => {
    setLoading(true);
    const [res, propsRes] = await Promise.all([fetch('/api/houses'), fetch('/api/properties')]);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else setError(t.pages.projects.error);
    if (propsRes.ok) {
      const data = await propsRes.json();
      setProperties((data.items ?? []).map((p: PropertyOpt) => ({ id: p.id, name: p.name })));
    }
    setLoading(false);
  }, [t.pages.projects.error]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
    setFormOpen(true);
  }

  function openEdit(row: HouseRow) {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      unitNumber: row.unitNumber ?? '',
      area: row.area != null ? String(row.area) : '',
      price: row.price != null ? String(row.price) : '',
      budgetIqd: row.budgetIqd ? String(row.budgetIqd) : '',
      description: row.description ?? '',
      propertyId: row.property?.id ?? '',
      status: row.status || 'IN_CONSTRUCTION',
      targetFinishAt: row.targetFinishAt ? row.targetFinishAt.slice(0, 10) : '',
      neighborhood: row.place?.neighborhood ?? '',
      province: row.place?.province || 'هەولێر',
      city: row.place?.city || 'هەولێر',
      plotNo: row.place?.plotNo ?? '',
    });
    setError('');
    setFormOpen(true);
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = {
      name: form.name.trim(),
      unitNumber: form.unitNumber || null,
      area: form.area ? Number(form.area) : null,
      price: form.price ? Number(form.price) : null,
      budgetIqd: form.budgetIqd ? Number(form.budgetIqd) : 0,
      description: form.description || null,
      propertyId: form.propertyId || null,
      status: form.status,
      targetFinishAt: form.targetFinishAt
        ? new Date(`${form.targetFinishAt}T12:00:00`).toISOString()
        : null,
      neighborhood: form.neighborhood.trim(),
      province: form.province.trim() || 'هەولێر',
      city: form.city.trim() || 'هەولێر',
      plotNo: form.plotNo || null,
    };

    const res = editingId
      ? await fetch(`/api/houses/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/houses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, code: form.code.trim() }),
        });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'CODE_EXISTS') setError(h.codeExists);
      else if (data.error === 'HAS_DEPENDENCIES') setError(h.hasDeps);
      else if (data.error === 'VALIDATION') setError(h.validation);
      else setError(t.pages.projects.error);
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.confirm.delete)) return;
    const res = await fetch(`/api/houses/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error === 'HAS_DEPENDENCIES' ? h.hasDeps : t.pages.projects.error);
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{h.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{h.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {h.add}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {formOpen && (
        <form onSubmit={(e) => void save(e)} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-foreground">
            {editingId ? h.editTitle : h.add}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              className={field}
              placeholder={t.pages.projects.code}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
              disabled={!!editingId}
            />
            <input
              className={field}
              placeholder={t.table.name}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder={h.unitNumber}
              value={form.unitNumber}
              onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
            />
            <input
              className={field}
              placeholder={h.neighborhood}
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder={h.plotNo}
              value={form.plotNo}
              onChange={(e) => setForm({ ...form, plotNo: e.target.value })}
            />
            <input
              className={field}
              placeholder={h.city}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder={h.province}
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              required
            />
            <input
              type="number"
              className={cn(field, 'tabular-nums')}
              placeholder={h.area}
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
            <input
              type="number"
              className={cn(field, 'tabular-nums')}
              placeholder={t.dashboard.budget}
              value={form.budgetIqd}
              onChange={(e) => setForm({ ...form, budgetIqd: e.target.value })}
            />
            <input
              type="number"
              className={cn(field, 'tabular-nums')}
              placeholder={h.salePrice ?? 'نرخی فرۆشتن'}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <input
              type="date"
              className={field}
              title={h.finishDate ?? 'کاتی تەواوبوون'}
              value={form.targetFinishAt}
              onChange={(e) => setForm({ ...form, targetFinishAt: e.target.value })}
            />
            <select
              className={field}
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
            >
              <option value="">{h.property}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="IN_CONSTRUCTION">{statusLabel('IN_CONSTRUCTION')}</option>
              <option value="SOLD">{statusLabel('SOLD')}</option>
              <option value="FINISHED">{statusLabel('FINISHED')}</option>
            </select>
            <input
              className={cn(field, 'sm:col-span-2 lg:col-span-3')}
              placeholder={h.description}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
              className="px-4 py-2 rounded-xl text-sm border border-border"
            >
              {t.common.cancel}
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-medium">
              {t.common.save}
            </button>
          </div>
        </form>
      )}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">{h.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{t.pages.projects.code}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.name}</th>
                  <th className="px-4 py-3 text-start font-medium">{h.neighborhood}</th>
                  <th className="px-4 py-3 text-start font-medium">{h.area}</th>
                  <th className="px-4 py-3 text-start font-medium">{h.property}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.dashboard.budget}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.status}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/${lang}/projects/${row.code}`} className="font-mono text-primary hover:underline">
                        {row.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.place?.neighborhood || row.location || '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.area != null ? row.area : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.property?.name ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(row.budgetIqd, lang)}</td>
                    <td className="px-4 py-3">{statusLabel(row.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg text-foreground hover:bg-muted"
                          title={h.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10"
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
