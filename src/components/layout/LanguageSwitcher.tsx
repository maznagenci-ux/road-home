'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocaleSwitch } from '@/hooks/useLocaleSwitch';
import { locales, localeLabels, isRTL, hasLocale } from '@/i18n/locale-config';
import type { Dictionary } from '@/i18n/dictionaries';

export function LanguageSwitcher({
  lang,
  t,
  className,
  alwaysVisible,
}: {
  lang: string;
  t: Dictionary;
  className?: string;
  alwaysVisible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { switchLocale } = useLocaleSwitch(lang);
  const current = hasLocale(lang) ? lang : 'ckb';
  const rtl = isRTL(current);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors',
          'border-border bg-card text-muted-foreground shadow-sm',
          'hover:border-primary/40 hover:text-foreground',
          alwaysVisible ? 'flex' : 'hidden sm:flex',
        )}
        aria-label={t.language.select}
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span className="font-medium">{localeLabels[current]}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 min-w-[9.5rem] rounded-2xl border py-1 z-50 shadow-xl',
            'bg-card border-border',
            rtl ? 'left-0' : 'right-0',
          )}
        >
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => {
                setOpen(false);
                void switchLocale(locale);
              }}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3.5 py-2 text-sm transition-colors',
                locale === current
                  ? 'text-foreground bg-primary/10'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span dir={isRTL(locale) ? 'rtl' : 'ltr'}>{localeLabels[locale]}</span>
              {locale === current && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
