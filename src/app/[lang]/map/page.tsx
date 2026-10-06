import { getSession } from '@/lib/auth';
import { getDictionary } from '@/i18n/dictionaries';
import { fromDbLocale, normalizeLocale } from '@/i18n/locale-config';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { LocaleSync } from '@/components/layout/LocaleSync';
import { PublicMapClient } from '@/features/map/PublicMapClient';
import { getPageContext } from '@/lib/page-context';

/**
 * Staff → full dashboard map (complete plot list + PDF).
 * Guest → same MapView without edit tools (login land browser).
 */
export default async function MapPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const locale = normalizeLocale(paramLang);
  const session = await getSession();
  const t = await getDictionary(locale);

  if (session) {
    const user = { ...session, locale: fromDbLocale(session.locale) };
    return (
      <>
        <LocaleSync lang={locale} userLocale={user.locale} />
        <DashboardShell lang={locale} t={t} user={user}>
          <PublicMapClient t={t} lang={locale} guestMode={false} />
        </DashboardShell>
      </>
    );
  }

  const { t: dict, lang } = await getPageContext(paramLang);
  return <PublicMapClient t={dict} lang={lang} guestMode />;
}
