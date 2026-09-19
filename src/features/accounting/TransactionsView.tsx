'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/accounting/chart';

type Txn = {
  id: string;
  txnNo: string;
  date: string;
  type: string;
  category: string;
  amountBaseIqd: number;
  amountOriginal: number;
  currency: string;
  partyName: string | null;
  description: string | null;
  paymentMethod: string;
  cashAccount: { name: string; code: string } | null;
  bankAccount: { name: string; code: string } | null;
};

type MoneyAcc = { id: string; code: string; name: string };

const POST_TYPES = [
  'INCOME',
  'EXPENSE',
  'CUSTOMER_PAYMENT',
  'SUPPLIER_PAYMENT',
  'OWNER_CAPITAL',
  'OWNER_WITHDRAWAL',
  'PROPERTY_SALE',
  'PROPERTY_RENTAL',
  'SALARY',
  'COMMISSION',
  'EMPLOYEE_COMMISSION',
  'ADJUSTMENT',
] as const;

export function TransactionsView({ t, lang }: { t: Dictionary; lang: string }) {
  const labels = (t.pages as { engine?: Record<string, string> }).engine ?? {};
  const [items, setItems] = useState<Txn[]>([]);
  const [cashAccounts, setCashAccounts] = useState<MoneyAcc[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    type: 'INCOME' as (typeof POST_TYPES)[number],
    category: 'OTHER_INCOME',
    amountOriginal: 0,
    currency: 'IQD' as const,
    exchangeRate: 1,
    partyName: '',
    paymentMethod: 'CASH' as 'CASH' | 'CREDIT',
    cashAccountId: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const res = await fetch(`/api/accounting/transactions${qs}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'error');
      return;
    }
    setItems(data.items || []);
    setCashAccounts(data.cashAccounts || []);
    setForm((f) => ({
      ...f,
      cashAccountId: f.cashAccountId || data.cashAccounts?.[0]?.id || '',
    }));
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50';

  const categories =
    form.type === 'EXPENSE' || form.type === 'SALARY' || form.type === 'SUPPLIER_PAYMENT'
      ? EXPENSE_CATEGORIES
      : [...INCOME_CATEGORIES, 'OWNER_CAPITAL', 'OWNER_WITHDRAWAL', 'OTHER'];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/accounting/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        currency: 'IQD',
        exchangeRate: 1,
        cashAccountId: form.paymentMethod === 'CASH' ? form.cashAccountId : null,
        bankAccountId: null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'error');
      return;
    }
    setForm((f) => ({ ...f, amountOriginal: 0, partyName: '', description: '' }));
    await load();
  }

  async function softDelete(id: string) {
    if (!confirm(labels.confirmDelete ?? 'سڕینەوەی نەرم؟')) return;
    const res = await fetch(`/api/accounting/transactions?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'error');
      return;
    }
    await load();
  }

  return (
    <div className="space-y-5 max-w-6xl" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{labels.txnTitle ?? 'مامەڵەکان'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {labels.txnHint ?? 'تۆماری داهات، خەرجی، پارەدان و سەرمایەی خاوەن'}
          </p>
        </div>
        <input
          className={`${field} max-w-xs`}
          placeholder={labels.search ?? 'گەڕان…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
          {POST_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input className={field} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input className={field} type="number" min={1} required placeholder={labels.amount ?? 'بڕ (دینار)'} value={form.amountOriginal || ''} onChange={(e) => setForm({ ...form, amountOriginal: Number(e.target.value) })} />
        <select className={field} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })}>
          <option value="CASH">نەقد</option>
          <option value="CREDIT">قەرز</option>
        </select>
        {form.paymentMethod === 'CASH' ? (
          <select className={field} value={form.cashAccountId} onChange={(e) => setForm({ ...form, cashAccountId: e.target.value })}>
            {cashAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        ) : (
          <div />
        )}
        <input className={field} placeholder={labels.party ?? 'لایەن'} value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} />
        <input className={`${field} md:col-span-2`} placeholder={labels.note ?? 'تێبینی'} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm md:col-span-3">
          {labels.post ?? 'تۆمارکردن'}
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="text-start p-3">#</th>
              <th className="text-start p-3">{labels.date ?? 'بەروار'}</th>
              <th className="text-start p-3">{labels.type ?? 'جۆر'}</th>
              <th className="text-start p-3">{labels.category ?? 'پۆل'}</th>
              <th className="text-start p-3">{labels.party ?? 'لایەن'}</th>
              <th className="text-start p-3">{labels.amount ?? 'بڕ'}</th>
              <th className="text-start p-3">{labels.original ?? 'ڕەسەن'}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{row.txnNo}</td>
                <td className="p-3">{formatDate(row.date, lang)}</td>
                <td className="p-3">{row.type}</td>
                <td className="p-3">{row.category}</td>
                <td className="p-3">{row.partyName ?? '—'}</td>
                <td className="p-3 font-medium">{formatCurrency(row.amountBaseIqd, lang, 'IQD')}</td>
                <td className="p-3 text-xs text-muted-foreground">د.ع</td>
                <td className="p-3">
                  <button type="button" onClick={() => softDelete(row.id)} className="text-xs text-destructive">
                    {labels.delete ?? 'سڕینەوە'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
