'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import {
  isRTL,
  localeHtmlLang,
  type Locale,
} from '@/i18n/locale-config';
import { loadClientDictionary } from '@/i18n/client-dictionaries';

type I18nContextValue = {
  locale: Locale;
  t: Dictionary;
  isPending: boolean;
  setLocaleData: (locale: Locale, dictionary: Dictionary) => void;
  switchLocaleSoft: (locale: Locale) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale: initialLocale,
  dictionary: initialDictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const [t, setT] = useState(initialDictionary);
  const [isPending, startTransition] = useTransition();

  const applyDomDirection = useCallback((next: Locale) => {
    document.documentElement.lang = localeHtmlLang[next];
    document.documentElement.dir = isRTL(next) ? 'rtl' : 'ltr';
  }, []);

  const setLocaleData = useCallback(
    (next: Locale, dictionary: Dictionary) => {
      startTransition(() => {
        setLocale(next);
        setT(dictionary);
      });
      applyDomDirection(next);
    },
    [applyDomDirection],
  );

  const switchLocaleSoft = useCallback(
    async (next: Locale) => {
      if (next === locale) return;
      const dictionary = await loadClientDictionary(next);
      setLocaleData(next, dictionary);
    },
    [locale, setLocaleData],
  );

  const value = useMemo(
    () => ({ locale, t, isPending, setLocaleData, switchLocaleSoft }),
    [locale, t, isPending, setLocaleData, switchLocaleSoft],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}
