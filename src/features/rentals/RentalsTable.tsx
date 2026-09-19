'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Banknote, MessageCircle, Pencil, Plus, Printer } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import {
  landlordRentReadyMessage,
  openWhatsApp,
  tenantRentDueMessage,
  toWhatsAppDigits,
} from '@/lib/whatsapp';
import { locales, localeLabels, type Locale } from '@/i18n/locale-config';
import { RentalContractForm, type LeaseEditData } from './RentalContractForm';
import type { Dictionary } from '@/i18n/dictionaries';

type LeaseRow = LeaseEditData & {
  depositStatus: string;
  status: string;
  daysLeft: number;
  expiringSoon: boolean;
  expired: boolean;
  rentDue: boolean;
  overdue: boolean;
  daysUntilDue: number | null;
  nextDueDate: string | null;
  nextDueAmountIqd: number | null;
  nextDueLabel: string | null;
  periodLabel: string | null;
};

type Tab = 'rent' | 'deposit';

function toEditData(row: LeaseRow): LeaseEditData {
  return {
    id: row.id,
    leaseNo: row.leaseNo,
    propertyCode: row.propertyCode,
    propertyName: row.propertyName,
    landlordName: row.landlordName,
    landlordPhone: row.landlordPhone,
    tenantName: row.tenantName,
    tenantPhone: row.tenantPhone,
    witness1Name: row.witness1Name,
    witness1Phone: row.witness1Phone,
    witness2Name: row.witness2Name,
    witness2Phone: row.witness2Phone,
    guarantorName: row.guarantorName,
    guarantorPhone: row.guarantorPhone,
    propertyType: row.propertyType,
    areaSqm: row.areaSqm,
    rentPurpose: row.rentPurpose,
    startDate: row.startDate,
    endDate: row.endDate,
    durationMonths: row.durationMonths,
    signingDate: row.signingDate,
    currency: row.currency,
    exchangeRate: row.exchangeRate,
    monthlyRentIqd: row.monthlyRentIqd,
    advancePaymentIqd: row.advancePaymentIqd,
    securityDepositIqd: row.securityDepositIqd,
    dailyPenaltyIqd: row.dailyPenaltyIqd,
    cancelFeeIqd: row.cancelFeeIqd,
    lateFeeIqd: row.lateFeeIqd,
    commissionTenantIqd: row.commissionTenantIqd,
    commissionLandlordIqd: row.commissionLandlordIqd,
    propertyStatusNote: row.propertyStatusNote,
    notes: row.notes,
    staffNote: row.staffNote,
    organizerName: row.organizerName,
    showOrganizer: row.showOrganizer,
    paymentSchedule: row.paymentSchedule,
  };
}

