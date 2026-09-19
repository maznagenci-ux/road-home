'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { SimpleOwnerReport } from '@/lib/accounting/simple-report';

const MONTHS = [
  'کانوونی دووەم',
  'شوبات',
  'ئازار',
  'نیسان',
  'ئایار',
  'حوزەیران',
  'تەممووز',
  'ئاب',
  'ئەیلوول',
  'تشرینی یەکەم',
  'تشرینی دووەم',
  'کانوونی یەکەم',
];

function dinar(n: number) {
  return `${new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(Math.round(n))} د.ع`;
}

export function SimpleReportView({ t: _t }: { t: Dictionary; lang: string }) {
  void _t;
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<SimpleOwnerReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'xlsx' | 'doc' | 'pdf' | null>(null);

  const qs = useMemo(() => `month=${month}&year=${year}`, [month, year]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/accounting/simple-report?${qs}&format=json`, {
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'Unauthorized' ? 'تکایە بچۆ ژوورەوە' : data.error || 'هەڵە');
        setReport(null);
        return;
      }
      setReport(data.report);
    } catch {
      setError('نەتوانرا ڕاپۆرت بێت');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(format: 'xlsx' | 'doc' | 'pdf') {
    setBusy(format);
    setError('');
    try {
      const res = await fetch(`/api/accounting/simple-report?${qs}&format=${format}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setError('داگرتن سەرکەوتوو نەبوو — دووبارە هەوڵ بدە');
        return;
      }
      if (format === 'pdf') {
        const html = await res.text();
        const win = window.open('', '_blank');
        if (!win) {
          setError('ڕێگە بە پەڕەی نوێ بدە بۆ PDF');
          return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hesabat-${year}-${String(month).padStart(2, '0')}.${format === 'xlsx' ? 'xlsx' : 'doc'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('داگرتن سەرکەوتوو نەبوو');
    } finally {
      setBusy(null);
    }
  }

  const field =
    'rounded-xl border border-border bg-white px-3 py-2.5 text-base outline-none focus:border-teal-600';

  return (
    <div className="max-w-3xl mx-auto space-y-8" dir="rtl">
      <header className="text-center space-y-2 pt-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">حیساباتی خاوەن</h1>
        <p className="text-muted-foreground text-lg">هەموو ژمارەکان بە دینارن</p>
      </header>

      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">کام مانگ؟</p>
        <div className="flex flex-wrap gap-3">
          <select
            className={`${field} min-w-[180px]`}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            className={`${field} w-28`}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => now.getFullYear() - 3 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void download('xlsx')}
            className="rounded-2xl bg-emerald-700 text-white py-4 text-lg font-semibold disabled:opacity-50"
          >
            {busy === 'xlsx' ? '…' : 'ئەکسڵ'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void download('doc')}
            className="rounded-2xl bg-sky-800 text-white py-4 text-lg font-semibold disabled:opacity-50"
          >
            {busy === 'doc' ? '…' : 'وۆرد'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void download('pdf')}
            className="rounded-2xl bg-stone-800 text-white py-4 text-lg font-semibold disabled:opacity-50"
          >
            {busy === 'pdf' ? '…' : 'PDF'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-center text-destructive text-base">{error}</p>
      ) : null}

      {loading && !report ? (
        <p className="text-center text-muted-foreground">چاوەڕوان بە…</p>
      ) : null}

      {report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-3xl bg-teal-50 border border-teal-100 p-6 text-center">
              <p className="text-base text-teal-900/70">داهات</p>
              <p className="text-3xl sm:text-4xl font-bold text-teal-950 mt-2 tabular-nums">
                {dinar(report.incomeIqd)}
              </p>
            </div>
            <div className="rounded-3xl bg-rose-50 border border-rose-100 p-6 text-center">
              <p className="text-base text-rose-900/70">خەرجی</p>
              <p className="text-3xl sm:text-4xl font-bold text-rose-950 mt-2 tabular-nums">
                {dinar(report.expenseIqd)}
              </p>
            </div>
            <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <p className="text-base text-emerald-900/70">قازانج</p>
              <p className="text-3xl sm:text-4xl font-bold text-emerald-950 mt-2 tabular-nums">
                {dinar(report.profitIqd)}
              </p>
            </div>
          </div>

          <section className="rounded-3xl border border-border bg-card overflow-hidden">
            <h2 className="px-5 py-4 text-lg font-semibold border-b border-border">
              داهات لە کوێ هات؟
            </h2>
            {report.incomeByCategory.length === 0 ? (
              <p className="p-5 text-muted-foreground">لەم مانگەدا داهات نییە</p>
            ) : (
              <ul className="divide-y divide-border">
                {report.incomeByCategory.map((r) => (
                  <li
                    key={r.category}
                    className="flex items-center justify-between gap-4 px-5 py-4 text-base"
                  >
                    <span>{r.category}</span>
                    <span className="font-semibold tabular-nums">{dinar(r.amountIqd)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card overflow-hidden">
            <h2 className="px-5 py-4 text-lg font-semibold border-b border-border">
              خەرجی بۆ چی؟
            </h2>
            {report.expenseByCategory.length === 0 ? (
              <p className="p-5 text-muted-foreground">لەم مانگەدا خەرجی نییە</p>
            ) : (
              <ul className="divide-y divide-border">
                {report.expenseByCategory.map((r) => (
                  <li
                    key={r.category}
                    className="flex items-center justify-between gap-4 px-5 py-4 text-base"
                  >
                    <span>{r.category}</span>
                    <span className="font-semibold tabular-nums">{dinar(r.amountIqd)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card overflow-hidden">
            <h2 className="px-5 py-4 text-lg font-semibold border-b border-border">
              مووچەی کارمەندان
            </h2>
            {report.salaryRows.length === 0 ? (
              <p className="p-5 text-muted-foreground">لەم مانگەدا مووچە تۆمار نەکراوە</p>
            ) : (
              <ul className="divide-y divide-border">
                {report.salaryRows.map((r) => (
                  <li key={`${r.voucherNo}-${r.date}`} className="px-5 py-4 space-y-1">
                    <div className="flex items-center justify-between gap-4 text-base">
                      <span className="font-semibold">{r.employeeName}</span>
                      <span className="font-semibold tabular-nums">{dinar(r.amountIqd)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      بەروار: {r.date}
                      {r.periodLabel ? ` · ماوە: ${r.periodLabel}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
