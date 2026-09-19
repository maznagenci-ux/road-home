import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDictionary } from '@/i18n/dictionaries';
import {
  hasLocale,
  normalizeLocale,
  fromDbLocale,
  type Locale,
} from '@/i18n/locale-config';

export async function requireAuth(lang: string) {
  const locale = normalizeLocale(lang);
  if (!hasLocale(lang) && lang !== 'ku') redirect('/ckb');
  const session = await getSession();
  if (!session) redirect(`/${locale}/auth/login`);
  const t = await getDictionary(locale);
  return {
    session: { ...session, locale: fromDbLocale(session.locale) },
    t,
    lang: locale,
  };
}

export async function requireGuest(lang: string) {
  const locale = normalizeLocale(lang);
  if (!hasLocale(lang) && lang !== 'ku') redirect('/ckb');
  const session = await getSession();
  if (session) redirect(`/${fromDbLocale(session.locale)}`);
  const t = await getDictionary(locale);
  return { t, lang: locale };
}

export async function getPageContext(lang: string) {
  const locale = normalizeLocale(lang);
  if (!hasLocale(lang) && lang !== 'ku') redirect('/ckb');
  const t = await getDictionary(locale);
  return { t, lang: locale as Locale };
}
