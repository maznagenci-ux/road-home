export type ScheduleRow = {
  dueDate: string;
  amountIqd: number;
  label: string;
};

export type RentDueInfo = {
  rentDue: boolean;
  overdue: boolean;
  daysUntilDue: number | null;
  nextDueDate: string | null;
  nextDueAmountIqd: number | null;
  nextDueLabel: string | null;
  periodLabel: string | null;
};

function isoDay(d: Date | string) {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function addMonthsIso(iso: string, months: number) {
  const [y, m, day] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

function daysBetweenUtc(fromIso: string, toIso: string) {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

function parseSchedule(raw: string | null | undefined): ScheduleRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ScheduleRow[];
    return Array.isArray(parsed) ? parsed.filter((r) => r?.dueDate && r.amountIqd > 0) : [];
  } catch {
    return [];
  }
}

function buildFallbackSchedule(input: {
  startDate: Date | string;
  endDate?: Date | string | null;
  durationMonths?: number | null;
  monthlyRentIqd: number;
}): ScheduleRow[] {
  const start = isoDay(input.startDate);
  let months = input.durationMonths && input.durationMonths > 0 ? input.durationMonths : 12;
  if (input.endDate) {
    const end = isoDay(input.endDate);
    let count = 0;
    let cursor = start;
    while (cursor <= end && count < 120) {
      count += 1;
      cursor = addMonthsIso(start, count);
    }
    if (count > 0) months = count;
  }
  const rows: ScheduleRow[] = [];
  for (let i = 0; i < months; i++) {
    rows.push({
      dueDate: addMonthsIso(start, i),
      amountIqd: input.monthlyRentIqd,
      label: `مانگ ${i + 1}`,
    });
  }
  return rows;
}

/**
 * First unpaid schedule row relative to today.
 * periodLabel uses YYYY-MM of dueDate (aligned with collectRent).
 */
export function computeRentDue(
  lease: {
    status: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    durationMonths?: number | null;
    monthlyRentIqd: number;
    paymentSchedule?: string | null;
  },
  payments: Array<{ periodLabel: string }>,
  today = new Date(),
): RentDueInfo {
  const empty: RentDueInfo = {
    rentDue: false,
    overdue: false,
    daysUntilDue: null,
    nextDueDate: null,
    nextDueAmountIqd: null,
    nextDueLabel: null,
    periodLabel: null,
  };

  if (lease.status !== 'ACTIVE') return empty;

  const paid = new Set(payments.map((p) => p.periodLabel));
  let rows = parseSchedule(lease.paymentSchedule);
  if (!rows.length) {
    rows = buildFallbackSchedule({
      startDate: lease.startDate,
      endDate: lease.endDate,
      durationMonths: lease.durationMonths,
      monthlyRentIqd: lease.monthlyRentIqd,
    });
  }

  const todayIso = isoDay(
    new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())),
  );

  for (const row of rows) {
    const dueIso = row.dueDate.slice(0, 10);
    const period = dueIso.slice(0, 7);
    if (paid.has(period) || paid.has(row.label)) continue;

    const daysUntilDue = daysBetweenUtc(todayIso, dueIso);
    const rentDue = daysUntilDue <= 0;
    return {
      rentDue,
      overdue: daysUntilDue < 0,
      daysUntilDue,
      nextDueDate: dueIso,
      nextDueAmountIqd: row.amountIqd,
      nextDueLabel: row.label,
      periodLabel: period,
    };
  }

  return empty;
}
