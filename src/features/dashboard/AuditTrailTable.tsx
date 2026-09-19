'use client';

import { cn } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import {
  formatAuditDate,
  formatDualCurrency,
  type AuditEntry,
  type PaymentStatus,
} from './types';
import type { Dictionary } from '@/i18n/dictionaries';

function StatusBadge({
  status,
  t,
}: {
  status: PaymentStatus;
  t: Dictionary;
}) {
  const map: Record<PaymentStatus, { label: string; className: string }> = {
    paid: {
      label: t.dashboard.statusPaid,
      className: 'bg-primary/15 text-primary border-primary/25',
    },
    pending: {
      label: t.dashboard.statusPending,
      className: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
    },
    overdue: {
      label: t.dashboard.statusOverdue,
      className: 'bg-rose-500/15 text-rose-600 border-rose-500/25',
    },
    partial: {
      label: t.dashboard.statusPartial,
      className: 'bg-sky-500/15 text-sky-600 border-sky-500/25',
    },
  };
  const s = map[status];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap', s.className)}>
      {s.label}
    </span>
  );
}

export function AuditTrailTable({
  t,
  locale,
  rows,
}: {
  t: Dictionary;
  locale: string;
  rows: AuditEntry[];
}) {
  const { usdToIqd, displayCurrency } = useFxStore();

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">{t.dashboard.auditTrail}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm text-start">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.voucherId}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.dateTime}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.costCenter}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.category}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.party}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.amount}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.paymentStatus}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.auditStaff}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  {t.table.noResults}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
              const dual = formatDualCurrency(row.amountIqd, usdToIqd, locale);
              return (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-primary">{row.voucherId}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatAuditDate(row.occurredAt, locale)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground/80">{row.costCenter}</td>
                  <td className="px-4 py-3 text-foreground/80">{row.category}</td>
                  <td className="px-4 py-3 text-foreground/90 font-medium">{row.partyName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <div className="text-foreground">
                      {displayCurrency === 'USD' ? dual.usd : dual.iqd}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {displayCurrency === 'USD' ? dual.iqd : dual.usd}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} t={t} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.staffName}</td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
