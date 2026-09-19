'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Loader2, Printer, Download, Search } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';
import {
  accountColumnLabels,
  filterRowsByStream,
  kindLabel,
  type AccountKind,
  type AccountRow,
  type AccountStream,
} from '@/lib/exports/account-rows';

export function CommissionAccountsPanel({
  t,
  lang,
  stream = 'all',
}: {
  t: Dictionary;
  lang: string;
  stream?: AccountStream;
}) {
  const locale = lang as Locale;
  const L = accountColumnLabels(locale, stream);
  const a = (t.pages as { accountsExport?: Record<string, string> }).accountsExport ?? {};
  const [items, setItems] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [employee, setEmployee] = useState('');
  const showKind = stream === 'all';
  const showProgress = stream === 'sale' || stream === 'all';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/exports/accounts?type=${stream}&format=json&locale=${locale}`);
    if (res.ok) {
      const data = await res.json();
      setItems(filterRowsByStream(data.items ?? [], stream));
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [stream, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(search.trim().toLowerCase()), 250);
    return () => clearTimeout(tmr);
  }, [search]);

  const employeeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of items) {
      if (row.intermediaryName && row.intermediaryName !== '—') {
        names.add(row.intermediaryName);
      }
    }
    return Array.from(names).sort((x, y) => x.localeCompare(y, 'ckb'));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (employee && row.intermediaryName !== employee) return false;
      if (from) {
        const d = row.createdAt.slice(0, 10);
        if (d < from) return false;
      }
      if (to) {
        const d = row.createdAt.slice(0, 10);
        if (d > to) return false;
      }
      if (debounced) {
        const hay = [
          row.refNo,
          row.name,
          row.sellerName,
          row.buyerName,
          row.intermediaryName,
          row.personName,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(debounced)) return false;
      }
      return true;
    });
  }, [items, employee, from, to, debounced]);

  const title =
    stream === 'sale'
      ? (a.titleSale ?? 'حیساباتی دەستخۆشی — کڕین و فرۆشتن')
      : stream === 'rental'
        ? (a.titleRental ?? 'حیساباتی دەستخۆشی — کرێ')
        : (a.titleAll ?? 'حیساباتی دەستخۆشی — فرۆشتن و کرێ');

  const subtitle =
    stream === 'sale'
      ? (a.subtitleSale ?? 'تەنها گرێبەستی کڕین و فرۆشتن — دەستخۆشی لە فرۆشیار و کڕیار')
      : stream === 'rental'
        ? (a.subtitleRental ?? 'تەنها گرێبەستی کرێ — دەستخۆشی لە بەکرێدەر و کرێچی')
        : (a.subtitle ?? 'هەموو گرێبەستەکان — جۆرەکە لە ستوونی جۆر دیارە');

  const totals = useMemo(() => {
    let seller = 0;
    let buyer = 0;
    let sellerUsd = 0;
    let buyerUsd = 0;
    let paid = 0;
    let remaining = 0;
    let priceIqd = 0;
    let priceUsd = 0;
    for (const row of filtered) {
      seller += row.commissionSellerIqd || 0;
      buyer += row.commissionBuyerIqd || 0;
      sellerUsd += row.commissionSellerUsd || 0;
      buyerUsd += row.commissionBuyerUsd || 0;
      paid += row.paidAmountIqd || 0;
      remaining += row.remainingAmountIqd || 0;
      priceIqd += row.propertyPriceIqd || 0;
      priceUsd += row.propertyPriceUsd || 0;
    }
    return {
      seller,
      buyer,
      total: seller + buyer,
      sellerUsd,
      buyerUsd,
      totalUsd: Math.round((sellerUsd + buyerUsd) * 100) / 100,
      paid,
      remaining,
      priceIqd,
      priceUsd: Math.round(priceUsd * 100) / 100,
    };
  }, [filtered]);

  const Dual = ({ iqd, usd, className }: { iqd: number; usd: number; className?: string }) => (
    <div className={cn('leading-tight', className)}>
      <div className="font-semibold tabular-nums">{formatCurrency(iqd, locale, 'IQD')}</div>
      <div className="text-[11px] tabular-nums opacity-80">{formatCurrency(usd, locale, 'USD')}</div>
    </div>
  );

  const exportExcel = (id?: string) => {
    const key = id ?? 'all';
    setBusy(`xlsx-${key}`);
    const qs = new URLSearchParams({
      type: stream,
      format: 'xlsx',
      locale,
    });
    if (id) qs.set('id', id);
    const aEl = document.createElement('a');
    aEl.href = `/api/exports/accounts?${qs.toString()}`;
    aEl.download = '';
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
    setTimeout(() => setBusy(null), 800);
  };

  const printA4 = (id?: string) => {
    const qs = new URLSearchParams({
      type: stream,
      format: 'html',
      locale,
      print: '1',
    });
    if (id) qs.set('id', id);
    window.open(`/api/exports/accounts?${qs.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const detailHref = (row: AccountRow) =>
    row.kind === 'sale'
      ? `/${lang}/contracts/${row.id}/edit`
      : `/${lang}/rentals`;

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  const colSpan =
    11 + (showKind ? 1 : 0) + (showProgress ? 1 : 0);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden space-y-0">
      <div className="px-4 py-4 border-b border-border flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => printA4()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs border border-border bg-muted/50 hover:bg-muted"
          >
            <Printer className="h-3.5 w-3.5" />
            {a.printAllA4 ?? 'گشت چاپ A4'}
          </button>
          <button
            type="button"
            onClick={() => exportExcel()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs border border-border bg-muted/50 hover:bg-muted"
          >
            {busy === 'xlsx-all' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            {a.exportAllExcel ?? 'گشت بۆ ئەکسڵ'}
          </button>
        </div>
      </div>

      {!loading && items.length > 0 ? (
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-b border-border bg-muted/20">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{L.propertyPrice}</p>
            <Dual iqd={totals.priceIqd} usd={totals.priceUsd} className="mt-1 text-slate-800" />
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{L.commissionSeller}</p>
            <Dual iqd={totals.seller} usd={totals.sellerUsd} className="mt-1 text-sky-800" />
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{L.commissionBuyer}</p>
            <Dual iqd={totals.buyer} usd={totals.buyerUsd} className="mt-1 text-violet-800" />
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">
              {a.totalBothSides ?? L.commission}
            </p>
            <Dual iqd={totals.total} usd={totals.totalUsd} className="mt-1 text-emerald-800" />
          </div>
        </div>
      ) : null}

      <div className="px-4 py-3 flex flex-col lg:flex-row flex-wrap gap-3 border-b border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={a.searchPlaceholder ?? 'گەڕان بە ژمارە، ناو، کڕیار، فرۆشیار…'}
            className={cn(field, 'w-full ps-9')}
          />
        </div>
        <select
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          className={cn(field, 'min-w-[160px]')}
          aria-label={L.intermediaryName}
        >
          <option value="">{a.employeeAll ?? 'هەموو کارمەندەکان'}</option>
          {employeeOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={field}
          aria-label={a.fromDate ?? 'لە بەروار'}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={field}
          aria-label={a.toDate ?? 'بۆ بەروار'}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-sm text-start">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">{L.refNo}</th>
              {showKind ? <th className="px-3 py-3 font-medium">{L.kind}</th> : null}
              <th className="px-3 py-3 font-medium">{L.name}</th>
              <th className="px-3 py-3 font-medium">{L.currency}</th>
              <th className="px-3 py-3 font-medium text-slate-800">{L.propertyPrice}</th>
              <th className="px-3 py-3 font-medium text-sky-800">{L.commissionSeller}</th>
              <th className="px-3 py-3 font-medium text-violet-800">{L.commissionBuyer}</th>
              <th className="px-3 py-3 font-medium text-emerald-800">{L.commission}</th>
              {showProgress ? (
                <th className="px-3 py-3 font-medium">{a.collection ?? 'وەرگرتن / ماوە'}</th>
              ) : null}
              <th className="px-3 py-3 font-medium">{L.intermediaryName}</th>
              <th className="px-3 py-3 font-medium">{L.sellerName}</th>
              <th className="px-3 py-3 font-medium">{L.buyerName}</th>
              <th className="px-3 py-3 font-medium w-28" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
                  {t.common.loading}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-14 text-center text-muted-foreground">
                  {items.length === 0
                    ? stream === 'sale'
                      ? (a.emptySale ?? 'هیچ گرێبەستێکی کڕین و فرۆشتن نییە')
                      : stream === 'rental'
                        ? (a.emptyRental ?? 'هیچ گرێبەستێکی کرێ نییە')
                        : (a.empty ?? 'هیچ حیساباتێک نییە')
                    : (a.searchEmpty ?? t.table.noResults)}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={`${row.kind}-${row.id}`} className="border-b border-border hover:bg-muted/40">
                  <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    <Link
                      href={detailHref(row)}
                      className="text-primary hover:underline"
                    >
                      {row.refNo}
                    </Link>
                  </td>
                  {showKind ? (
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 rounded-lg text-[11px] font-medium',
                          row.kind === 'sale'
                            ? 'bg-sky-500/10 text-sky-700'
                            : 'bg-amber-500/10 text-amber-800',
                        )}
                      >
                        {kindLabel(row.kind as AccountKind, locale)}
                      </span>
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 font-medium max-w-[12rem] truncate">
                    <Link href={detailHref(row)} className="hover:text-primary hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded-lg text-[11px] font-semibold',
                        row.currency === 'USD'
                          ? 'bg-emerald-500/10 text-emerald-800'
                          : 'bg-slate-500/10 text-slate-700',
                      )}
                    >
                      {row.currency}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-800">
                    <Dual iqd={row.propertyPriceIqd} usd={row.propertyPriceUsd} />
                  </td>
                  <td className="px-3 py-2.5 text-sky-800">
                    <Dual iqd={row.commissionSellerIqd} usd={row.commissionSellerUsd} />
                  </td>
                  <td className="px-3 py-2.5 text-violet-800">
                    <Dual iqd={row.commissionBuyerIqd} usd={row.commissionBuyerUsd} />
                  </td>
                  <td className="px-3 py-2.5 text-emerald-700">
                    <Dual iqd={row.commissionIqd} usd={row.commissionUsd} />
                  </td>
                  {showProgress ? (
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {row.kind === 'sale' ? (
                        <>
                          <span className="tabular-nums text-foreground">
                            {row.paidCount}/{row.installmentCount}
                          </span>
                          <span className="block text-xs text-emerald-700 tabular-nums">
                            {formatCurrency(row.paidAmountIqd, locale, 'IQD')}
                          </span>
                          {row.remainingAmountIqd > 0 ? (
                            <span className="block text-xs text-amber-700 tabular-nums">
                              {formatCurrency(row.remainingAmountIqd, locale, 'IQD')}{' '}
                              {a.remainingShort ?? 'ماوە'}
                            </span>
                          ) : row.propertyPriceIqd > 0 ? (
                            <span className="block text-xs text-emerald-700">
                              {a.paidAll ?? 'تەواو'}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 font-medium">{row.intermediaryName}</td>
                  <td className="px-3 py-2.5">{row.sellerName}</td>
                  <td className="px-3 py-2.5">{row.buyerName}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title={a.exportOneExcel ?? 'ئەکسڵ'}
                        onClick={() => exportExcel(row.id)}
                        className="p-2 rounded-lg bg-muted/80 text-muted-foreground hover:text-foreground"
                      >
                        {busy === `xlsx-${row.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        title={a.printOneA4 ?? 'چاپ A4'}
                        onClick={() => printA4(row.id)}
                        className="p-2 rounded-lg bg-muted/80 text-muted-foreground hover:text-foreground"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 ? (
        <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            {a.rowsCount ?? 'ژمارەی تۆمار'}:{' '}
            <span className="font-semibold text-foreground">{filtered.length}</span>
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
            <span>
              {L.propertyPrice}:{' '}
              <b className="tabular-nums text-slate-800">
                {formatCurrency(totals.priceIqd, locale, 'IQD')} ·{' '}
                {formatCurrency(totals.priceUsd, locale, 'USD')}
              </b>
            </span>
            {showProgress ? (
              <>
                <span>
                  {a.paidLabel ?? 'وەرگیراو'}:{' '}
                  <b className="tabular-nums text-emerald-800">
                    {formatCurrency(totals.paid, locale, 'IQD')}
                  </b>
                </span>
                <span>
                  {a.remainingShort ?? 'ماوە'}:{' '}
                  <b className="tabular-nums text-amber-800">
                    {formatCurrency(totals.remaining, locale, 'IQD')}
                  </b>
                </span>
              </>
            ) : null}
            <span>
              {L.commissionSeller}:{' '}
              <b className="tabular-nums text-sky-800">
                {formatCurrency(totals.seller, locale, 'IQD')} ·{' '}
                {formatCurrency(totals.sellerUsd, locale, 'USD')}
              </b>
            </span>
            <span>
              {L.commissionBuyer}:{' '}
              <b className="tabular-nums text-violet-800">
                {formatCurrency(totals.buyer, locale, 'IQD')} ·{' '}
                {formatCurrency(totals.buyerUsd, locale, 'USD')}
              </b>
            </span>
            <span className="font-semibold">
              {a.totalBothSides ?? L.commission}:{' '}
              <b className="tabular-nums text-emerald-700">
                {formatCurrency(totals.total, locale, 'IQD')} ·{' '}
                {formatCurrency(totals.totalUsd, locale, 'USD')}
              </b>
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
