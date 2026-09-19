'use client';

import { Bell, Menu, ChevronDown } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GlobalSearch } from './GlobalSearch';
import { ThemeToggle } from './ThemeToggle';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { Dictionary } from '@/i18n/dictionaries';
import type { SessionUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function Header({
  lang,
  t,
  user,
  onMenuClick,
}: {
  lang: string;
  t: Dictionary;
  user: SessionUser;
  onMenuClick?: () => void;
}) {
  return (
    <header
      className={cn(
        'h-16 shrink-0 flex items-center gap-3 px-4 md:px-6 lg:px-8',
        'border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85',
      )}
    >
      <button
        type="button"
        className="lg:hidden p-2 rounded-xl hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
        onClick={onMenuClick}
        aria-label={t.nav.menu}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2.5 shrink-0 lg:hidden">
        <BrandLogo size={32} iconOnly />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">
            {(t.app as { shortName?: string }).shortName ?? 'Road Home ZMKH'}
          </p>
        </div>
      </div>

      <div className="flex-1 flex justify-center px-2">
        <GlobalSearch t={t} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <LanguageSwitcher lang={lang} t={t} alwaysVisible />
        <ThemeToggle t={t} variant="icon" />

        <button
          type="button"
          className="relative p-2 rounded-full hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t.nav.notifications}
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-orange-400 ring-2 ring-background" />
        </button>

        <div className="hidden sm:flex items-center gap-2 rounded-full bg-card border border-border ps-1 pe-3 py-1 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-xs font-medium truncate max-w-[7rem]">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{t.dashboard.profile}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
