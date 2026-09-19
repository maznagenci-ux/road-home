'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus, AlertTriangle, Lock } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import { isRTL } from '@/i18n/locale-config';
import { ProjectStatusBadge, categoryLabel, EXPENSE_CATEGORIES } from './labels';
import { QuickExpenseModal } from './QuickExpenseModal';
import { ProjectCostControlPanel } from './ProjectCostControlPanel';
import type { Dictionary } from '@/i18n/dictionaries';
import { usePermissions } from '@/features/access/PermissionsProvider';

const LOCK_MS = 12 * 60 * 60 * 1000;

function isLocked(createdAt: string, unlockApprovedAt: string | null) {
  if (unlockApprovedAt) return false;
  return Date.now() - new Date(createdAt).getTime() > LOCK_MS;
}
type ProjectPayload = {
  project: {
    id: string;
    code: string;
    name: string;
    location: string | null;
    status: string;
    budgetIqd: number;
    description: string | null;
  };
  financials: {
    totalSpentIqd: number;
    cashPaidIqd: number;
    vendorDebtIqd: number;
    buyerDebtIqd: number;
    budgetIqd: number;
  };
  vendorDebts: Array<{
    id: string;
    voucherNo: string;
    partyName: string;
    category: string | null;
    amountIqd: number;
    outstanding: number;
    dueDate: string | null;
    alert: 'ok' | 'soon' | 'overdue';
    exchangeRate: number;
    amountUsd: number;
  }>;
  expenses: Array<{
    id: string;
    voucherNo: string;
    category: string | null;
    partyName: string;
    amountIqd: number;
    amountUsd: number;
    exchangeRate: number;
    exchangeLockedAt: string;
    paymentMethod: string;
    status: string;
    note: string | null;
    createdAt: string;
    unlockApprovedAt: string | null;
    staffName: string | null;
  }>;
};

