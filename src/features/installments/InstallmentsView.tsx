'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type InstallmentRow = {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  notes: string | null;
  contract: {
    contractNo: string;
    title: string;
    buyerName: string | null;
    house: { code: string } | null;
  };
};

export function InstallmentsView({ t, lang }: { t: Dictionary; lang: string }) {
  const [items, setItems] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/installments');
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else setError(t.pages.projects.error);
    setLoading(false);
  }, [t.pages.projects.error]);

  useEffect(() => {
    void load();
  }, [load]);

  const markPaid = async (id: string) => {
    const res = await fetch('/api/installments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'PAID' }),
    });
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-semibold text-foreground">{t.pages.installments.title}</h1>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">{t.pages.installments.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{t.pages.contracts.title}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.contracts.customer}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.amount}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.contracts.endDate}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.status}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-primary">{row.contract.contractNo}</div>
                      <div className="text-muted-foreground text-xs">{row.contract.house?.code ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">{row.contract.buyerName ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{formatCurrency(row.amount, lang)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(row.dueDate, lang)}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">
                      {row.status !== 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => void markPaid(row.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t.dashboard.statusPaid}
                        </button>
                      ) : (
                        '—'
                      )}
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
