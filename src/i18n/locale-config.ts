/** App locales — Central Kurdish Sorani uses BCP-47 `ckb`. */
export type Locale = 'ckb' | 'ar' | 'en';

/** Prisma / JWT still store legacy `ku` for Sorani. */
export type DbLocale = 'ku' | 'ar' | 'en';

export const locales: Locale[] = ['ckb', 'ar', 'en'];
export const defaultLocale: Locale = 'ckb';

export const localeLabels: Record<Locale, string> = {
  ckb: 'کوردی',
  ar: 'العربية',
  en: 'English',
};

export const localeHtmlLang: Record<Locale, string> = {
  ckb: 'ckb',
  ar: 'ar',
  en: 'en',
};

export function hasLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function isRTL(locale: Locale | string): boolean {
  return locale === 'ckb' || locale === 'ar' || locale === 'ku';
}

/** Normalize URL/path aliases (`ku` → `ckb`). */
export function normalizeLocale(value: string | undefined | null): Locale {
  if (!value) return defaultLocale;
  if (value === 'ku') return 'ckb';
  if (hasLocale(value)) return value;
  return defaultLocale;
}

export function localeFromUser(value: string | undefined | null): Locale {
  return normalizeLocale(value);
}

export function toDbLocale(locale: Locale): DbLocale {
  return locale === 'ckb' ? 'ku' : locale;
}

export function fromDbLocale(value: string | undefined | null): Locale {
  return normalizeLocale(value);
}
