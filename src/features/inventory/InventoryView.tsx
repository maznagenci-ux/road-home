'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Package, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type Material = {
  id: string;
  code: string;
  name: string;
  unit: string;
  avgCostIqd: number;
  minStock: number;
  category: { name: string; nameKu: string | null };
  balances: { quantity: number; warehouse: { name: string } }[];
};

type Warehouse = { id: string; code: string; name: string };
type House = { id: string; code: string; name: string };
type Category = { id: string; code: string; name: string; nameKu: string | null };
type Waste = {
  id: string;
  quantity: number;
  estimatedValueIqd: number;
  reason: string;
  approvalStatus: string;
  material: { code: string; name: string };
  project: { house: { code: string; name: string } } | null;
};

export function InventoryView({ t, lang }: { t: Dictionary; lang: string }) {
  const i = (t.pages as { inventory?: Record<string, string> }).inventory ?? {};
  const [tab, setTab] = useState<'stock' | 'purchase' | 'issue' | 'waste'>('stock');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [wastes, setWastes] = useState<Waste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [matForm, setMatForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    unit: 'BAG',
    minStock: '0',
  });
  const [purchase, setPurchase] = useState({
    warehouseId: '',
    materialId: '',
    quantity: '',
    unitCostIqd: '',
    paymentMethod: 'CASH' as 'CASH' | 'CREDIT',
  });
  const [issue, setIssue] = useState({
    warehouseId: '',
    houseId: '',
    materialId: '',
    quantity: '',
    reason: '',
  });
  const [waste, setWaste] = useState({
    warehouseId: '',
    materialId: '',
    quantity: '',
    reason: 'CONSTRUCTION_WASTE',
    houseId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    await fetch('/api/inventory?section=categories');
    const [m, w, overview, wasteRes, housesRes] = await Promise.all([
      fetch('/api/inventory?section=materials'),
      fetch('/api/inventory?section=warehouses'),
      fetch('/api/inventory'),
      fetch('/api/inventory?section=waste'),
      fetch('/api/houses'),
    ]);
    if (!m.ok || !w.ok) {
      setError(i.loadError ?? 'نەتوانرا باربکرێت');
      setLoading(false);
      return;
    }
    const mj = await m.json();
    const wj = await w.json();
    const oj = overview.ok ? await overview.json() : { warehouses: [] };
    const wasteJ = wasteRes.ok ? await wasteRes.json() : { wastes: [] };
    const hj = housesRes.ok ? await housesRes.json() : { items: [] };
    setMaterials(mj.materials ?? []);
    setWarehouses(wj.warehouses?.length ? wj.warehouses : oj.warehouses ?? []);
    setWastes(wasteJ.wastes ?? []);
    setHouses(hj.items ?? hj.houses ?? []);
    const catRes = await fetch('/api/inventory?section=categories');
    if (catRes.ok) {
      const cj = await catRes.json();
      setCategories(cj.categories ?? []);
    }
    setLoading(false);
  }, [i.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (warehouses[0] && !purchase.warehouseId) {
      setPurchase((p) => ({ ...p, warehouseId: warehouses[0].id }));
      setIssue((p) => ({ ...p, warehouseId: warehouses[0].id }));
      setWaste((p) => ({ ...p, warehouseId: warehouses[0].id }));
    }
  }, [warehouses, purchase.warehouseId]);

  async function createMaterial(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'material',
        ...matForm,
        minStock: Number(matForm.minStock) || 0,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setMatForm({ code: '', name: '', categoryId: matForm.categoryId, unit: 'BAG', minStock: '0' });
      await load();
    } else {
      setError(i.saveError ?? 'پاشەکەوت سەرکەوتوو نەبوو');
    }
  }

  async function doPurchase(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'purchase',
        date: new Date().toISOString(),
        warehouseId: purchase.warehouseId,
        paymentMethod: purchase.paymentMethod,
        lines: [
          {
            materialId: purchase.materialId,
            quantity: Number(purchase.quantity),
            unitCostIqd: Number(purchase.unitCostIqd),
          },
        ],
      }),
    });
    setBusy(false);
    if (res.ok) {
      setPurchase((p) => ({ ...p, quantity: '', unitCostIqd: '' }));
      await load();
      setTab('stock');
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.error ?? i.saveError ?? 'هەڵە');
    }
  }

  async function doIssue(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'issue',
        date: new Date().toISOString(),
        warehouseId: issue.warehouseId,
        houseId: issue.houseId,
        reason: issue.reason || null,
        lines: [{ materialId: issue.materialId, quantity: Number(issue.quantity) }],
      }),
    });
    setBusy(false);
    if (res.ok) {
      setIssue((p) => ({ ...p, quantity: '', reason: '' }));
      await load();
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.error ?? i.saveError ?? 'هەڵە');
    }
  }

  async function doWaste(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'waste',
        date: new Date().toISOString(),
        warehouseId: waste.warehouseId,
        materialId: waste.materialId,
        quantity: Number(waste.quantity),
        reason: waste.reason,
        houseId: waste.houseId || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setWaste((p) => ({ ...p, quantity: '' }));
      await load();
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.error ?? i.saveError ?? 'هەڵە');
    }
  }

  async function approve(wasteId: string, approve: boolean) {
    setBusy(true);
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'approveWaste', wasteId, approve }),
    });
    setBusy(false);
    await load();
  }

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary/50';

  const tabs = [
    { id: 'stock' as const, label: i.tabStock ?? 'کۆگا' },
    { id: 'purchase' as const, label: i.tabPurchase ?? 'کڕین' },
    { id: 'issue' as const, label: i.tabIssue ?? 'دەرکردن بۆ پڕۆژە' },
    { id: 'waste' as const, label: i.tabWaste ?? 'پاشماوە' },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Package className="h-6 w-6" />
          {i.title ?? 'کۆگای کەلوپەلی بیناسازی'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {i.subtitle ?? 'کڕین، کۆگا، دەرکردن بۆ پڕۆژە و پاشماوە — یەک جار لە حسابات'}
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-border overflow-hidden text-sm flex-wrap">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`px-3 py-2 ${tab === tb.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-rose-600 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="p-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : null}

      {!loading && tab === 'stock' ? (
        <div className="space-y-4">
          <form
            onSubmit={(e) => void createMaterial(e)}
            className="rounded-2xl border border-border bg-card p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            <input
              className={field}
              placeholder={i.code ?? 'کۆد'}
              value={matForm.code}
              onChange={(e) => setMatForm((f) => ({ ...f, code: e.target.value }))}
              required
            />
            <input
              className={field}
              placeholder={i.name ?? 'ناو'}
              value={matForm.name}
              onChange={(e) => setMatForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <select
              className={field}
              value={matForm.categoryId}
              onChange={(e) => setMatForm((f) => ({ ...f, categoryId: e.target.value }))}
              required
            >
              <option value="">{i.category ?? 'پۆل'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameKu || c.name}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={matForm.unit}
              onChange={(e) => setMatForm((f) => ({ ...f, unit: e.target.value }))}
            >
              {['BAG', 'KG', 'TON', 'M3', 'PCS', 'LITER'].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              {i.addMaterial ?? 'زیادکردنی کەلوپەل'}
            </button>
          </form>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3">{i.code ?? 'کۆد'}</th>
                  <th className="text-start px-4 py-3">{i.name ?? 'ناو'}</th>
                  <th className="text-start px-4 py-3">{i.category ?? 'پۆل'}</th>
                  <th className="text-start px-4 py-3">{i.stock ?? 'کۆگا'}</th>
                  <th className="text-start px-4 py-3">{i.avgCost ?? 'ناوەندی نرخ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-mono text-xs">{m.code}</td>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3">{m.category.nameKu || m.category.name}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {m.balances.reduce((s, b) => s + b.quantity, 0)} {m.unit}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(m.avgCostIqd, lang, 'IQD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'purchase' ? (
        <form
          onSubmit={(e) => void doPurchase(e)}
          className="rounded-2xl border border-border bg-card p-4 space-y-3 max-w-lg"
        >
          <select
            className={field}
            value={purchase.warehouseId}
            onChange={(e) => setPurchase((p) => ({ ...p, warehouseId: e.target.value }))}
            required
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={purchase.materialId}
            onChange={(e) => setPurchase((p) => ({ ...p, materialId: e.target.value }))}
            required
          >
            <option value="">{i.material ?? 'کەلوپەل'}</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={field}
              type="number"
              min="0"
              step="any"
              placeholder={i.qty ?? 'بڕ'}
              value={purchase.quantity}
              onChange={(e) => setPurchase((p) => ({ ...p, quantity: e.target.value }))}
              required
            />
            <input
              className={field}
              type="number"
              min="0"
              step="any"
              placeholder={i.unitCost ?? 'نرخی یەکە'}
              value={purchase.unitCostIqd}
              onChange={(e) => setPurchase((p) => ({ ...p, unitCostIqd: e.target.value }))}
              required
            />
          </div>
          <select
            className={field}
            value={purchase.paymentMethod}
            onChange={(e) =>
              setPurchase((p) => ({
                ...p,
                paymentMethod: e.target.value as 'CASH' | 'CREDIT',
              }))
            }
          >
            <option value="CASH">{i.cash ?? 'کاش'}</option>
            <option value="CREDIT">{i.credit ?? 'قەرز'}</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
          >
            {i.savePurchase ?? 'کڕین و داخڵکردنی کۆگا'}
          </button>
        </form>
      ) : null}

      {!loading && tab === 'issue' ? (
        <form
          onSubmit={(e) => void doIssue(e)}
          className="rounded-2xl border border-border bg-card p-4 space-y-3 max-w-lg"
        >
          <select
            className={field}
            value={issue.warehouseId}
            onChange={(e) => setIssue((p) => ({ ...p, warehouseId: e.target.value }))}
            required
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={issue.houseId}
            onChange={(e) => setIssue((p) => ({ ...p, houseId: e.target.value }))}
            required
          >
            <option value="">{i.project ?? 'پڕۆژە / خانوو'}</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.code} — {h.name}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={issue.materialId}
            onChange={(e) => setIssue((p) => ({ ...p, materialId: e.target.value }))}
            required
          >
            <option value="">{i.material ?? 'کەلوپەل'}</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
          <input
            className={field}
            type="number"
            min="0"
            step="any"
            placeholder={i.qty ?? 'بڕ'}
            value={issue.quantity}
            onChange={(e) => setIssue((p) => ({ ...p, quantity: e.target.value }))}
            required
          />
          <input
            className={field}
            placeholder={i.reason ?? 'هۆکار'}
            value={issue.reason}
            onChange={(e) => setIssue((p) => ({ ...p, reason: e.target.value }))}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
          >
            {i.saveIssue ?? 'دەرکردن بۆ پڕۆژە'}
          </button>
        </form>
      ) : null}

      {!loading && tab === 'waste' ? (
        <div className="space-y-4">
          <form
            onSubmit={(e) => void doWaste(e)}
            className="rounded-2xl border border-border bg-card p-4 space-y-3 max-w-lg"
          >
            <select
              className={field}
              value={waste.warehouseId}
              onChange={(e) => setWaste((p) => ({ ...p, warehouseId: e.target.value }))}
              required
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={waste.materialId}
              onChange={(e) => setWaste((p) => ({ ...p, materialId: e.target.value }))}
              required
            >
              <option value="">{i.material ?? 'کەلوپەل'}</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>
            <input
              className={field}
              type="number"
              min="0"
              step="any"
              placeholder={i.qty ?? 'بڕ'}
              value={waste.quantity}
              onChange={(e) => setWaste((p) => ({ ...p, quantity: e.target.value }))}
              required
            />
            <select
              className={field}
              value={waste.reason}
              onChange={(e) => setWaste((p) => ({ ...p, reason: e.target.value }))}
            >
              <option value="DAMAGE">{i.reasonDamage ?? 'زیان'}</option>
              <option value="CONSTRUCTION_WASTE">{i.reasonWaste ?? 'پاشماوەی بیناسازی'}</option>
              <option value="INCORRECT_MEASUREMENT">{i.reasonMeasure ?? 'پێوانەی هەڵە'}</option>
              <option value="THEFT_LOSS">{i.reasonTheft ?? 'دزی / ونبوون'}</option>
              <option value="EXPIRED">{i.reasonExpired ?? 'بەسەرچوو'}</option>
              <option value="OTHER">{i.reasonOther ?? 'هیتر'}</option>
            </select>
            <select
              className={field}
              value={waste.houseId}
              onChange={(e) => setWaste((p) => ({ ...p, houseId: e.target.value }))}
            >
              <option value="">{i.projectOptional ?? 'پڕۆژە (ئارەزوومەندانە)'}</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} — {h.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
            >
              {i.saveWaste ?? 'تۆمارکردنی پاشماوە'}
            </button>
          </form>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3">{i.material ?? 'کەلوپەل'}</th>
                  <th className="text-start px-4 py-3">{i.qty ?? 'بڕ'}</th>
                  <th className="text-start px-4 py-3">{i.value ?? 'بەها'}</th>
                  <th className="text-start px-4 py-3">{i.status ?? 'دۆخ'}</th>
                  <th className="text-start px-4 py-3">{i.actions ?? 'کردار'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wastes.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3">
                      {w.material.code} · {w.project?.house.code ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{w.quantity}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(w.estimatedValueIqd, lang, 'IQD')}
                    </td>
                    <td className="px-4 py-3">{w.approvalStatus}</td>
                    <td className="px-4 py-3">
                      {w.approvalStatus === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-emerald-700 text-xs font-medium"
                            onClick={() => void approve(w.id, true)}
                          >
                            {i.approve ?? 'پەسەند'}
                          </button>
                          <button
                            type="button"
                            className="text-rose-600 text-xs font-medium"
                            onClick={() => void approve(w.id, false)}
                          >
                            {i.reject ?? 'ڕەتکردنەوە'}
                          </button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
