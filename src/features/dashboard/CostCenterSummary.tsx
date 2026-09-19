'use client';

import { cn } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import { formatDualCurrency, type CostCenterRow } from './types';
import type { Dictionary } from '@/i18n/dictionaries';

export function CostCenterSummary({
  t,
  locale,
  rows,
}: {
  t: Dictionary;
  locale: string;
  rows: CostCenterRow[];
}) {
  const usdToIqd = useFxStore((s) => s.usdToIqd);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">{t.dashboard.costCenters}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t.dashboard.vsBudget}</p>
      </div>

      <div className="space-y-5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t.table.noResults}</p>
        ) : (
          rows.map((row) => {
          const pct = row.budgetIqd > 0 ? Math.min(100, (row.spentIqd / row.budgetIqd) * 100) : 0;
          const over = pct >= 95;
          const warn = pct >= 75 && pct < 95;
          const dualSpent = formatDualCurrency(row.spentIqd, usdToIqd, locale);
          const dualBudget = formatDualCurrency(row.budgetIqd, usdToIqd, locale);

          return (
            <div key={row.houseCode} className="group">
              <div className="flex items-end justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    <span className="font-mono text-primary">{row.houseCode}</span>
                    <span className="mx-2 text-muted-foreground/70">·</span>
                    <span className="text-foreground/80">{row.houseName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {t.dashboard.spent}: {dualSpent.iqd}
                    <span className="mx-1.5 text-muted-foreground/70">/</span>
                    {t.dashboard.budget}: {dualBudget.iqd}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums shrink-0',
                    over ? 'text-rose-600' : warn ? 'text-amber-600' : 'text-primary',
                  )}
                >
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted border border-border overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    over
                      ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                      : warn
                        ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                        : 'bg-gradient-to-r from-primary to-primary/70',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })
        )}
      </div>
    </section>
  );
}
