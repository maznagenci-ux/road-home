'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileText, BarChart3, Download } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';

export function ReportsView({ t, lang }: { t: Dictionary; lang: string }) {
  const r = (t.pages as { reports?: Record<string, string> }).reports ?? {};
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const financialHref = useMemo(() => {
    const qs = new URLSearchParams({ locale: lang });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return `/api/pdf/report/financial?${qs.toString()}`;
  }, [lang, from, to]);

  const monthlyHref = useMemo(() => {
    return `/api/pdf/report/monthly?month=${month}&year=${year}`;
  }, [month, year]);

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50';

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader title={t.pages.reports.title} />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">
            {r.monthlyOwner ?? 'ڕاپۆرتی مانگانەی خاوەن'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {r.monthlyOwnerHint ??
              'پوختە، داهات/خەرجی، نەقد، P&L، قەرزەکان و پاشکۆی مامەڵەکان'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{r.month ?? 'مانگ'}</label>
            <input
              type="number"
              min={1}
              max={12}
              className={field}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{r.year ?? 'ساڵ'}</label>
            <input
              type="number"
              min={2000}
              className={field}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <a
            href={monthlyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            {r.generateMonthly ?? 'دروستکردنی ڕاپۆرتی مانگانە'}
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">{r.financial ?? t.pages.reports.financial}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {r.financialHint ??
              'ڕاپۆرتی یەکگرتوو: فرۆشتن + کرێ + بیناسازی + ئۆفیس + مووچە'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{r.from ?? 'لە'}</label>
            <input type="date" className={field} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{r.to ?? 'بۆ'}</label>
            <input type="date" className={field} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <a
            href={financialHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            {r.downloadPdf ?? t.pages.reports.downloadPdf}
          </a>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href={`/${lang}/contracts`}
          className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors shadow-sm"
        >
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{t.pages.reports.contracts}</p>
            <p className="text-sm text-muted-foreground">{t.pages.contracts.title}</p>
          </div>
        </a>
        <a
          href={`/${lang}/accounting/office`}
          className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors shadow-sm"
        >
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {(t.nav as { officeExpenses?: string }).officeExpenses ?? 'خەرجی ئۆفیس و مووچە'}
            </p>
            <p className="text-sm text-muted-foreground">{r.openOffice ?? 'کردنەوەی بەشی ئۆفیس'}</p>
          </div>
        </a>
      </div>
    </div>
  );
}
