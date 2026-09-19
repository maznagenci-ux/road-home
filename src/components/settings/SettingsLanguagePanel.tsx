'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocaleSwitch } from '@/hooks/useLocaleSwitch';
import { locales, localeLabels, isRTL, type Locale } from '@/i18n/locale-config';
import type { Dictionary } from '@/i18n/dictionaries';

export function SettingsLanguagePanel({
  lang,
  t,
}: {
  lang: Locale;
  t: Dictionary;
}) {
  const { switchLocale } = useLocaleSwitch(lang);
  const [saved, setSaved] = useState(false);

  const select = async (locale: Locale) => {
    await switchLocale(locale);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-1">{t.pages.settings.language}</h2>
      <p className="text-sm text-muted-foreground mb-5">{t.pages.settings.languageDesc}</p>

      <div className="space-y-2">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => void select(locale)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors',
              locale === lang
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border hover:border-primary/30 text-muted-foreground',
            )}
          >
            <span dir={isRTL(locale) ? 'rtl' : 'ltr'}>{localeLabels[locale]}</span>
            {locale === lang && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>

      {saved && <p className="mt-3 text-sm text-primary">{t.language.saved}</p>}
    </div>
  );
}
