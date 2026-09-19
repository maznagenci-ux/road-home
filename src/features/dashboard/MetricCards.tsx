'use client';

import {
  TrendingUp,
  TrendingDown,
  HandCoins,
  BadgeDollarSign,
  Wallet,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardMetrics } from './types';
import type { Dictionary } from '@/i18n/dictionaries';

function dinar(n: number) {
  return `${new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(Math.round(n))} د.ع`;
}

type CardDef = {
  key: string;
  icon: typeof TrendingUp;
  accent: string;
  getValue: (m: DashboardMetrics) => number;
  label: (t: Dictionary) => string;
};

const cards: CardDef[] = [
  {
    key: 'monthIncome',
    icon: TrendingUp,
    accent: 'text-teal-700 dark:text-teal-300',
    getValue: (m) => m.salesIncomeIqd,
    label: () => 'داهات',
  },
  {
    key: 'monthExpense',
    icon: TrendingDown,
    accent: 'text-rose-700 dark:text-rose-300',
    getValue: (m) => m.constructionSpendIqd,
    label: () => 'خەرجی',
  },
  {
    key: 'net',
    icon: Scale,
    accent: 'text-emerald-800 dark:text-emerald-200',
    getValue: (m) => m.monthNetIqd ?? m.salesIncomeIqd - m.constructionSpendIqd,
    label: () => 'قازانج',
  },
  {
    key: 'cash',
    icon: Wallet,
    accent: 'text-stone-800 dark:text-stone-200',
    getValue: (m) => m.cashIqd ?? m.totalAvailableIqd ?? 0,
    label: () => 'نەقد',
  },
  {
    key: 'vendor',
    icon: HandCoins,
    accent: 'text-amber-800 dark:text-amber-200',
    getValue: (m) => m.vendorDebtsIqd,
    label: (t) => t.dashboard.vendorDebts,
  },
  {
    key: 'buyer',
    icon: BadgeDollarSign,
    accent: 'text-sky-800 dark:text-sky-200',
    getValue: (m) => m.buyerDebtsIqd,
    label: (t) => t.dashboard.buyerDebts,
  },
];

export function MetricCards({
  t,
  locale: _locale,
  metrics,
}: {
  t: Dictionary;
  locale: string;
  metrics: DashboardMetrics;
}) {
  void _locale;
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {cards.map(({ key, icon: Icon, accent, getValue, label }) => (
        <div
          key={key}
          className="rounded-xl border border-border/70 bg-background/70 px-4 py-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className={cn('h-3.5 w-3.5', accent)} />
            <p className="text-[11px] font-medium text-muted-foreground truncate">{label(t)}</p>
          </div>
          <p className="text-sm sm:text-base font-semibold tabular-nums text-foreground truncate">
            {dinar(getValue(metrics))}
          </p>
        </div>
      ))}
    </div>
  );
}
