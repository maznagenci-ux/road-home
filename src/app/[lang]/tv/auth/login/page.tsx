import { redirect } from 'next/navigation';
import { normalizeLocale, hasLocale } from '@/i18n/locale-config';

/** TV login is unused — public map only. */
export default async function TvLoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const locale = normalizeLocale(paramLang);
  if (!hasLocale(paramLang) && paramLang !== 'ku') redirect('/ckb/tv');
  redirect(`/${locale}/tv`);
}
