import { redirect } from 'next/navigation';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, normalizeLocale } from '@/i18n/locale-config';

/**
 * Public TV page context — no session / no login redirect.
 * Desktop auth helpers stay untouched.
 */
export async function getTvPublicPage(lang: string) {
  const locale = normalizeLocale(lang);
  if (!hasLocale(lang) && lang !== 'ku') redirect('/ckb/tv');
  const t = await getDictionary(locale);
  return { t, lang: locale };
}

/** @deprecated Prefer getTvPublicPage — TV is public map-only. */
export async function requireTvAuth(lang: string) {
  return getTvPublicPage(lang);
}

/** TV login route is unused; send everyone to the map. */
export async function requireTvGuest(lang: string) {
  const locale = normalizeLocale(lang);
  if (!hasLocale(lang) && lang !== 'ku') redirect('/ckb/tv');
  redirect(`/${locale}/tv`);
}
