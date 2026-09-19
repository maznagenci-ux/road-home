import { logActivity } from '@/lib/access/permissions';
import { getCostControlForHouse } from './cost-control';

/** Log budget threshold crossings for authorized follow-up (Phase 1: ActivityLog). */
export async function checkBudgetAlert(
  houseId: string,
  userId?: string | null,
  userName?: string | null,
) {
  const snap = await getCostControlForHouse(houseId);
  if (snap.alertLevel === 'ok') return snap;

  await logActivity({
    userId: userId ?? undefined,
    userName: userName ?? 'system',
    action: `BUDGET_ALERT_${snap.alertLevel.toUpperCase()}`,
    projectCode: snap.houseCode,
    amountIqd: snap.actualCostIqd,
    meta: JSON.stringify({
      alertLevel: snap.alertLevel,
      variancePct: snap.variancePct,
      currentBudgetIqd: snap.currentBudgetIqd,
      actualCostIqd: snap.actualCostIqd,
      thresholds: snap.thresholds,
    }),
  });

  return snap;
}
