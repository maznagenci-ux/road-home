'use client';

import { useCallback, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { hasLocale, type Locale } from '@/i18n/locale-config';
import { useT } from '@/i18n/I18nProvider';
import { useUiStore } from '@/stores/ui-store';

/**
 * Soft locale switch: swaps dictionary + dir in-place (no full reload),
 * then replaces the URL locale segment for deep-link consistency.
 */
export function useLocaleSwitch(currentLang: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { switchLocaleSoft } = useT();
  const setStoreLocale = useUiStore((s) => s.setLocale);
  const [, startTransition] = useTransition();

  const switchLocale = useCallback(
    async (newLocale: Locale) => {
      if (newLocale === currentLang || !hasLocale(newLocale)) return;

      await switchLocaleSoft(newLocale);
      setStoreLocale(newLocale);

      const withoutLocale = pathname.replace(`/${currentLang}`, '') || '/';
      startTransition(() => {
        router.replace(`/${newLocale}${withoutLocale}`);
      });

      try {
        await fetch('/api/auth/locale', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: newLocale }),
        });
      } catch {
        // Soft UI switch still applies even if persistence fails
      }
    },
    [currentLang, pathname, router, setStoreLocale, switchLocaleSoft],
  );

  return { switchLocale };
}
