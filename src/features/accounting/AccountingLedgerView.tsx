'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';
import { tVoucherAccountType } from '@/i18n/translate';
import { CommissionAccountsPanel } from './CommissionAccountsPanel';

type VoucherRow = {
  id: string;
  voucherNo: string;
  accountType: string;
  category: string | null;
  amountIqd: number;
  partyName: string;
  createdAt: string;
  house: { code: string; name: string };
  createdBy: { name: string } | null;
};

type LedgerStream = 'construction' | 'constructionDeposit' | 'trading' | 'rental';
type LedgerKind = 'all' | 'income' | 'expense';

export function AccountingLedgerView({
  t,
  lang,
  kind = 'all',
  stream,
  title,
}: {
  t: Dictionary;
  lang: string;
  kind?: LedgerKind;
  stream?: LedgerStream;
  title: string;
}) {
  const [items, setItems] = useState<VoucherRow[]>([]);
  const [totals, setTotals] = useState({
    income: 0,
    expense: 0,
    salesIncome: 0,
    rentalIncome: 0,
    constructionExpense: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [incomeTab, setIncomeTab] = useState<'trading' | 'rental'>(
    stream === 'rental' ? 'rental' : 'trading',
  );
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerDebounced, setLedgerDebounced] = useState('');
  const [ledgerFrom, setLedgerFrom] = useState('');
  const [ledgerTo, setLedgerTo] = useState('');

  const activeStream: LedgerStream | undefined =
    stream === 'construction' ||
    stream === 'constructionDeposit' ||
    stream === 'trading' ||
    stream === 'rental'
      ? stream
      : kind === 'income'
        ? incomeTab
        : kind === 'expense'
          ? 'construction'
          : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    const qs = activeStream
      ? `?stream=${activeStream}`
      : kind === 'all'
        ? ''
        : `?kind=${kind}`;
    const res = await fetch(`/api/accounting/ledger${qs}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
      setTotals(
        data.totals ?? {
          income: 0,
          expense: 0,
          salesIncome: 0,
          rentalIncome: 0,
          constructionExpense: 0,
        },
      );
    } else setError(t.pages.projects.error);
    setLoading(false);
  }, [activeStream, kind, t.pages.projects.error]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tmr = setTimeout(() => setLedgerDebounced(ledgerSearch.trim().toLowerCase()), 250);
    return () => clearTimeout(tmr);
  }, [ledgerSearch]);

  const filteredLedger = useMemo(() => {
    return items.filter((row) => {
      if (ledgerFrom) {
        const d = row.createdAt.slice(0, 10);
        if (d < ledgerFrom) return false;
      }
      if (ledgerTo) {
        const d = row.createdAt.slice(0, 10);
        if (d > ledgerTo) return false;
      }
      if (ledgerDebounced) {
        const cat = (row.category ?? row.accountType ?? '').toLowerCase();
        const label = tVoucherAccountType(t, row.category ?? row.accountType).toLowerCase();
        const hay = [
          row.voucherNo,
          row.partyName,
          row.house.code,
          row.house.name,
          cat,
          label,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(ledgerDebounced)) return false;
      }
      return true;
    });
  }, [items, ledgerFrom, ledgerTo, ledgerDebounced, t]);

  const showIncomeTabs = kind === 'income' && !stream;
  const showOverviewLinks = kind === 'all' && !stream;
  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {stream === 'trading' || stream === 'rental' || stream === 'construction' ? (
            <p className="text-sm text-muted-foreground mt-1">
              {stream === 'trading'
                ? 'بەشی کرین و فرۆشتن — جیا لە کرێ و بیناسازی'
                : stream === 'rental'
                  ? 'بەشی بەکرێدان — جیا لە فرۆشتن و بیناسازی'
                  : 'بەشی دروستکردنی خانوو — جیا لە فرۆشتن و کرێ و ئۆفیس'}
            </p>
          ) : null}
        </div>
        {showOverviewLinks ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${lang}/accounting/income`}
              className="px-3 py-2 rounded-xl text-sm border border-border bg-card hover:border-primary/40"
            >
              {t.nav.salesIncome}
            </Link>
            <Link
              href={`/${lang}/accounting/expenses`}
              className="px-3 py-2 rounded-xl text-sm border border-border bg-card hover:border-primary/40"
            >
              {t.nav.constructionExpenses}
            </Link>
          </div>
        ) : null}
      </div>

      {showIncomeTabs ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIncomeTab('trading')}
            className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
              incomeTab === 'trading'
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            }`}
          >
            {t.nav.salesIncome}
          </button>
          <button
            type="button"
            onClick={() => setIncomeTab('rental')}
            className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
              incomeTab === 'rental'
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            }`}
          >
            {t.nav.rentalIncome}
          </button>
        </div>
      ) : null}

      {showOverviewLinks ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t.nav.salesIncome}</p>
            <p className="text-2xl font-semibold tabular-nums text-primary mt-1">
              {formatCurrency(totals.salesIncome, lang)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t.nav.constructionExpenses}</p>
            <p className="text-2xl font-semibold tabular-nums text-rose-600 mt-1">
              {formatCurrency(totals.constructionExpense, lang)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t.nav.rentalIncome}</p>
            <p className="text-2xl font-semibold tabular-nums text-sky-600 mt-1">
              {formatCurrency(totals.rentalIncome, lang)}
            </p>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {activeStream === 'trading' || activeStream === 'rental' || kind === 'all' ? (
        <CommissionAccountsPanel
          t={t}
          lang={lang}
          stream={
            activeStream === 'trading' ? 'sale' : activeStream === 'rental' ? 'rental' : 'all'
          }
        />
      ) : null}

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-col lg:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder={t.table.search}
              className={cn(field, 'w-full ps-9')}
            />
          </div>
          <input
            type="date"
            value={ledgerFrom}
            onChange={(e) => setLedgerFrom(e.target.value)}
            className={field}
            aria-label="from"
          />
          <input
            type="date"
            value={ledgerTo}
            onChange={(e) => setLedgerTo(e.target.value)}
            className={field}
            aria-label="to"
          />
        </div>
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>
        ) : filteredLedger.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">{t.table.noResults}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{t.dashboard.voucherId}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.dashboard.dateTime}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.dashboard.costCenter}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.dashboard.category}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.dashboard.party}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.dashboard.amount}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{row.voucherNo}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {formatDate(row.createdAt, lang)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.house.code}</td>
                    <td className="px-4 py-3">
                      {tVoucherAccountType(t, row.category ?? row.accountType)}
                    </td>
                    <td className="px-4 py-3 font-medium">{row.partyName}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {formatCurrency(row.amountIqd, lang)}
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
