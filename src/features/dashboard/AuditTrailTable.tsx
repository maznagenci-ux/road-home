'use client';

import { cn } from '@/lib/utils';
import {
  formatAuditDate,
  formatAuditMoney,
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
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap',
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

function CurrencyBadge({ currency }: { currency: 'IQD' | 'USD' }) {
  const usd = currency === 'USD';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
        usd
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'bg-stone-500/15 text-stone-700 dark:text-stone-300',
      )}
    >
      {usd ? 'USD $' : 'IQD د.ع'}
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
  const d = t.dashboard as Record<string, string>;

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">{t.dashboard.auditTrail}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {d.auditCurrencyHint ??
            'بڕ بە دراوی ڕەسەن (دۆلار یان دینار) · خاوەنی گرێبەست = کارمەندی مامەڵە'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm text-start">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.voucherId}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.dateTime}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.costCenter}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.category}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.party}</th>
              <th className="px-4 py-3 font-medium text-start">{d.currency ?? 'دراو'}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.amount}</th>
              <th className="px-4 py-3 font-medium text-start">{t.dashboard.paymentStatus}</th>
              <th className="px-4 py-3 font-medium text-start">
                {d.dealOwner ?? 'خاوەنی گرێبەست'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  {t.table.noResults}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const money = formatAuditMoney(row, locale);
                const secondary = row.currency === 'USD' ? money.iqd : money.usd;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-primary">{row.voucherId}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatAuditDate(row.occurredAt, locale)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground/80">
                      {row.costCenter}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{row.category}</td>
                    <td className="px-4 py-3 text-foreground/90 font-medium">{row.partyName}</td>
                    <td className="px-4 py-3">
                      <CurrencyBadge currency={row.currency} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <div className="font-semibold text-foreground">{money.primary}</div>
                      <div className="text-[11px] text-muted-foreground">{secondary}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} t={t} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{row.ownerName}</div>
                      {row.staffName &&
                      row.staffName !== row.ownerName &&
                      row.staffName !== '—' ? (
                        <div className="text-[11px] text-muted-foreground">
                          {d.postedBy ?? 'تۆمارکەر'}: {row.staffName}
                        </div>
                      ) : null}
                    </td>
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
