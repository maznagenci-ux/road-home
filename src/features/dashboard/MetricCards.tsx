'use client';

import {
  TrendingUp,
  TrendingDown,
  HandCoins,
  BadgeDollarSign,
  Wallet,
  Scale,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import type { DashboardMetrics } from './types';
import type { Dictionary } from '@/i18n/dictionaries';

type CardDef = {
  key: string;
  icon: typeof TrendingUp;
  accent: string;
  /** IQD base (ledger rollup) */
  getIqd: (m: DashboardMetrics) => number;
  /** Original USD total when available */
  getUsdOriginal?: (m: DashboardMetrics) => number;
  /** Original IQD total when available (non-converted) */
  getIqdOriginal?: (m: DashboardMetrics) => number;
  label: (t: Dictionary) => string;
};

const cards: CardDef[] = [
  {
    key: 'monthIncome',
    icon: TrendingUp,
    accent: 'text-teal-700 dark:text-teal-300',
    getIqd: (m) => m.salesIncomeIqd,
    getUsdOriginal: (m) => m.monthIncomeUsd ?? 0,
    getIqdOriginal: (m) => m.monthIncomeIqdOriginal ?? m.salesIncomeIqd,
    label: () => 'داهات',
  },
  {
    key: 'monthExpense',
    icon: TrendingDown,
    accent: 'text-rose-700 dark:text-rose-300',
    getIqd: (m) => m.constructionSpendIqd,
    getUsdOriginal: (m) => m.monthExpenseUsd ?? 0,
    getIqdOriginal: (m) => m.monthExpenseIqdOriginal ?? m.constructionSpendIqd,
    label: () => 'خەرجی',
  },
  {
    key: 'net',
    icon: Scale,
    accent: 'text-emerald-800 dark:text-emerald-200',
    getIqd: (m) => m.monthNetIqd ?? m.salesIncomeIqd - m.constructionSpendIqd,
    getUsdOriginal: (m) => (m.monthIncomeUsd ?? 0) - (m.monthExpenseUsd ?? 0),
    label: () => 'قازانج',
  },
  {
    key: 'cash',
    icon: Wallet,
    accent: 'text-stone-800 dark:text-stone-200',
    getIqd: (m) => m.cashIqd ?? m.totalAvailableIqd ?? 0,
    label: () => 'نەقد',
  },
  {
    key: 'vendor',
    icon: HandCoins,
    accent: 'text-amber-800 dark:text-amber-200',
    getIqd: (m) => m.vendorDebtsIqd,
    label: (t) => t.dashboard.vendorDebts,
  },
  {
    key: 'buyer',
    icon: BadgeDollarSign,
    accent: 'text-sky-800 dark:text-sky-200',
    getIqd: (m) => m.buyerDebtsIqd,
    label: (t) => t.dashboard.buyerDebts,
  },
];

export function MetricCards({
  t,
  locale,
  metrics,
}: {
  t: Dictionary;
  locale: string;
  metrics: DashboardMetrics;
}) {
  const { usdToIqd } = useFxStore();
  const rate = Math.max(1, usdToIqd || 150_000);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {cards.map(({ key, icon: Icon, accent, getIqd, getUsdOriginal, getIqdOriginal, label }) => {
        const iqdTotal = getIqd(metrics);
        const usdOrig = getUsdOriginal?.(metrics) ?? 0;
        const iqdOrig = getIqdOriginal?.(metrics);
        const usdFromIqd = iqdTotal / rate;

        return (
          <div
            key={key}
            className="rounded-xl border border-border/70 bg-background/70 px-4 py-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn('h-3.5 w-3.5', accent)} />
              <p className="text-[11px] font-medium text-muted-foreground truncate">{label(t)}</p>
            </div>

            {/* Original currency lines when we have USD deals this month */}
            {usdOrig > 0.009 || (iqdOrig != null && iqdOrig > 0 && usdOrig > 0) ? (
              <div className="space-y-0.5">
                {usdOrig > 0.009 ? (
                  <p className="text-sm sm:text-base font-semibold tabular-nums text-emerald-800 dark:text-emerald-200 truncate">
                    {formatCurrency(usdOrig, locale, 'USD')}
                    <span className="ms-1 text-[10px] font-medium text-muted-foreground">USD</span>
                  </p>
                ) : null}
                {(iqdOrig ?? iqdTotal) > 0.5 ? (
                  <p className="text-sm sm:text-base font-semibold tabular-nums text-foreground truncate">
                    {formatCurrency(iqdOrig ?? iqdTotal, locale, 'IQD')}
                    <span className="ms-1 text-[10px] font-medium text-muted-foreground">IQD</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-0.5">
                <p className="text-sm sm:text-base font-semibold tabular-nums text-foreground truncate">
                  {formatCurrency(iqdTotal, locale, 'IQD')}
                </p>
                <p className="text-[11px] tabular-nums text-muted-foreground truncate">
                  ≈ {formatCurrency(usdFromIqd, locale, 'USD')}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
