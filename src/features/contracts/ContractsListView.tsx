'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  Printer,
  Pencil,
  Search,
  Ban,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { locales, localeLabels, type Locale } from '@/i18n/locale-config';
import type { Dictionary } from '@/i18n/dictionaries';
import { tContractStatus } from '@/i18n/translate';

type ContractItem = {
  id: string;
  contractNo: string;
  title: string;
  propertyType: string;
  buyerName: string | null;
  sellerName: string | null;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  currency: 'IQD' | 'USD';
  totalAmount: number;
  totalAmountUsd: number;
  status: string;
  isExternal?: boolean;
  createdAt: string;
  house: { code: string; name: string } | null;
  installmentCount: number;
  paidCount: number;
  pendingCount: number;
  pendingAmount: number;
  paidAmount: number;
};

type ScopeFilter = 'all' | 'internal' | 'external';
type StatusFilter = '' | 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

function parseScope(value: string | null | undefined): ScopeFilter {
  if (value === 'internal' || value === 'external') return value;
  return 'all';
}

function statusTone(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500/15 text-emerald-800 border-emerald-600/30';
    case 'COMPLETED':
      return 'bg-sky-500/15 text-sky-900 border-sky-600/30';
    case 'CANCELLED':
      return 'bg-rose-500/15 text-rose-900 border-rose-600/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function ContractsListView({
  t,
  lang,
  initialScope,
}: {
  t: Dictionary;
  lang: string;
  initialScope?: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<ScopeFilter>(() => parseScope(initialScope));
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [printMenuId, setPrintMenuId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const printMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const g = t.pages.contractGen as Record<string, string>;
  const c = t.pages.contracts as Record<string, string>;

  useEffect(() => {
    setScope(parseScope(initialScope));
  }, [initialScope]);

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(tmr);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (scope !== 'all') params.set('scope', scope);
    if (debounced) params.set('q', debounced);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    try {
      const res = await fetch(`/api/contracts${qs ? `?${qs}` : ''}`);
      const data = res.ok ? await res.json() : { items: [] };
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope, debounced, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!printMenuId && !actionMenuId) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (printMenuRef.current && !printMenuRef.current.contains(target)) {
        setPrintMenuId(null);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [printMenuId, actionMenuId]);

  const printContract = (id: string, pdfLocale: Locale) => {
    setPrintMenuId(null);
    window.open(
      `/api/pdf/contract/${id}?locale=${pdfLocale}&print=1`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const selectScope = (next: ScopeFilter) => {
    setScope(next);
    const url = next === 'all' ? `/${lang}/contracts` : `/${lang}/contracts?scope=${next}`;
    router.replace(url, { scroll: false });
  };

  async function cancelContract(row: ContractItem) {
    if (row.status === 'CANCELLED') return;
    const ok = window.confirm(c.confirmCancel ?? 'هەڵوەشاندنەوەی ئەم گرێبەستە؟');
    if (!ok) return;
    setBusyId(row.id);
    setActionMenuId(null);
    const res = await fetch(`/api/contracts/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    setBusyId(null);
    if (res.ok) void load();
  }

  async function deleteContract(row: ContractItem) {
    const ok = window.confirm(c.confirmDelete ?? 'سڕینەوەی ئەم گرێبەستە بۆ هەمیشە؟');
    if (!ok) return;
    setBusyId(row.id);
    setActionMenuId(null);
    const res = await fetch(`/api/contracts/${row.id}`, { method: 'DELETE' });
    setBusyId(null);
    if (res.ok) void load();
  }

  const counts = useMemo(() => ({ current: items.length }), [items.length]);

  const tabs: { key: ScopeFilter; label: string }[] = [
    { key: 'all', label: c.scopeAll ?? 'هەموو' },
    { key: 'internal', label: c.scopeInternal ?? g.scopeInternal ?? 'ناوخۆیی' },
    { key: 'external', label: c.scopeExternal ?? g.scopeExternal ?? 'دەرەکی' },
  ];

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  const colSpan = 10;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t.pages.contracts.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {c.scopeSubtitle ?? 'جیاکردنەوەی گرێبەستی ناوخۆیی و دەرەکی'}
          </p>
        </div>
        <Link
          href={`/${lang}/contracts/new`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t.pages.contracts.add}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => selectScope(tab.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm border transition-colors',
              scope === tab.key
                ? tab.key === 'external'
                  ? 'border-amber-600/50 bg-amber-500/15 text-amber-900 font-semibold'
                  : 'border-primary/50 bg-primary/10 text-foreground font-semibold'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            {tab.label}
            {scope === tab.key && !loading ? (
              <span className="ms-2 tabular-nums text-xs opacity-70">({counts.current})</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c.searchPlaceholder ?? 'گەڕان بە ژمارە، کڕیار، فرۆشیار، خانوو…'}
            className={cn(field, 'w-full ps-9')}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className={cn(field, 'min-w-[140px]')}
          aria-label={c.status ?? 'دۆخ'}
        >
          <option value="">{c.statusAll ?? t.common.all}</option>
          <option value="DRAFT">{tContractStatus(t, 'DRAFT')}</option>
          <option value="ACTIVE">{tContractStatus(t, 'ACTIVE')}</option>
          <option value="COMPLETED">{tContractStatus(t, 'COMPLETED')}</option>
          <option value="CANCELLED">{tContractStatus(t, 'CANCELLED')}</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={field}
          aria-label={c.fromDate ?? 'لە بەروار'}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={field}
          aria-label={c.toDate ?? 'بۆ بەروار'}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm text-start">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.voucherId}</th>
                <th className="px-4 py-3 font-medium text-start">{t.table.name}</th>
                <th className="px-4 py-3 font-medium text-start">{c.status ?? 'دۆخ'}</th>
                <th className="px-4 py-3 font-medium text-start">{t.pages.contractGen.buyer}</th>
                <th className="px-4 py-3 font-medium text-start">{g.seller ?? 'فرۆشیار'}</th>
                <th className="px-4 py-3 font-medium text-start">{t.pages.projects.code}</th>
                <th className="px-4 py-3 font-medium text-start">{c.installments ?? 'قیست'}</th>
                <th className="px-4 py-3 font-medium text-start">{t.table.amount}</th>
                <th className="px-4 py-3 font-medium text-start">{t.table.date}</th>
                <th className="px-4 py-3 font-medium text-start">
                  {(t.common as { actions?: string }).actions ?? t.pages.contractGen.print}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
                    {t.common.loading}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
                    {scope === 'internal'
                      ? (c.emptyInternal ?? 'هیچ گرێبەستێکی ناوخۆیی نییە')
                      : scope === 'external'
                        ? (c.emptyExternal ?? 'هیچ گرێبەستێکی دەرەکی نییە')
                        : t.pages.contracts.empty}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const customerId = row.customerId ?? row.customer?.id ?? null;
                  const buyerLabel =
                    row.customer?.name ?? row.buyerName ?? '—';
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border hover:bg-muted/40',
                        row.isExternal && 'bg-amber-500/[0.06]',
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        {row.contractNo}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>
                            {row.title}
                            {row.isExternal ? (
                              <span className="ms-2 inline-flex align-middle rounded border border-amber-600/50 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                {c.scopeExternal ?? 'دەرەکی'}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border',
                            statusTone(row.status),
                          )}
                        >
                          {tContractStatus(t, row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {customerId ? (
                          <Link
                            href={`/${lang}/customers/${customerId}`}
                            className="text-primary hover:underline"
                          >
                            {buyerLabel}
                          </Link>
                        ) : (
                          buyerLabel
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">{row.sellerName ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {row.house?.code ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="tabular-nums">
                          {row.paidCount}/{row.installmentCount}
                        </span>
                        {row.pendingCount > 0 ? (
                          <span className="block text-xs text-amber-700">
                            {formatCurrency(row.pendingAmount, lang, 'IQD')}{' '}
                            {c.pendingShort ?? 'ماوە'}
                          </span>
                        ) : row.installmentCount > 0 ? (
                          <span className="block text-xs text-emerald-700">
                            {c.paidAll ?? 'تەواو'}
                          </span>
                        ) : (
                          <span className="block text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <div>{formatCurrency(row.totalAmount, lang, 'IQD')}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatCurrency(row.totalAmountUsd || 0, lang, 'USD')}
                          {row.currency ? ` · ${row.currency}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(row.createdAt, lang)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <Link
                            href={`/${lang}/contracts/${row.id}/edit`}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            title={t.common.edit}
                            aria-label={t.common.edit}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <div
                            className="relative inline-block"
                            ref={printMenuId === row.id ? printMenuRef : undefined}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuId(null);
                                setPrintMenuId((cur) => (cur === row.id ? null : row.id));
                              }}
                              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                              title={g.printPdfLang ?? t.common.print}
                              aria-label={g.printPdfLang ?? t.common.print}
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {printMenuId === row.id ? (
                              <div className="absolute end-0 z-20 mt-1 min-w-[9.5rem] rounded-xl border border-border bg-card p-1 shadow-lg">
                                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                                  {g.printPdfLang ?? 'زمانی PDF'}
                                </p>
                                {locales.map((loc) => (
                                  <button
                                    key={loc}
                                    type="button"
                                    onClick={() => printContract(row.id, loc)}
                                    className={cn(
                                      'w-full text-start rounded-lg px-2 py-1.5 text-xs hover:bg-muted',
                                      loc === lang && 'font-semibold text-primary',
                                    )}
                                  >
                                    {localeLabels[loc]}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div
                            className="relative inline-block"
                            ref={actionMenuId === row.id ? actionMenuRef : undefined}
                          >
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => {
                                setPrintMenuId(null);
                                setActionMenuId((cur) => (cur === row.id ? null : row.id));
                              }}
                              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                              title={c.moreActions ?? 'زیاتر'}
                              aria-label={c.moreActions ?? 'زیاتر'}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {actionMenuId === row.id ? (
                              <div className="absolute end-0 z-20 mt-1 min-w-[10.5rem] rounded-xl border border-border bg-card p-1 shadow-lg">
                                {row.status !== 'CANCELLED' ? (
                                  <button
                                    type="button"
                                    onClick={() => void cancelContract(row)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-amber-900 hover:bg-amber-500/10"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    {c.cancelAction ?? t.common.cancel}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => void deleteContract(row)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-700 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t.common.delete}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
