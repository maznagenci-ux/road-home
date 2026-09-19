'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type ThemeMode = 'light' | 'dark' | 'system';

export function ThemeToggle({
  t,
  variant = 'icon',
}: {
  t: Dictionary;
  variant?: 'icon' | 'panel';
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          variant === 'icon' ? 'h-9 w-9 rounded-full border border-border bg-card' : 'h-24 rounded-2xl border border-border bg-card',
        )}
        aria-hidden
      />
    );
  }

  const current = (theme as ThemeMode) || 'system';
  const isDark = resolvedTheme === 'dark';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shadow-sm"
        aria-label={isDark ? t.pages.settings.themeLight : t.pages.settings.themeDark}
        title={isDark ? t.pages.settings.themeLight : t.pages.settings.themeDark}
      >
        {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>
    );
  }

  const options: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: t.pages.settings.themeLight, icon: Sun },
    { id: 'dark', label: t.pages.settings.themeDark, icon: Moon },
    { id: 'system', label: t.pages.settings.themeSystem, icon: Monitor },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(({ id, label, icon: Icon }) => {
        const active = current === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-xs font-medium transition-colors',
              active
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
