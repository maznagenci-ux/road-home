'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  HardHat,
  ChevronRight,
  ChevronLeft,
  Calendar,
  TrendingUp,
  Wallet,
  Hash,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { isRTL } from '@/i18n/locale-config';
import { ProjectStatusBadge } from './labels';
import type { Dictionary } from '@/i18n/dictionaries';

type ProjectItem = {
  id: string;
  code: string;
  name: string;
  unitNumber: string | null;
  location: string | null;
  status: string;
  budgetIqd: number;
  salePriceIqd: number;
  spentIqd: number;
  profitIqd: number;
  remainingBudgetIqd: number;
  finishAt: string | null;
};

export function ProjectsListView({ t, lang }: { t: Dictionary; lang: string }) {
  const p = t.pages.projects;
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const rtl = isRTL(lang);
  const Chevron = rtl ? ChevronLeft : ChevronRight;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {p.dashboardTitle ?? p.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {p.dashboardSubtitle ?? p.subtitle}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-2">
          <HardHat className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <p className="text-muted-foreground">{p.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((row) => (
            <Link
              key={row.id}
              href={`/${lang}/projects/${encodeURIComponent(row.code)}`}
              className="group rounded-2xl border border-border bg-card shadow-sm p-5 hover:border-primary/40 hover:-translate-y-0.5 transition-all block"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <HardHat className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-base font-semibold text-primary tracking-wide" dir="ltr">
                      {row.code}
                    </p>
                    <p className="text-foreground font-medium truncate">{row.name}</p>
                  </div>
                </div>
                <Chevron className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary shrink-0 mt-1" />
              </div>

              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  <span>
                    {p.unitNumber ?? t.pages.houses.unitNumber}:{' '}
                    <span className="text-foreground font-medium tabular-nums" dir="ltr">
                      {row.unitNumber || '—'}
                    </span>
                  </span>
                </p>
                <ProjectStatusBadge t={t} status={row.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Metric
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label={p.totalCost}
                  value={formatCurrency(row.spentIqd, lang)}
                />
                <Metric
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label={p.profit ?? 'قازانج'}
                  value={formatCurrency(row.profitIqd, lang)}
                  className={row.profitIqd >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                />
                <Metric
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label={p.finishDate ?? 'کاتی تەواوبوون'}
                  value={
                    row.finishAt
                      ? formatDate(row.finishAt, lang)
                      : (p.finishNotSet ?? 'دیارینەکراو')
                  }
                />
                <Metric
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label={p.budget ?? t.dashboard.budget}
                  value={formatCurrency(row.budgetIqd, lang)}
                />
              </div>

              <p className="mt-3 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {p.openDetails ?? 'کرتە بکە بۆ زانیارییەکان'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border/60 px-3 py-2.5">
      <p className="text-muted-foreground mb-1 inline-flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={cn('text-foreground/90 tabular-nums font-medium', className)}>{value}</p>
    </div>
  );
}
