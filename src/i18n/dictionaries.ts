import 'server-only';
import {
  type Locale,
  hasLocale,
  isRTL,
  locales,
  defaultLocale,
  normalizeLocale,
} from './locale-config';

export type { Locale };
export { hasLocale, isRTL, locales, defaultLocale, normalizeLocale };

const dictionaries = {
  ckb: () => import('../../messages/ckb.json').then((m) => m.default),
  ar: () => import('../../messages/ar.json').then((m) => m.default),
  en: () => import('../../messages/en.json').then((m) => m.default),
};

export async function getDictionary(locale: Locale | string) {
  const key = normalizeLocale(locale);
  return dictionaries[key]();
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
