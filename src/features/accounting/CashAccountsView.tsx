'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type CashAccount = {
  id: string;
  code: string;
  name: string;
  currency: string;
  openingBalance: number;
  isActive: boolean;
  allowNegative: boolean;
};

type MoneyReport = {
  accountId: string;
  code: string;
  name: string;
  openingBalanceIqd: number;
  closingBalanceIqd: number;
};

export function CashAccountsView({ t, lang }: { t: Dictionary; lang: string }) {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [reports, setReports] = useState<MoneyReport[]>([]);
  const [money, setMoney] = useState({ cashIqd: 0, totalIqd: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    openingBalance: 0,
    allowNegative: false,
  });
  const [move, setMove] = useState({
    action: 'deposit' as 'deposit' | 'withdraw' | 'transfer',
    cashAccountId: '',
    toCashId: '',
    amount: 0,
    description: '',
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/accounting/cash');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'error');
      return;
    }
    setAccounts(data.accounts || []);
    setReports(data.reports || []);
    const cash = data.money?.cashIqd ?? 0;
    setMoney({ cashIqd: cash, totalIqd: cash });
    if (!move.cashAccountId && data.accounts?.[0]) {
      setMove((m) => ({ ...m, cashAccountId: data.accounts[0].id }));
    }
  }, [move.cashAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/accounting/cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'error');
      return;
    }
    setForm({ code: '', name: '', openingBalance: 0, allowNegative: false });
    await load();
  }

  async function submitMove(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body =
      move.action === 'transfer'
        ? {
            action: 'transfer',
            amount: move.amount,
            fromCashId: move.cashAccountId,
            toCashId: move.toCashId,
            description: move.description,
          }
        : {
            action: move.action,
            cashAccountId: move.cashAccountId,
            amount: move.amount,
            description: move.description,
          };
    const res = await fetch('/api/accounting/cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'error');
      return;
    }
    setMove((m) => ({ ...m, amount: 0, description: '' }));
    await load();
  }

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50';
  const labels = (t.pages as { engine?: Record<string, string> }).engine ?? {};

  return (
    <div className="space-y-5 max-w-5xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-semibold">{labels.cashTitle ?? 'نەقد / خەزنە'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {labels.cashHint ?? 'هەژمارەکانی نەقد، واریز، ڕاکێشان و گواستنەوە'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: labels.cashTotal ?? 'کۆی نەقد', value: money.cashIqd },
          { label: labels.available ?? 'پارەی بەردەست', value: money.totalIqd },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-lg font-semibold mt-1">{formatCurrency(c.value, lang, 'IQD')}</p>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={createAccount} className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-medium">{labels.newCash ?? 'هەژماری نەقدی نوێ'}</h2>
          <input
            className={field}
            placeholder={labels.code ?? 'کۆد'}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <input
            className={field}
            placeholder={labels.name ?? 'ناو'}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={field}
            type="number"
            placeholder={labels.opening ?? 'باڵانسی دەستپێک'}
            value={form.openingBalance}
            onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowNegative}
              onChange={(e) => setForm({ ...form, allowNegative: e.target.checked })}
            />
            {labels.allowNegative ?? 'ڕێگەدان بە باڵانسی نەرێنی'}
          </label>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm"
          >
            {labels.save ?? 'پاشەکەوت'}
          </button>
        </form>

        <form onSubmit={submitMove} className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-medium">{labels.movement ?? 'جوڵەی نەقد'}</h2>
          <select
            className={field}
            value={move.action}
            onChange={(e) =>
              setMove({ ...move, action: e.target.value as typeof move.action })
            }
          >
            <option value="deposit">{labels.deposit ?? 'واریز'}</option>
            <option value="withdraw">{labels.withdraw ?? 'ڕاکێشان'}</option>
            <option value="transfer">{labels.transfer ?? 'گواستنەوە'}</option>
          </select>
          <select
            className={field}
            value={move.cashAccountId}
            onChange={(e) => setMove({ ...move, cashAccountId: e.target.value })}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
          {move.action === 'transfer' ? (
            <select
              className={field}
              value={move.toCashId}
              onChange={(e) => setMove({ ...move, toCashId: e.target.value })}
              required
            >
              <option value="">{labels.toAccount ?? 'بۆ هەژمار'}</option>
              {accounts
                .filter((a) => a.id !== move.cashAccountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
            </select>
          ) : null}
          <input
            className={field}
            type="number"
            min={1}
            value={move.amount || ''}
            onChange={(e) => setMove({ ...move, amount: Number(e.target.value) })}
            placeholder={labels.amount ?? 'بڕ'}
            required
          />
          <input
            className={field}
            value={move.description}
            onChange={(e) => setMove({ ...move, description: e.target.value })}
            placeholder={labels.note ?? 'تێبینی'}
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm"
          >
            {labels.submit ?? 'جێبەجێکردن'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="text-start p-3">{labels.code ?? 'کۆد'}</th>
              <th className="text-start p-3">{labels.name ?? 'ناو'}</th>
              <th className="text-start p-3">{labels.opening ?? 'کردنەوە'}</th>
              <th className="text-start p-3">{labels.closing ?? 'داخستن'}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.accountId} className="border-t border-border">
                <td className="p-3">{r.code}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{formatCurrency(r.openingBalanceIqd, lang, 'IQD')}</td>
                <td className="p-3 font-medium">
                  {formatCurrency(r.closingBalanceIqd, lang, 'IQD')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
