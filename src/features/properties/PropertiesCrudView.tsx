'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type PropertyRow = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  ownerId: string | null;
  owner: { id: string; name: string } | null;
  _count?: { houses: number };
};

type OwnerOpt = { id: string; name: string };

const emptyForm = () => ({ name: '', location: '', description: '', ownerId: '' });

export function PropertiesCrudView({ t }: { t: Dictionary }) {
  const p = t.pages.properties;
  const [items, setItems] = useState<PropertyRow[]>([]);
  const [owners, setOwners] = useState<OwnerOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  const load = useCallback(async () => {
    setLoading(true);
    const [res, ownersRes] = await Promise.all([fetch('/api/properties'), fetch('/api/owners')]);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else setError(t.pages.projects.error);
    if (ownersRes.ok) {
      const data = await ownersRes.json();
      setOwners((data.items ?? []).map((o: OwnerOpt) => ({ id: o.id, name: o.name })));
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

  function openEdit(row: PropertyRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      location: row.location ?? '',
      description: row.description ?? '',
      ownerId: row.ownerId ?? '',
    });
    setError('');
    setFormOpen(true);
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = {
      name: form.name.trim(),
      location: form.location || null,
      description: form.description || null,
      ownerId: form.ownerId || null,
    };
    const res = editingId
      ? await fetch(`/api/properties/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.confirm.delete)) return;
    const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">{p.title}</h1>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {p.add}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {formOpen && (
        <form onSubmit={(e) => void save(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5">
          <p className="sm:col-span-2 text-sm font-medium text-foreground">
            {editingId ? (p.editTitle ?? p.add) : p.add}
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
            placeholder={p.location}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <select
            className={field}
            value={form.ownerId}
            onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
          >
            <option value="">{p.owner}</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input
            className={cn(field, 'sm:col-span-2')}
            placeholder={p.description}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="sm:col-span-2 flex justify-end gap-2">
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
          <p className="p-8 text-center text-muted-foreground">{p.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{t.table.name}</th>
                  <th className="px-4 py-3 text-start font-medium">{p.location}</th>
                  <th className="px-4 py-3 text-start font-medium">{p.owner}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.nav.houses}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.location ?? '—'}</td>
                    <td className="px-4 py-3">{row.owner?.name ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{row._count?.houses ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg text-foreground hover:bg-muted"
                          title={p.edit ?? t.common.edit}
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
