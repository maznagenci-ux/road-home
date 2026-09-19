'use client';

import Link from 'next/link';
import { KeyRound, Receipt, WalletCards, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardActivityCounts } from './types';
import type { Dictionary } from '@/i18n/dictionaries';

const modules = [
  {
    key: 'rental' as const,
    href: (lang: string) => `/${lang}/rentals`,
    icon: KeyRound,
    tone: {
      ink: 'text-sky-800 dark:text-sky-200',
      soft: 'bg-sky-500/[0.08]',
      solid: 'bg-[#1e3a5f]',
      ring: 'hover:border-sky-500/35',
    },
    countKey: 'rentalLeases' as const,
  },
  {
    key: 'receiptLinked' as const,
    href: (lang: string) => `/${lang}/receipts`,
    icon: Receipt,
    tone: {
      ink: 'text-stone-800 dark:text-stone-200',
      soft: 'bg-stone-500/[0.08]',
      solid: 'bg-[#292524]',
      ring: 'hover:border-stone-500/35',
    },
    countKey: 'receiptsLinked' as const,
  },
  {
    key: 'receiptOpen' as const,
    href: (lang: string) => `/${lang}/receipts`,
    icon: WalletCards,
    tone: {
      ink: 'text-amber-900 dark:text-amber-100',
      soft: 'bg-amber-500/[0.1]',
      solid: 'bg-[#9a3412]',
      ring: 'hover:border-amber-600/35',
    },
    countKey: 'receiptsUnlinked' as const,
  },
];

export function QuickActionModules({
  t,
  lang,
  activity,
}: {
  t: Dictionary;
  lang: string;
  activity: DashboardActivityCounts;
}) {
  const labels = {
    rental: {
      title: t.dashboard.quickRental,
      hint: t.dashboard.quickRentalHint,
      count: t.dashboard.countRentals,
    },
    receiptLinked: {
      title: t.dashboard.quickReceiptLinked,
      hint: t.dashboard.quickReceiptLinkedHint,
      count: t.dashboard.countReceiptsLinked,
    },
    receiptOpen: {
      title: t.dashboard.quickReceiptOpen,
      hint: t.dashboard.quickReceiptOpenHint,
      count: t.dashboard.countReceiptsOpen,
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {modules.map(({ key, href, icon: Icon, tone, countKey }, index) => {
        const copy = labels[key];
        return (
          <div
            key={key}
            className={cn(
              'group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm',
              'rh-dash-rise',
            )}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <Link
              href={href(lang)}
              className={cn(
                'relative flex items-start gap-3 p-4 transition-colors',
                tone.soft,
                tone.ring,
              )}
            >
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80',
                  tone.ink,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-foreground leading-snug">{copy.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{copy.hint}</p>
              </div>
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background',
                  'text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:text-foreground',
                )}
              >
                <Plus className="h-4 w-4" />
              </span>
            </Link>

            <div className={cn('relative px-5 py-5 text-white', tone.solid)}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_55%)]" />
              <p className="relative text-[11px] font-medium text-white/70">{copy.count}</p>
              <p className="relative mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                {activity[countKey]}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
