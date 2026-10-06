'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
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
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const logout = async () => {
    setProfileOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${lang}/auth/login`);
  };

  const roleLabels = (t as { roles?: Record<string, string> }).roles ?? {};
  const roleLabel = roleLabels[user.role] ?? user.role;

  return (
    <header
      className={cn(
        'relative z-[100] h-16 shrink-0 flex items-center gap-3 px-4 md:px-6 lg:px-8',
        'border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85',
      )}
    >
      <button
        type="button"
        className="rh-header-tap lg:hidden inline-flex items-center justify-center p-2 rounded-xl hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
        onClick={onMenuClick}
        aria-label={t.nav.menu}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2.5 shrink-0 lg:hidden">
        <BrandLogo size={32} iconOnly />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">
            {(t.app as { shortName?: string }).shortName ?? 'ZMKH Road Home'}
          </p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 shrink-0">
        <LanguageSwitcher lang={lang} t={t} alwaysVisible />
        <ThemeToggle t={t} variant="icon" />

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full bg-card border border-border ps-1 pe-2.5 py-1 shadow-sm hover:border-primary/40 transition-colors"
            aria-expanded={profileOpen}
            aria-label={t.dashboard.profile}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="leading-tight min-w-0 hidden sm:block text-start">
              <p className="text-xs font-medium truncate max-w-[7rem]">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
            </div>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform',
                profileOpen && 'rotate-180',
              )}
            />
          </button>
          {profileOpen ? (
            <div className="absolute end-0 z-[120] mt-2 w-52 rounded-2xl border border-border bg-card shadow-xl p-1.5">
              <div className="px-2.5 py-2 border-b border-border mb-1">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground dir-ltr truncate" dir="ltr">
                  {user.phone}
                </p>
              </div>
              <Link
                href={`/${lang}/settings`}
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground hover:bg-muted"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                {t.dashboard.profile}
              </Link>
              <Link
                href={`/${lang}/settings`}
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                {t.nav.settings}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-rose-600 hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                {t.nav.logout}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
