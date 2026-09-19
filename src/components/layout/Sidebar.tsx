'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  UserCheck,
  FileText,
  KeyRound,
  ClipboardList,
  Receipt,
  BarChart3,
  Settings,
  TrendingDown,
  TrendingUp,
  HardHat,
  ShieldPlus,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShoppingCart,
  Star,
  MapPin,
  Map,
  Banknote,
  Briefcase,
  Calculator,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isRTL } from '@/i18n/locale-config';
import { usePermissions } from '@/features/access/PermissionsProvider';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { Dictionary } from '@/i18n/dictionaries';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  perm?: string | null;
  exact?: boolean;
};

export function Sidebar({
  lang,
  t,
  collapsed,
  onToggle,
}: {
  lang: string;
  t: Dictionary;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rtl = isRTL(lang);
  const Chevron = rtl ? ChevronRight : ChevronLeft;
  const { can, ready } = usePermissions();
  const [navReady, setNavReady] = useState(false);
  const n = t.nav as Record<string, string>;
  const currentStream = searchParams.get('stream');
  const currentTab = searchParams.get('tab');

  useEffect(() => {
    setNavReady(true);
  }, []);

  /** چوار بەشی سەربەخۆ — حیسابات/وەسڵ/مووچە تێکەڵ نابن */
  const groups: { title?: string; items: NavItem[] }[] = [
    {
      title: n.homeGroup ?? 'سەرەکی',
      items: [
        {
          href: `/${lang}`,
          icon: LayoutDashboard,
          label: t.nav.dashboard,
          perm: 'VIEW_DASHBOARD',
          exact: true,
        },
        {
          href: `/${lang}/map`,
          icon: Map,
          label: n.map ?? 'نەخشە',
          perm: 'VIEW_PROPERTIES',
        },
        {
          href: `/${lang}/places`,
          icon: MapPin,
          label: n.places ?? 'شوێنەکان',
          perm: 'VIEW_PROPERTIES',
        },
      ],
    },
    {
      title: n.trading ?? 'کرین و فرۆشتن',
      items: [
        {
          href: `/${lang}/contracts`,
          icon: FileText,
          label: n.contracts ?? 'گرێبەستەکان',
          perm: 'VIEW_CONTRACTS',
        },
        {
          href: `/${lang}/customers`,
          icon: UserCheck,
          label: t.nav.customers,
          perm: 'VIEW_CONTRACTS',
        },
        {
          href: `/${lang}/receipts?stream=trading`,
          icon: Receipt,
          label: n.tradingReceipts ?? 'وەسڵی فرۆشتن',
          perm: 'VIEW_CONTRACTS',
        },
        {
          href: `/${lang}/accounting/income`,
          icon: TrendingUp,
          label: n.salesIncome ?? 'داهاتی فرۆشتن',
          perm: 'VIEW_ACCOUNTING',
        },
        {
          href: `/${lang}/anket`,
          icon: ClipboardList,
          label: t.nav.anket,
          perm: 'VIEW_ANKET',
        },
        {
          href: `/${lang}/support`,
          icon: Star,
          label: n.support ?? 'پشتگیرییەکان',
          perm: 'VIEW_CONTRACTS',
        },
      ],
    },
    {
      title: n.renting ?? 'بەکرێدان',
      items: [
        {
          href: `/${lang}/rentals`,
          icon: KeyRound,
          label: n.rentals ?? 'گرێبەستی کرێ',
          perm: 'VIEW_RENTALS',
        },
        {
          href: `/${lang}/rentals?tab=deposit`,
          icon: Wallet,
          label: n.deposits ?? 'تأمینات',
          perm: 'VIEW_RENTALS',
        },
        {
          href: `/${lang}/receipts?stream=rental`,
          icon: Receipt,
          label: n.rentalReceipts ?? 'وەسڵی کرێ',
          perm: 'VIEW_RENTALS',
        },
        {
          href: `/${lang}/receipts?stream=deposit`,
          icon: Banknote,
          label: n.depositReceipts ?? 'وەسڵی تأمینات',
          perm: 'VIEW_RENTALS',
        },
        {
          href: `/${lang}/accounting/rental`,
          icon: TrendingUp,
          label: n.rentalIncome ?? 'داهاتی کرێ',
          perm: 'VIEW_ACCOUNTING',
        },
      ],
    },
    {
      title: n.construction ?? 'دروستکردنی خانوو',
      items: [
        {
          href: `/${lang}/projects`,
          icon: HardHat,
          label: n.constructionDashboard ?? 'داشبۆردی بیناسازی',
          perm: 'VIEW_PROJECTS',
        },
        {
          href: `/${lang}/houses`,
          icon: Home,
          label: t.nav.houses,
          perm: 'VIEW_PROPERTIES',
        },
        {
          href: `/${lang}/properties`,
          icon: Building2,
          label: t.nav.properties,
          perm: 'VIEW_PROPERTIES',
        },
        {
          href: `/${lang}/owners`,
          icon: Users,
          label: t.nav.owners,
          perm: 'VIEW_PROPERTIES',
        },
        {
          href: `/${lang}/suppliers`,
          icon: ShoppingCart,
          label: n.buySupplies ?? 'کرینی کەلوپەل',
          perm: 'VIEW_CONTRACTS',
        },
        {
          href: `/${lang}/inventory`,
          icon: Package,
          label: n.inventory ?? 'کۆگای کەلوپەل',
          perm: 'VIEW_INVENTORY',
        },
        {
          href: `/${lang}/accounting/expenses`,
          icon: TrendingDown,
          label: n.constructionExpenses ?? 'خەرجی بیناسازی',
          perm: 'VIEW_ACCOUNTING',
        },
        {
          href: `/${lang}/accounting/construction/deposit`,
          icon: ArrowDownToLine,
          label: n.moneyDeposit ?? 'پارە دانان',
          perm: 'VIEW_ACCOUNTING',
        },
        {
          href: `/${lang}/accounting/construction/withdraw`,
          icon: ArrowUpFromLine,
          label: n.moneyWithdraw ?? 'پارە بردن',
          perm: 'VIEW_ACCOUNTING',
        },
        {
          href: `/${lang}/receipts?stream=construction`,
          icon: Receipt,
          label: n.constructionReceipts ?? 'وەسڵی بیناسازی',
          perm: 'VIEW_PROJECTS',
        },
      ],
    },
    {
      title: n.officeGroup ?? 'ئۆفیس · کارمەند · خاوەن',
      items: [
        {
          href: `/${lang}/accounting/office`,
          icon: Briefcase,
          label: n.officeExpenses ?? 'خەرجی ئۆفیس و مووچە',
          perm: 'VIEW_ACCOUNTING',
        },
        {
          href: `/${lang}/accounting`,
          icon: Calculator,
          label: n.ownerAccounting ?? 'حیساباتی خاوەن',
          perm: 'VIEW_ACCOUNTING',
        },
        {
          href: `/${lang}/reports`,
          icon: BarChart3,
          label: t.nav.reports,
          perm: 'VIEW_REPORTS',
        },
        {
          href: `/${lang}/access`,
          icon: ShieldPlus,
          label: n.addAdmin ?? 'دەسەڵاتەکان',
          perm: 'VIEW_USERS',
        },
        {
          href: `/${lang}/settings`,
          icon: Settings,
          label: t.nav.settings,
          perm: null,
        },
      ],
    },
  ];

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (!navReady || !ready) return true;
        if (item.perm == null) return true;
        return can(item.perm);
      }),
    }))
    .filter((g) => g.items.length > 0);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${lang}/auth/login`);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-[4.5rem]' : 'w-[18rem]',
      )}
    >
      <div
        className={cn(
          'flex items-center h-16 px-3 gap-2',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {collapsed ? (
          <BrandLogo size={36} onDark iconOnly priority />
        ) : (
          <div className="flex min-w-0 items-center gap-2.5 flex-1">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <BrandLogo size={28} onDark iconOnly priority />
            </span>
            <div className="min-w-0">
              <p
                className="font-bold tracking-tight text-white leading-tight text-[13px]"
                suppressHydrationWarning
              >
                {(t.app as { shortName?: string }).shortName ?? 'Road Home ZMKH'}
              </p>
              <p className="text-[10px] text-white/45 truncate mt-0.5" suppressHydrationWarning>
                {t.app.tagline}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          aria-label={t.nav.toggleSidebar}
        >
          <Chevron className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="rh-scroll-sidebar flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {visibleGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && !collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(({ href, icon: Icon, label, exact }) => {
                const pathOnly = href.split('?')[0];
                const query = href.includes('?') ? href.split('?')[1] : '';
                const streamMatch = query.match(/stream=([^&]+)/)?.[1];
                const tabMatch = query.match(/tab=([^&]+)/)?.[1];
                const active = exact
                  ? pathname === pathOnly
                  : pathOnly === `/${lang}`
                    ? pathname === pathOnly
                    : streamMatch
                      ? pathname === pathOnly && currentStream === streamMatch
                      : tabMatch
                        ? pathname === pathOnly && currentTab === tabMatch
                        : pathOnly === `/${lang}/rentals`
                          ? pathname === pathOnly && !currentTab
                          : pathname.startsWith(`/${lang}/receipts`)
                            ? false
                            : pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-xl',
                      collapsed && 'justify-center px-2',
                      active
                        ? 'rh-nav-active'
                        : 'text-white/55 hover:bg-white/[0.07] hover:text-white/95',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/50')} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 pt-1">
        <button
          type="button"
          onClick={() => void logout()}
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm',
            'text-white/60 hover:bg-white/10 hover:text-white transition-colors',
            collapsed && 'justify-center',
          )}
          aria-label={t.nav.logout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t.nav.logout}</span>}
        </button>
      </div>
    </aside>
  );
}
