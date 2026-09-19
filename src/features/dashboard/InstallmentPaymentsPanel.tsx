'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { InstallmentRow } from './types';
import type { Dictionary } from '@/i18n/dictionaries';

type FilterKey = 'open' | 'paid' | 'overdue' | 'all';

export function InstallmentPaymentsPanel({
  t,
  lang,
  rows,
}: {
  t: Dictionary;
  lang: string;
  rows: InstallmentRow[];
}) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKey>('open');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'open' && !['PENDING', 'OVERDUE'].includes(row.status)) return false;
      if (filter === 'paid' && row.status !== 'PAID') return false;
      if (filter === 'overdue' && row.status !== 'OVERDUE') return false;
      if (!query) return true;
      const hay = [row.contractNo, row.buyerName, row.houseCode, row.houseName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [rows, q, filter]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'open', label: t.dashboard.filterOpen },
    { key: 'overdue', label: t.dashboard.filterOverdue },
    { key: 'paid', label: t.dashboard.filterPaid },
    { key: 'all', label: t.common.all },
  ];

  const statusLabel = (status: string) => {
    if (status === 'PAID') return t.dashboard.statusPaid;
    if (status === 'OVERDUE') return t.dashboard.statusOverdue;
    if (status === 'PENDING') return t.dashboard.statusPending;
    return status;
  };

  const statusClass = (status: string) => {
    if (status === 'PAID') return 'bg-teal-500/12 text-teal-700 border-teal-500/25';
    if (status === 'OVERDUE') return 'bg-rose-500/12 text-rose-700 border-rose-500/25';
    return 'bg-amber-500/12 text-amber-700 border-amber-500/25';
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-card/95 overflow-hidden shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t.dashboard.installmentList}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t.dashboard.installmentListHint}</p>
        </div>
        <Link
          href={`/${lang}/installments`}
          className="text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          {t.dashboard.viewAllInstallments}
        </Link>
      </div>

      <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.table.search}
            className="w-full rounded-xl border border-border bg-background py-2 pe-3 ps-9 text-sm outline-none focus:border-primary/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.key
                  ? 'border-foreground/20 bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-start font-medium">{t.dashboard.costCenter}</th>
              <th className="px-4 py-3 text-start font-medium">{t.pdf.customer}</th>
              <th className="px-4 py-3 text-start font-medium">{t.nav.contracts}</th>
              <th className="px-4 py-3 text-start font-medium">{t.dashboard.paymentStatus}</th>
              <th className="px-4 py-3 text-start font-medium">{t.dashboard.amount}</th>
              <th className="px-4 py-3 text-start font-medium">{t.dashboard.dueDate}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/50 text-2xl text-muted-foreground/50">
                      ∅
                    </div>
                    <p className="text-sm text-muted-foreground">{t.table.noResults}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/80 hover:bg-muted/35 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-primary">{row.houseCode ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.houseName ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{row.buyerName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.contractNo}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                        statusClass(row.status),
                      )}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {formatCurrency(row.amount, lang)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatDate(row.dueDate, lang)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
