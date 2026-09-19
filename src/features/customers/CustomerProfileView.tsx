'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isRTL } from '@/i18n/locale-config';
import type { Dictionary } from '@/i18n/dictionaries';

type Profile = {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    nationalId: string | null;
    notes: string | null;
    createdAt: string;
  };
  balanceIqd: number;
  contracts: Array<{
    id: string;
    contractNo: string;
    title: string;
    status: string;
    kind: string;
    totalAmount: number;
    houseCode: string | null;
    houseName: string | null;
    installmentCount: number;
    paidCount: number;
    pendingCount: number;
    pendingAmount: number;
    createdAt: string;
  }>;
  recentLedger: Array<{
    id: string;
    txnNo: string;
    date: string;
    type: string;
    description: string | null;
    amountBaseIqd: number;
    balanceIqd: number;
  }>;
};

export function CustomerProfileView({
  t,
  lang,
  id,
}: {
  t: Dictionary;
  lang: string;
  id: string;
}) {
  const c = t.pages.customers as Record<string, string>;
  const rtl = isRTL(lang);
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/customers/${id}`);
    if (!res.ok) {
      setError(c.loadError ?? 'نەتوانرا باربکرێت');
      setData(null);
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [id, c.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="p-10 text-center text-muted-foreground">{t.common.loading}</p>;
  }
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-6">
        <Link href={`/${lang}/customers`} className="inline-flex items-center gap-1.5 text-sm text-primary">
          <BackIcon className="h-4 w-4" />
          {c.backToList ?? 'گەڕانەوە بۆ کڕیارەکان'}
        </Link>
        <p className="text-rose-600">{error || '—'}</p>
      </div>
    );
  }

  const { customer, balanceIqd, contracts, recentLedger } = data;

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div>
        <Link
          href={`/${lang}/customers`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <BackIcon className="h-3.5 w-3.5" />
          {c.backToList ?? 'گەڕانەوە بۆ کڕیارەکان'}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{customer.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 space-x-2 rtl:space-x-reverse">
              <span>{customer.phone ?? '—'}</span>
              <span>·</span>
              <span>
                {c.nationalId ?? 'ناسنامە'}: {customer.nationalId ?? '—'}
              </span>
            </p>
            {customer.address ? (
              <p className="text-sm text-muted-foreground mt-1">{customer.address}</p>
            ) : null}
            {customer.notes ? (
              <p className="text-sm mt-2 text-foreground/80">{customer.notes}</p>
            ) : null}
          </div>
          <a
            href={`/api/pdf/statement/customer?id=${customer.id}&locale=${lang}&print=1`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            {c.printStatement ?? 'چاپکردنی کەشف حساب'}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{c.balance ?? 'قەرزی ماوە'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-rose-700">
            {formatCurrency(balanceIqd, lang, 'IQD')}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{c.contractsCount ?? 'ژمارەی گرێبەست'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{contracts.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{c.pendingInstallments ?? 'قیستی ماوە'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatCurrency(
              contracts.reduce((s, x) => s + x.pendingAmount, 0),
              lang,
              'IQD',
            )}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium">
          {c.contractsTitle ?? 'گرێبەستەکان'}
        </div>
        {contracts.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            {c.noContracts ?? 'هیچ گرێبەستێک نییە'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-2 font-medium">{c.contractNo ?? 'ژمارە'}</th>
                  <th className="text-start px-4 py-2 font-medium">{c.house ?? 'خانوو'}</th>
                  <th className="text-start px-4 py-2 font-medium">{c.total ?? 'کۆ'}</th>
                  <th className="text-start px-4 py-2 font-medium">{c.installments ?? 'قیست'}</th>
                  <th className="text-start px-4 py-2 font-medium">{c.status ?? 'دۆخ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contracts.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${lang}/contracts/${row.id}/edit`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {row.contractNo}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{row.title}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.houseCode ? `${row.houseCode} · ${row.houseName ?? ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {formatCurrency(row.totalAmount, lang, 'IQD')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.paidCount}/{row.installmentCount}
                      {row.pendingAmount > 0 ? (
                        <span className="block text-xs text-amber-700">
                          {formatCurrency(row.pendingAmount, lang, 'IQD')} {c.remaining ?? 'ماوە'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium">
          {c.recentLedger ?? 'دوایین مامەڵەکانی حیسابات'}
        </div>
        {recentLedger.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            {c.noLedger ?? 'هیچ مامەڵەیەک نییە'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-2 font-medium">{c.date ?? 'ڕێکەوت'}</th>
                  <th className="text-start px-4 py-2 font-medium">{c.txn ?? 'مامەڵە'}</th>
                  <th className="text-start px-4 py-2 font-medium">{c.amount ?? 'بڕ'}</th>
                  <th className="text-start px-4 py-2 font-medium">{c.balance ?? 'باڵانس'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLedger.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 tabular-nums">{formatDate(row.date, lang)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs">{row.txnNo}</span>
                      <span className="text-muted-foreground text-xs block">
                        {row.description || row.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatCurrency(row.amountBaseIqd, lang, 'IQD')}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-medium">
                      {formatCurrency(row.balanceIqd, lang, 'IQD')}
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
