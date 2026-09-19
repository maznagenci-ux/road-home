import { describe, expect, it } from 'vitest';
import {
  alertLevelFor,
  computeVariance,
  DEFAULT_FINANCE_CONFIG,
} from './cost-control';
import { weightedAvgCost } from './inventory';

describe('cost-control formulas', () => {
  it('computes variance and remaining', () => {
    const r = computeVariance(120_000_000, 100_000_000);
    expect(r.budgetVarianceIqd).toBe(20_000_000);
    expect(r.variancePct).toBe(20);
    expect(r.remainingBudgetIqd).toBe(-20_000_000);
    expect(r.forecastFinalCostIqd).toBe(120_000_000);
  });

  it('handles zero budget', () => {
    const r = computeVariance(5_000, 0);
    expect(r.variancePct).toBe(100);
  });

  it('maps alert thresholds', () => {
    const t = DEFAULT_FINANCE_CONFIG.budget;
    expect(alertLevelFor(79_000, 100_000, t)).toBe('ok');
    expect(alertLevelFor(80_000, 100_000, t)).toBe('warn');
    expect(alertLevelFor(100_000, 100_000, t)).toBe('critical');
    expect(alertLevelFor(110_000, 100_000, t)).toBe('severe');
  });
});

describe('weightedAvgCost', () => {
  it('blends inbound cost', () => {
    // 10 @ 1000 + 10 @ 2000 => 20 @ 1500
    expect(weightedAvgCost(10, 1000, 10, 2000)).toBe(1500);
  });

  it('returns current avg when add qty is 0', () => {
    expect(weightedAvgCost(5, 900, 0, 1000)).toBe(900);
  });
});