export function ProjectProfileView({
  t,
  lang,
  data,
  houses,
  onRefresh,
}: {
  t: Dictionary;
  lang: string;
  data: ProjectPayload;
  houses: Array<{ code: string; name: string }>;
  onRefresh: () => void;
}) {
  const { project, financials, vendorDebts, expenses } = data;
  const usdToIqd = useFxStore((s) => s.usdToIqd);
  const rtl = isRTL(lang);
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const [filter, setFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const { can } = usePermissions();

  const filtered = useMemo(() => {
    if (filter === 'ALL') return expenses;
    return expenses.filter((e) => e.category === filter);
  }, [expenses, filter]);

  const cards = [
    { label: t.pages.projects.totalCost, value: financials.totalSpentIqd, tone: 'text-foreground' },
    { label: t.pages.projects.cashPaid, value: financials.cashPaidIqd, tone: 'text-primary' },
    { label: t.pages.projects.owedVendors, value: financials.vendorDebtIqd, tone: 'text-rose-600' },
    { label: t.pages.projects.owedBuyer, value: financials.buyerDebtIqd, tone: 'text-amber-600' },
  ];

  const reverse = async (id: string) => {
    const res = await fetch(`/api/vouchers/${id}/reverse`, { method: 'POST' });
    if (res.ok) onRefresh();
  };

  const unlock = async (id: string) => {
    const res = await fetch(`/api/vouchers/${id}/unlock`, { method: 'POST' });
    if (res.ok) onRefresh();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <Link
            href={`/${lang}/projects`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 mb-3"
          >
            <BackIcon className="h-3.5 w-3.5" />
            {t.pages.projects.backToList}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              <span className="font-mono text-primary">{project.code}</span>
              <span className="mx-2 text-muted-foreground/70">·</span>
              {project.name}
            </h1>
            <ProjectStatusBadge t={t} status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {project.location ?? '—'}
            <span className="mx-2 text-muted-foreground">·</span>
            {t.dashboard.budget}: {formatCurrency(financials.budgetIqd, lang)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t.pages.projects.addExpense}
        </button>
      </div>

      {can('VIEW_CONSTRUCTION_COST') ? (
        <ProjectCostControlPanel
          t={t}
          lang={lang}
          houseId={project.id}
          canEditBudget={can('MANAGE_PROJECT_BUDGET')}
        />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card shadow-sm p-5 hover:border-primary/30 transition-colors"
          >
            <p className="text-xs text-muted-foreground mb-2">{c.label}</p>
            <p className={cn('text-xl font-semibold tabular-nums', c.tone)}>
              {formatCurrency(c.value, lang)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
              ${(c.value / usdToIqd).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">{t.pages.projects.expensesLog}</h2>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')} label={t.pages.projects.filterAll} />
            {EXPENSE_CATEGORIES.slice(0, 4).map((c) => (
              <FilterChip
                key={c}
                active={filter === c}
                onClick={() => setFilter(c)}
                label={categoryLabel(t, c)}
              />
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm text-start">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.voucherId}</th>
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.dateTime}</th>
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.category}</th>
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.party}</th>
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.amount}</th>
                <th className="px-4 py-3 font-medium text-start">{t.pages.projects.fxLocked}</th>
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.paymentStatus}</th>
                <th className="px-4 py-3 font-medium text-start">{t.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {t.table.noResults}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{row.voucherNo}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt, lang)}</td>
                    <td className="px-4 py-3 text-foreground/80">{categoryLabel(t, row.category)}</td>
                    <td className="px-4 py-3 text-foreground/90 font-medium">{row.partyName}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <div className={cn(row.status === 'REVERSED' && 'line-through text-muted-foreground')}>
                        {formatCurrency(row.amountIqd, lang)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        ${row.amountUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {row.exchangeRate.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === 'REVERSED' ? (
                        <span className="text-[11px] text-muted-foreground">{t.pages.projects.reversed}</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {row.paymentMethod === 'CASH_VAULT'
                            ? t.pages.projects.paymentCash
                            : t.pages.projects.paymentCredit}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === 'POSTED' && (
                        <div className="flex flex-col gap-1 items-start">
                          {isLocked(row.createdAt, row.unlockApprovedAt) ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                                <Lock className="h-3 w-3" />
                                {t.pages.access.locked}
                              </span>
                              <button
                                type="button"
                                onClick={() => void unlock(row.id)}
                                className="text-xs text-primary hover:text-emerald-300"
                              >
                                {t.pages.access.unlock}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void reverse(row.id)}
                              className="text-xs text-amber-600 hover:text-amber-300"
                            >
                              {t.pages.projects.reverse}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t.pages.projects.vendorDebts}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm text-start">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.voucherId}</th>
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.party}</th>
                <th className="px-4 py-3 font-medium text-start">{t.dashboard.category}</th>
                <th className="px-4 py-3 font-medium text-start">{t.pages.projects.outstanding}</th>
                <th className="px-4 py-3 font-medium text-start">{t.pages.projects.dueDate}</th>
                <th className="px-4 py-3 font-medium text-start">{t.table.status}</th>
              </tr>
            </thead>
            <tbody>
              {vendorDebts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {t.table.noResults}
                  </td>
                </tr>
              ) : (
                vendorDebts.map((d) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{d.voucherNo}</td>
                    <td className="px-4 py-3 text-foreground/90 font-medium">{d.partyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{categoryLabel(t, d.category)}</td>
                    <td className="px-4 py-3 tabular-nums text-rose-600 font-medium">
                      {formatCurrency(d.outstanding, lang)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.dueDate ? formatDate(d.dueDate, lang) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {d.alert === 'overdue' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {t.pages.projects.alertOverdue}
                        </span>
                      )}
                      {d.alert === 'soon' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {t.pages.projects.alertSoon}
                        </span>
                      )}
                      {d.alert === 'ok' && <span className="text-[11px] text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <QuickExpenseModal
        t={t}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultHouseCode={project.code}
        houses={houses}
        onCreated={onRefresh}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-lg text-[11px] border transition-colors',
        active
          ? 'bg-primary/15 text-primary border-primary/25'
          : 'bg-transparent text-muted-foreground border-border hover:text-foreground/80',
      )}
    >
      {label}
    </button>
  );
}
