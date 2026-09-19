'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { HardHat, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { isRTL } from '@/i18n/locale-config';
import { ProjectStatusBadge } from './labels';
import { QuickExpenseModal } from './QuickExpenseModal';
import type { Dictionary } from '@/i18n/dictionaries';

type ProjectItem = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
  budgetIqd: number;
  financials: {
    totalSpentIqd: number;
    cashPaidIqd: number;
    vendorDebtIqd: number;
    buyerDebtIqd: number;
  };
};

export function ProjectsListView({ t, lang }: { t: Dictionary; lang: string }) {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.pages.projects.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.pages.projects.subtitle}</p>
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

      {loading ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {t.pages.projects.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/${lang}/projects/${encodeURIComponent(p.code)}`}
              className="group rounded-2xl border border-border bg-card shadow-sm p-5 hover:border-primary/40 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted border border-border text-primary">
                    <HardHat className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-primary">{p.code}</p>
                    <p className="text-foreground font-medium truncate">{p.name}</p>
                  </div>
                </div>
                <Chevron className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground shrink-0 mt-1" />
              </div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-xs text-muted-foreground truncate">{p.location ?? '—'}</p>
                <ProjectStatusBadge t={t} status={p.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground mb-0.5">{t.pages.projects.totalCost}</p>
                  <p className="text-foreground/90 tabular-nums font-medium">
                    {formatCurrency(p.financials.totalSpentIqd, lang)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">{t.pages.projects.owedVendors}</p>
                  <p className="text-rose-600 tabular-nums font-medium">
                    {formatCurrency(p.financials.vendorDebtIqd, lang)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <QuickExpenseModal
        t={t}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        houses={items.map((i) => ({ code: i.code, name: i.name }))}
        onCreated={() => void load()}
      />
    </div>
  );
}
