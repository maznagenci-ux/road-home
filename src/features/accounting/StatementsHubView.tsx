'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type Party = { id: string; name: string };

export function StatementsHubView({ t, lang }: { t: Dictionary; lang: string }) {
  const labels = (t.pages as { engine?: Record<string, string> }).engine ?? {};
  const [tab, setTab] = useState<'customer' | 'supplier' | 'property' | 'owner' | 'installments'>(
    'customer',
  );
  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [properties, setProperties] = useState<Party[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [commission, setCommission] = useState<{ ratePct: number; commissionIqd: number } | null>(
    null,
  );

  const loadLists = useCallback(async () => {
    const res = await fetch('/api/accounting/statements?kind=lists');
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'error');
      return;
    }
    setCustomers(json.customers || []);
    setSuppliers(json.suppliers || []);
    setProperties(json.properties || []);
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  async function loadStatement() {
    setError('');
    setData(null);
    if (tab === 'owner') {
      const res = await fetch('/api/accounting/statements?kind=owner-capital');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'error');
        return;
      }
      setData(json);
      return;
    }
    if (tab === 'installments') {
      const res = await fetch('/api/accounting/statements?kind=overdue-installments');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'error');
        return;
      }
      setData(json);
      return;
    }
    if (!selectedId) {
      setError(labels.selectEntity ?? 'هەڵبژاردن پێویستە');
      return;
    }
    const res = await fetch(
      `/api/accounting/statements?kind=${tab}&id=${encodeURIComponent(selectedId)}`,
    );
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'error');
      return;
    }
    setData(json);
  }

  async function calcCommission() {
    const res = await fetch(
      `/api/accounting/statements?kind=commission&amount=${commissionAmount}`,
    );
    const json = await res.json();
    if (res.ok) setCommission(json);
  }

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50';
  const parties =
    tab === 'customer' ? customers : tab === 'supplier' ? suppliers : properties;

  const pdfHref =
    tab === 'customer' && selectedId
      ? `/api/pdf/statement/customer?id=${selectedId}`
      : tab === 'supplier' && selectedId
        ? `/api/pdf/statement/supplier?id=${selectedId}`
        : tab === 'property' && selectedId
          ? `/api/pdf/statement/property?id=${selectedId}`
          : null;

  return (
    <div className="space-y-5 max-w-5xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-semibold">{labels.statementsTitle ?? 'بەیاننامە داراییەکان'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {labels.statementsHint ?? 'کڕیار، دابینکەر، خانووبەرە، سەرمایەی خاوەن، قسطە دواکەوتووەکان'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['customer', labels.customer ?? 'کڕیار'],
            ['supplier', labels.supplier ?? 'دابینکەر'],
            ['property', labels.property ?? 'خانووبەرە'],
            ['owner', labels.ownerCapital ?? 'سەرمایەی خاوەن'],
            ['installments', labels.overdue ?? 'قستی دواکەوتوو'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              setData(null);
              setSelectedId('');
            }}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              tab === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3 items-end">
        {tab !== 'owner' && tab !== 'installments' ? (
          <select
            className={field}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">{labels.select ?? 'هەڵبژێرە'}</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          onClick={() => void loadStatement()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm"
        >
          {labels.load ?? 'پیشاندان'}
        </button>
        {pdfHref ? (
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-border text-sm"
          >
            {labels.pdf ?? 'PDF'}
          </a>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-medium">{labels.commissionCalc ?? 'ژمێرکردنی کۆمیسیۆن'}</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <input
            className={field}
            type="number"
            value={commissionAmount || ''}
            onChange={(e) => setCommissionAmount(Number(e.target.value))}
            placeholder={labels.saleAmount ?? 'بڕی فرۆشتن'}
          />
          <button
            type="button"
            onClick={() => void calcCommission()}
            className="px-3 py-2 rounded-xl border border-border text-sm"
          >
            {labels.calculate ?? 'ژمێرکردن'}
          </button>
          {commission ? (
            <p className="text-sm">
              {commission.ratePct}% → {formatCurrency(commission.commissionIqd, lang, 'IQD')}
            </p>
          ) : null}
        </div>
      </div>

      {data ? (
        <pre className="rounded-2xl border border-border bg-muted/40 p-4 text-xs overflow-auto max-h-[480px] whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}

      {data && tab === 'installments' && Array.isArray((data as { items?: unknown }).items) ? (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="text-start p-3">{labels.contract ?? 'گرێبەست'}</th>
                <th className="text-start p-3">{labels.party ?? 'کڕیار'}</th>
                <th className="text-start p-3">{labels.amount ?? 'بڕ'}</th>
                <th className="text-start p-3">{labels.date ?? 'بەروار'}</th>
              </tr>
            </thead>
            <tbody>
              {((data as { items: Array<Record<string, unknown>> }).items || []).map((row) => (
                <tr key={String(row.id)} className="border-t border-border">
                  <td className="p-3">{String(row.contractNo)}</td>
                  <td className="p-3">
                    {String(row.buyerName ?? '—')}
                    {row.buyerPhone ? (
                      <span className="text-xs text-muted-foreground block">
                        {String(row.buyerPhone)}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">{formatCurrency(Number(row.amount), lang, 'IQD')}</td>
                  <td className="p-3">{formatDate(String(row.dueDate), lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