export function RentalsTable({ t, lang }: { t: Dictionary; lang: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'deposit' ? 'deposit' : 'rent';
  const usdToIqd = useFxStore((s) => s.usdToIqd);
  const [items, setItems] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState('');
  const [code, setCode] = useState('');
  const [deposit, setDeposit] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LeaseEditData | null>(null);
  const [remindedIds, setRemindedIds] = useState<string[]>([]);
  const [printMenuId, setPrintMenuId] = useState<string | null>(null);
  const printMenuRef = useRef<HTMLDivElement | null>(null);

  const r = t.pages.rentals as Record<string, string>;
  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  const setTab = (next: Tab) => {
    const path = next === 'deposit' ? `/${lang}/rentals?tab=deposit` : `/${lang}/rentals`;
    router.replace(path);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (tenant) qs.set('tenant', tenant);
    if (code) qs.set('code', code);
    if (tab === 'deposit' && deposit) qs.set('deposit', deposit);
    const res = await fetch(`/api/rentals?${qs.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else {
      setError(t.pages.projects.error);
    }
    setLoading(false);
  }, [tenant, code, deposit, tab, t.pages.projects.error]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!printMenuId) return;
    const onDoc = (e: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setPrintMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [printMenuId]);

  const dueItems = useMemo(() => items.filter((row) => row.rentDue), [items]);

  const depositRows = useMemo(
    () => items.filter((row) => (row.securityDepositIqd ?? 0) > 0),
    [items],
  );

  const heldDeposits = useMemo(
    () => depositRows.filter((row) => row.depositStatus === 'HELD'),
    [depositRows],
  );

  const tableItems = tab === 'deposit' ? depositRows : items;

  const moneyOf = (row: LeaseRow, iqd: number) => {
    const cur = row.currency === 'USD' ? 'USD' : 'IQD';
    const rate = Math.max(1, row.exchangeRate || usdToIqd);
    const amount = cur === 'USD' ? iqd / rate : iqd;
    return formatCurrency(amount, lang, cur);
  };

  const amountLabelFor = (row: LeaseRow) =>
    moneyOf(row, row.nextDueAmountIqd ?? row.monthlyRentIqd);

  const remindTenant = (row: LeaseRow) => {
    const ok = openWhatsApp(
      row.tenantPhone,
      tenantRentDueMessage({
        tenantName: row.tenantName,
        amountLabel: amountLabelFor(row),
        propertyCode: row.propertyCode,
        period: row.periodLabel || row.nextDueDate,
      }),
    );
    if (!ok) {
      setError(r.whatsappNoPhone ?? 'ژمارەی واتساپ نەدۆزرایەوە');
      return;
    }
    setRemindedIds((ids) => (ids.includes(row.id) ? ids : [...ids, row.id]));
  };

  const notifyLandlord = (row: LeaseRow) => {
    const ok = openWhatsApp(
      row.landlordPhone,
      landlordRentReadyMessage({
        landlordName: row.landlordName,
        amountLabel: amountLabelFor(row),
        propertyCode: row.propertyCode,
        period: row.periodLabel || row.nextDueDate,
      }),
    );
    if (!ok) setError(r.whatsappNoPhone ?? 'ژمارەی واتساپ نەدۆزرایەوە');
  };

  useEffect(() => {
    if (tab !== 'rent' || loading || dueItems.length === 0) return;
    const key = 'rh-rent-wa-reminded';
    let already: string[] = [];
    try {
      already = JSON.parse(sessionStorage.getItem(key) || '[]') as string[];
    } catch {
      already = [];
    }
    const next = dueItems.find(
      (row) =>
        row.tenantPhone &&
        toWhatsAppDigits(row.tenantPhone) &&
        !already.includes(row.id) &&
        !remindedIds.includes(row.id),
    );
    if (!next) return;
    const timer = window.setTimeout(() => {
      remindTenant(next);
      const updated = [...already, next.id];
      sessionStorage.setItem(key, JSON.stringify(updated));
      setRemindedIds((ids) => (ids.includes(next.id) ? ids : [...ids, next.id]));
    }, 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one auto reminder pass after load
  }, [loading, dueItems, tab]);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (row: LeaseRow) => {
    setEditing(toEditData(row));
    setShowForm(true);
  };

  const printLease = (id: string, pdfLocale: Locale) => {
    setPrintMenuId(null);
    window.open(
      `/api/pdf/rental/${id}?locale=${pdfLocale}&print=1`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const payRentReceipt = (row: LeaseRow) => {
    const qs = new URLSearchParams({ rentLease: row.id });
    if (row.periodLabel) qs.set('period', row.periodLabel);
    router.push(`/${lang}/receipts?stream=rental&${qs.toString()}`);
  };

  const payDepositReceipt = (row: LeaseRow) => {
    router.push(`/${lang}/receipts?stream=deposit&depositLease=${row.id}`);
  };

  const depositLabel = (s: string) => {
    const map: Record<string, string> = {
      HELD: r.moneyAtRoadHome ?? 'پارە لای ڕۆد هۆم',
      PARTIAL_RETURNED: r.moneyAtLandlord ?? 'پارە لای خاوەن خانوو',
      RETURNED: r.moneyAtTenant ?? 'پارە گەڕاوەتەوە بۆ کرێچی',
      FORFEITED: r.moneyAtRoadHome ?? 'پارە لای ڕۆد هۆم',
    };
    return map[s] ?? s;
  };

  const payDepositDisposition = (
    row: LeaseRow,
    to: 'roadhome' | 'landlord' | 'tenant',
  ) => {
    const qs = new URLSearchParams({
      stream: 'deposit',
      depositLease: row.id,
      depositTo: to,
    });
    router.push(`/${lang}/receipts?${qs.toString()}`);
  };

  const dayLabel = (row: LeaseRow) => {
    if (row.expired) return r.expired;
    if (row.daysLeft === 0) return r.expiresToday ?? 'ئەمڕۆ کۆتایی دێت';
    if (row.expiringSoon) {
      return `${r.expiringSoon} (${row.daysLeft}d)`;
    }
    return r.active;
  };

  const title = tab === 'deposit' ? (r.depositTitle ?? 'بەڕێوەبردنی تأمینات') : (r.title ?? 'گرێبەستی کرێ');
  const subtitle =
    tab === 'deposit'
      ? (r.depositSubtitle ?? 'پارەی تأمینات، دۆخ، و گەڕاندنەوە')
      : (r.rentSubtitle ?? r.subtitle ?? 'گرێبەستی کرێ');

  const rentColSpan = 9;
  const depositColSpan = 8;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {tab === 'rent' ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {r.add}
          </button>
        ) : null}
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('rent')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'rent'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {r.tabRent ?? 'گرێبەستی کرێ'}
        </button>
        <button
          type="button"
          onClick={() => setTab('deposit')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'deposit'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {r.tabDeposit ?? 'تأمینات'}
        </button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {tab === 'rent' && dueItems.length > 0 ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-semibold">
              {r.rentDueTitle ?? 'کرێی شایستە — کاتی وەرگرتنی کرێ هاتووە'}
            </h2>
          </div>
          <ul className="space-y-2">
            {dueItems.map((row) => (
              <li
                key={row.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 rounded-xl bg-card/80 border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {row.propertyCode}
                    <span className="text-muted-foreground font-normal"> · {row.tenantName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {row.nextDueLabel ?? '—'} · {row.nextDueDate} · {amountLabelFor(row)}
                    {row.tenantPhone ? ` · ${row.tenantPhone}` : ''}
                    {row.overdue ? ` · ${r.rentOverdue ?? 'دواکەوتوو'}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => remindTenant(row)}
                    disabled={!toWhatsAppDigits(row.tenantPhone)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/15 px-3 py-2 text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/25 disabled:opacity-40"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {r.whatsappTenant ?? 'واتساپ بۆ کرێچی'}
                  </button>
                  <button
                    type="button"
                    onClick={() => payRentReceipt(row)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    {r.payRentReceipt ?? 'وەسڵی پارەدانی کرێ'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'deposit' && heldDeposits.length > 0 ? (
        <section className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sky-900">
            <Banknote className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-semibold">
              {r.depositHeldTitle ?? 'تأمینات — پارە لای ڕۆد هۆم'} ({heldDeposits.length})
            </h2>
          </div>
          <p className="text-xs text-sky-900/80">
            {r.depositHeldHint ??
              'شوێنی پارە دەستنیشان بکە: ڕۆد هۆم، خاوەن خانوو، یان گەڕاندنەوە بۆ کرێچی — هەر یەک وەسڵی خۆی هەیە.'}
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          className={cn(field, 'min-w-[10rem]')}
          placeholder={r.tenant}
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
        />
        <input
          className={cn(field, 'min-w-[8rem]')}
          placeholder={t.pages.projects.code}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {tab === 'deposit' ? (
          <select className={field} value={deposit} onChange={(e) => setDeposit(e.target.value)}>
            <option value="">{r.moneyLocationAll ?? 'هەموو شوێنەکانی پارە'}</option>
            <option value="HELD">{r.moneyAtRoadHome ?? 'پارە لای ڕۆد هۆم'}</option>
            <option value="FORFEITED">{r.moneyAtRoadHome ?? 'پارە لای ڕۆد هۆم'}</option>
            <option value="PARTIAL_RETURNED">{r.moneyAtLandlord ?? 'پارە لای خاوەن خانوو'}</option>
            <option value="RETURNED">{r.moneyAtTenant ?? 'پارە گەڕاوەتەوە بۆ کرێچی'}</option>
          </select>
        ) : null}
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'rent' ? (
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium text-start">{r.leaseNo}</th>
                  <th className="px-4 py-3 font-medium text-start">{r.tenant}</th>
                  <th className="px-4 py-3 font-medium text-start">
                    {r.tenantPhoneCol ?? 'ژمارەی کرێچی'}
                  </th>
                  <th className="px-4 py-3 font-medium text-start">
                    {r.landlordPhoneCol ?? 'ژمارەی خاوەن موڵک'}
                  </th>
                  <th className="px-4 py-3 font-medium text-start">{t.pages.projects.code}</th>
                  <th className="px-4 py-3 font-medium text-start">{r.monthlyRent}</th>
                  <th className="px-4 py-3 font-medium text-start">{r.nextRentDue ?? 'کرێی داهاتوو'}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.table.status}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={rentColSpan} className="px-4 py-10 text-center text-muted-foreground">
                      {t.common.loading}
                    </td>
                  </tr>
                ) : tableItems.length === 0 ? (
                  <tr>
                    <td colSpan={rentColSpan} className="px-4 py-10 text-center text-muted-foreground">
                      {r.empty}
                    </td>
                  </tr>
                ) : (
                  tableItems.map((row) => {
                    const cur = row.currency === 'USD' ? 'USD' : 'IQD';
                    const rate = Math.max(1, row.exchangeRate || usdToIqd);
                    const rentDisplay =
                      cur === 'USD' ? row.monthlyRentIqd / rate : row.monthlyRentIqd;
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-border hover:bg-muted/40',
                          row.rentDue && 'bg-amber-500/[0.06]',
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary">{row.leaseNo}</td>
                        <td className="px-4 py-3">
                          <p className="text-foreground font-medium">{row.tenantName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.landlordName ? `${r.landlord ?? 'خاوەن'}: ${row.landlordName}` : '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-xs">
                          <p className="font-medium text-foreground">{row.tenantPhone || '—'}</p>
                          {row.rentDue && toWhatsAppDigits(row.tenantPhone) ? (
                            <button
                              type="button"
                              onClick={() => remindTenant(row)}
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#128C7E] hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {r.whatsappTenant ?? 'واتساپ'}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-xs">
                          <p className="font-medium text-foreground">{row.landlordPhone || '—'}</p>
                          {toWhatsAppDigits(row.landlordPhone) ? (
                            <button
                              type="button"
                              onClick={() => notifyLandlord(row)}
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#128C7E] hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {r.whatsappLandlord ?? 'ئاگاداری خاوەن'}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground/80">
                          {row.propertyCode}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <div>{formatCurrency(rentDisplay, lang, cur)}</div>
                          {cur === 'USD' ? (
                            <div className="text-[11px] text-muted-foreground">
                              {formatCurrency(row.monthlyRentIqd, lang, 'IQD')}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {row.nextDueDate ? (
                            <button
                              type="button"
                              onClick={() => payRentReceipt(row)}
                              className={cn(
                                'text-start rounded-lg px-2 py-1 -mx-2 transition-colors',
                                row.rentDue
                                  ? 'bg-amber-500/15 text-amber-800 hover:bg-amber-500/25'
                                  : 'hover:bg-muted text-muted-foreground',
                              )}
                              title={r.payRentReceipt ?? 'وەسڵی پارەدانی کرێ'}
                            >
                              <p className="tabular-nums text-xs font-medium">
                                {row.nextDueDate}
                                {row.rentDue ? ` · ${r.rentDueNow ?? 'شایستە'}` : ''}
                              </p>
                              <p className="text-[11px] tabular-nums">{amountLabelFor(row)}</p>
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.rentDue ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {row.overdue
                                ? (r.rentOverdue ?? 'کرێ دواکەوتووە')
                                : (r.rentDueNow ?? 'کاتی کرێ هاتووە')}
                            </span>
                          ) : row.expired ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {dayLabel(row)}
                            </span>
                          ) : row.expiringSoon ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {dayLabel(row)}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                              {dayLabel(row)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                              title={t.common.edit}
                              aria-label={t.common.edit}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <div
                              className="relative"
                              ref={printMenuId === row.id ? printMenuRef : undefined}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setPrintMenuId((cur) => (cur === row.id ? null : row.id))
                                }
                                className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                title={r.printPdfLang ?? t.common.print}
                                aria-label={r.printPdfLang ?? t.common.print}
                                aria-expanded={printMenuId === row.id}
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              {printMenuId === row.id ? (
                                <div className="absolute end-0 z-20 mt-1 min-w-[9.5rem] rounded-xl border border-border bg-card p-1 shadow-lg">
                                  <p className="px-2 py-1 text-[10px] text-muted-foreground">
                                    {r.printPdfLang ?? 'زمانی PDF'}
                                  </p>
                                  {locales.map((loc) => (
                                    <button
                                      key={loc}
                                      type="button"
                                      onClick={() => printLease(row.id, loc)}
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
                            {row.rentDue ? (
                              <button
                                type="button"
                                onClick={() => remindTenant(row)}
                                disabled={!toWhatsAppDigits(row.tenantPhone)}
                                className="p-2 rounded-lg text-[#128C7E] hover:bg-[#25D366]/15 disabled:opacity-40"
                                title={r.whatsappTenant ?? 'واتساپ بۆ کرێچی'}
                                aria-label={r.whatsappTenant ?? 'واتساپ بۆ کرێچی'}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => payRentReceipt(row)}
                              className={cn(
                                'p-2 rounded-lg',
                                row.rentDue
                                  ? 'text-amber-800 bg-amber-500/15 hover:bg-amber-500/25'
                                  : 'text-primary hover:bg-primary/10',
                              )}
                              title={r.payRentReceipt ?? 'وەسڵی پارەدانی کرێ'}
                              aria-label={r.payRentReceipt ?? 'وەسڵی پارەدانی کرێ'}
                            >
                              <Banknote className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium text-start">{r.leaseNo}</th>
                  <th className="px-4 py-3 font-medium text-start">{r.tenant}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.pages.projects.code}</th>
                  <th className="px-4 py-3 font-medium text-start">{r.deposit}</th>
                  <th className="px-4 py-3 font-medium text-start">
                    {r.moneyLocationCol ?? 'پارە لای کێیە'}
                  </th>
                  <th className="px-4 py-3 font-medium text-start">{r.landlord}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.table.status}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={depositColSpan}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {t.common.loading}
                    </td>
                  </tr>
                ) : tableItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={depositColSpan}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {r.depositEmpty ?? 'هیچ تأمیناتێک تۆمار نەکراوە'}
                    </td>
                  </tr>
                ) : (
                  tableItems.map((row) => {
                    return (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{row.leaseNo}</td>
                        <td className="px-4 py-3">
                          <p className="text-foreground font-medium">{row.tenantName}</p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {row.tenantPhone || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{row.propertyCode}</td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {moneyOf(row, row.securityDepositIqd)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
                              row.depositStatus === 'HELD' && 'bg-sky-500/10 text-sky-800',
                              row.depositStatus === 'PARTIAL_RETURNED' &&
                                'bg-amber-500/10 text-amber-800',
                              row.depositStatus === 'RETURNED' && 'bg-teal-500/10 text-teal-800',
                              row.depositStatus === 'FORFEITED' && 'bg-rose-500/10 text-rose-800',
                            )}
                          >
                            {depositLabel(row.depositStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{row.landlordName || '—'}</p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {row.landlordPhone || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-muted-foreground">{dayLabel(row)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => payDepositReceipt(row)}
                              disabled={(row.securityDepositIqd ?? 0) <= 0}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-40"
                              title={r.payDepositReceipt ?? 'وەسڵی وەرگرتنی تأمینات'}
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              {r.payDepositReceive ?? 'وەرگرتن'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                              title={t.common.edit}
                              aria-label={t.common.edit}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={(row.securityDepositIqd ?? 0) <= 0}
                              onClick={() => payDepositDisposition(row, 'roadhome')}
                              className={cn(
                                'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40',
                                row.depositStatus === 'HELD' || row.depositStatus === 'FORFEITED'
                                  ? 'bg-rose-500/25 text-rose-900 ring-1 ring-rose-500/40'
                                  : 'bg-rose-500/15 text-rose-800 hover:bg-rose-500/25',
                              )}
                            >
                              {r.depositToRoadHome ?? 'ڕۆد هۆم'}
                            </button>
                            <button
                              type="button"
                              disabled={(row.securityDepositIqd ?? 0) <= 0}
                              onClick={() => payDepositDisposition(row, 'landlord')}
                              className={cn(
                                'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40',
                                row.depositStatus === 'PARTIAL_RETURNED'
                                  ? 'bg-amber-500/25 text-amber-900 ring-1 ring-amber-500/40'
                                  : 'bg-amber-500/15 text-amber-800 hover:bg-amber-500/25',
                              )}
                            >
                              {r.depositToLandlord ?? 'خاوەن خانوو'}
                            </button>
                            <button
                              type="button"
                              disabled={(row.securityDepositIqd ?? 0) <= 0}
                              onClick={() => payDepositDisposition(row, 'tenant')}
                              className={cn(
                                'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40',
                                row.depositStatus === 'RETURNED'
                                  ? 'bg-teal-500/25 text-teal-900 ring-1 ring-teal-500/40'
                                  : 'bg-teal-500/15 text-teal-800 hover:bg-teal-500/25',
                              )}
                            >
                              {r.depositToTenantShort ?? 'گەڕاندنەوە بۆ کرێچی'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <RentalContractForm
        t={t}
        lang={lang}
        open={showForm}
        lease={editing}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSaved={() => void load()}
      />
    </div>
  );
}
