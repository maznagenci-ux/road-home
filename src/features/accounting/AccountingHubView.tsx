'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  FileBarChart,
  ListOrdered,
  ScrollText,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type Snapshot = {
  todayIncomeIqd: number;
  todayExpenseIqd: number;
  monthIncomeIqd: number;
  monthExpenseIqd: number;
  monthNetIqd: number;
  cashIqd: number;
  totalAvailableIqd: number;
};

export function AccountingHubView({ t, lang }: { t: Dictionary; lang: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    void fetch('/api/accounting/summary')
      .then((r) => r.json())
      .then((d) => {
        const s = d.snapshot;
        if (!s) return;
        setSnap({
          todayIncomeIqd: s.todayIncomeIqd,
          todayExpenseIqd: s.todayExpenseIqd,
          monthIncomeIqd: s.monthIncomeIqd,
          monthExpenseIqd: s.monthExpenseIqd,
          monthNetIqd: s.monthNetIqd,
          cashIqd: s.cashIqd,
          totalAvailableIqd: s.cashIqd,
        });
      })
      .catch(() => undefined);
  }, []);

  const actions = [
    {
      href: `/${lang}/accounting/transactions`,
      icon: ArrowDownCircle,
      title: 'پارە هاتە ژوورەوە',
      desc: 'فرۆشتن، کرێ، یان هەر داهاتێک — لێرە تۆماری بکە',
      tone: 'border-teal-200 bg-teal-50/80 text-teal-950',
    },
    {
      href: `/${lang}/accounting/transactions`,
      icon: ArrowUpCircle,
      title: 'پارە چووە دەرەوە',
      desc: 'خەرجی، مووچە، پارەدانی دابینکەر — لێرە تۆماری بکە',
      tone: 'border-rose-200 bg-rose-50/80 text-rose-950',
    },
    {
      href: `/${lang}/accounting/cash`,
      icon: Wallet,
      title: 'نەقد / خەزنە',
      desc: 'چەند پارە لە دەستتە؟ واریز و ڕاکێشان',
      tone: 'border-stone-200 bg-stone-50 text-stone-900',
    },
    {
      href: `/api/pdf/report/monthly?month=${month}&year=${year}`,
      icon: FileBarChart,
      title: 'ڕاپۆرتی مانگانە',
      desc: 'بۆ خاوەن: پوختە + وردەکاریی ئەم مانگە (PDF)',
      tone: 'border-amber-200 bg-amber-50/80 text-amber-950',
      external: true,
    },
    {
      href: `/${lang}/accounting/statements`,
      icon: ScrollText,
      title: 'بەیاننامە (پێشکەوتوو)',
      desc: 'کڕیار، دابینکەر، خانوو — تەنها کاتێک پێویستت بە لیستی قەرز هەیە',
      tone: 'border-border bg-card text-foreground',
    },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir="rtl">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {t.app.name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{t.pages.accounting.title}</h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          بیرکردنەوە سادەیە: <strong className="text-foreground">پارە دێت</strong>،{' '}
          <strong className="text-foreground">پارە دەڕوات</strong>، و{' '}
          <strong className="text-foreground">چەندت ماوە لە نەقد</strong>. هەموو ژمارەکان بە دینارن.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">ئەمڕۆ / ئەم مانگە</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['داهاتی مانگ', snap?.monthIncomeIqd],
            ['خەرجی مانگ', snap?.monthExpenseIqd],
            ['نەقد', snap?.cashIqd],
            ['بەردەست', snap?.totalAvailableIqd],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-muted/50 px-3 py-3">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold tabular-nums mt-1">
                {snap ? formatCurrency(Number(value ?? 0), lang, 'IQD') : '…'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">چیت دەوێت بکەیت؟</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            const className = `flex gap-3 rounded-2xl border p-4 text-start transition hover:shadow-sm ${a.tone}`;
            const inner = (
              <>
                <Icon className="h-6 w-6 shrink-0 mt-0.5" />
                <span>
                  <span className="block font-semibold">{a.title}</span>
                  <span className="block text-sm opacity-80 mt-1 leading-snug">{a.desc}</span>
                </span>
              </>
            );
            if ('external' in a && a.external) {
              return (
                <a
                  key={a.title}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link key={a.title} href={a.href} className={className}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground flex items-center gap-2">
          <ListOrdered className="h-4 w-4" />
          تێبینی خێرا
        </p>
        <ul className="list-disc pr-5 space-y-1">
          <li>
            <strong className="text-foreground">سەرمایەی خاوەن</strong> و ڕاکێشانی خاوەن لە قازانج و
            زەرەر ناهێنرێنە ژمارە.
          </li>
          <li>
            بۆ ڕۆژانە{' '}
            <Link href={`/${lang}/accounting/transactions`} className="underline text-foreground">
              مامەڵەکان
            </Link>{' '}
            بەسە — جۆر: داهات یان خەرجی، بڕ: دینار.
          </li>
        </ul>
      </section>
    </div>
  );
}
