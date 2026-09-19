'use client';

import { QuickActionModules } from './QuickActionModules';
import { MetricCards } from './MetricCards';
import { InstallmentPaymentsPanel } from './InstallmentPaymentsPanel';
import { CostCenterSummary } from './CostCenterSummary';
import { AuditTrailTable } from './AuditTrailTable';
import type {
  AuditEntry,
  CostCenterRow,
  DashboardActivityCounts,
  DashboardMetrics,
  InstallmentRow,
} from './types';
import type { Dictionary } from '@/i18n/dictionaries';

export function DashboardView({
  t,
  locale,
  metrics,
  activity,
  installments,
  costCenters,
  audit,
}: {
  t: Dictionary;
  locale: string;
  metrics: DashboardMetrics;
  activity: DashboardActivityCounts;
  installments: InstallmentRow[];
  costCenters: CostCenterRow[];
  audit: AuditEntry[];
}) {
  return (
    <div className="relative max-w-[1400px] mx-auto">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-64 rounded-[2rem] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_65%)]"
      />

      <div className="relative space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {t.app.name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {t.dashboard.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {t.dashboard.welcome} · {t.app.tagline}
            </p>
          </div>
        </div>

        <QuickActionModules t={t} lang={locale} activity={activity} />

        <MetricCards t={t} locale={locale} metrics={metrics} />

        <InstallmentPaymentsPanel t={t} lang={locale} rows={installments} />

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2">
            <CostCenterSummary t={t} locale={locale} rows={costCenters} />
          </div>
          <div className="xl:col-span-3">
            <AuditTrailTable t={t} locale={locale} rows={audit} />
          </div>
        </div>
      </div>
    </div>
  );
}
