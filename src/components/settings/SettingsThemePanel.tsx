'use client';

import { ThemeToggle } from '@/components/layout/ThemeToggle';
import type { Dictionary } from '@/i18n/dictionaries';

export function SettingsThemePanel({ t }: { t: Dictionary }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-1">{t.pages.settings.theme}</h2>
      <p className="text-sm text-muted-foreground mb-5">{t.pages.settings.themeDesc}</p>
      <ThemeToggle t={t} variant="panel" />
    </div>
  );
}
