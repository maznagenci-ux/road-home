import type { Dictionary } from '@/i18n/dictionaries';
import { cn } from '@/lib/utils';

export type ProjectStatus = 'IN_CONSTRUCTION' | 'SOLD' | 'FINISHED';

export function projectStatusLabel(t: Dictionary, status: string) {
  switch (status) {
    case 'IN_CONSTRUCTION':
      return t.pages.projects.statusInConstruction;
    case 'SOLD':
      return t.pages.projects.statusSold;
    case 'FINISHED':
      return t.pages.projects.statusFinished;
    default:
      return status;
  }
}

export function ProjectStatusBadge({
  t,
  status,
}: {
  t: Dictionary;
  status: string;
}) {
  const styles: Record<string, string> = {
    IN_CONSTRUCTION: 'bg-sky-500/15 text-sky-600 border-sky-500/25',
    SOLD: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
    FINISHED: 'bg-primary/15 text-primary border-primary/25',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        styles[status] ?? 'bg-muted text-muted-foreground border-border',
      )}
    >
      {projectStatusLabel(t, status)}
    </span>
  );
}

export const EXPENSE_CATEGORIES = [
  'STEEL',
  'CEMENT',
  'LABOR',
  'PERMITS',
  'MATERIALS',
  'EQUIPMENT',
  'UTILITIES',
  'OTHER',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function categoryLabel(t: Dictionary, cat: string | null | undefined) {
  if (!cat) return '—';
  const map: Record<string, string> = {
    STEEL: t.pages.projects.filterSteel,
    CEMENT: t.pages.projects.filterCement,
    LABOR: t.pages.projects.filterLabor,
    PERMITS: t.pages.projects.filterPermits,
    MATERIALS: t.pages.projects.filterMaterials,
    EQUIPMENT: t.pages.projects.filterEquipment,
    UTILITIES: t.pages.projects.filterUtilities,
    OTHER: t.pages.projects.filterOther,
  };
  return map[cat] ?? cat;
}
