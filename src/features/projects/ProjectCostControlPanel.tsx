'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type CostSnap = {
  houseId: string;
  projectId: string;
  originalBudgetIqd: number;
  revisedBudgetIqd: number;
  currentBudgetIqd: number;
  actualCostIqd: number;
  remainingBudgetIqd: number;
  budgetVarianceIqd: number;
  variancePct: number;
  forecastFinalCostIqd: number;
  alertLevel: 'ok' | 'warn' | 'critical' | 'severe';
  thresholds: { warnPct: number; criticalPct: number; severePct: number };
};

const tone: Record<CostSnap['alertLevel'], string> = {
  ok: 'border-border bg-card',
  warn: 'border-amber-400/50 bg-amber-500/5',
  critical: 'border-rose-400/50 bg-rose-500/5',
  severe: 'border-rose-600 bg-rose-500/10',
};

export function ProjectCostControlPanel({
  t,
  lang,
  houseId,
  canEditBudget,
}: {
  t: Dictionary;
  lang: string;
  houseId: string;
  canEditBudget?: boolean;
}) {
  const c = (t.pages as { constructionCost?: Record<string, string> }).constructionCost ?? {};
  const [cost, setCost] = useState<CostSnap | null>(null);
  const [loading, setLoading] = useState(true);
  const [revised, setRevised] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/construction/cost?houseId=${encodeURIComponent(houseId)}`);
    if (res.ok) {
      const data = await res.json();
      setCost(data.cost);
      setRevised(String(data.cost?.revisedBudgetIqd ?? ''));
    }
    setLoading(false);
  }, [houseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!cost) return;
    setSaving(true);
    const revisedIqd = Number(revised);
    await fetch('/api/construction/cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        houseId,
        originalIqd: cost.originalBudgetIqd,
        revisedIqd,
      }),
    });
    setSaving(false);
    await load();
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!cost) return null;

  const rows = [
    { label: c.originalBudget ?? 'بودجەی سەرەتا', value: cost.originalBudgetIqd },
    { label: c.revisedBudget ?? 'بودجەی نوێکراو', value: cost.revisedBudgetIqd },
    { label: c.actualCost ?? 'تێچووی ڕاستەقینە', value: cost.actualCostIqd },
    { label: c.remaining ?? 'بودجەی ماوە', value: cost.remainingBudgetIqd },
    { label: c.variance ?? 'جیاوازی بودجە', value: cost.budgetVarianceIqd },
    { label: c.forecast ?? 'پێشبینی کۆتایی', value: cost.forecastFinalCostIqd },
  ];

  return (
    <section className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${tone[cost.alertLevel]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">
            {c.title ?? 'کۆنترۆڵی تێچووی پڕۆژە'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {c.hint ?? 'بودجە، تێچوو، جیاوازی و ئاگاداری'}
          </p>
        </div>
        {cost.alertLevel !== 'ok' ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            {c.alert ?? 'ئاگاداری بودجە'}: {cost.alertLevel} · {cost.variancePct.toFixed(1)}%
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">{r.label}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatCurrency(r.value, lang, 'IQD')}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">{c.variancePct ?? 'ڕێژەی جیاوازی'}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{cost.variancePct.toFixed(1)}%</p>
        </div>
      </div>

      {canEditBudget ? (
        <form onSubmit={(e) => void saveBudget(e)} className="flex flex-wrap items-end gap-2 pt-1">
          <div className="flex-1 min-w-[10rem]">
            <label className="text-xs text-muted-foreground mb-1 block">
              {c.reviseBudget ?? 'نوێکردنەوەی بودجە'}
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={revised}
              onChange={(e) => setRevised(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (c.saveBudget ?? 'پاشەکەوت')}
          </button>
        </form>
      ) : null}
    </section>
  );
}
