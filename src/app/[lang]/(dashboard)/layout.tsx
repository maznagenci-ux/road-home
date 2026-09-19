import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { requireAuth } from '@/lib/page-context';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { LocaleSync } from '@/components/layout/LocaleSync';
import {
  getEffectivePermissions,
  navPermissionForPath,
} from '@/lib/access/permissions';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { session, t } = await requireAuth(lang);

  const pathname = (await headers()).get('x-pathname') ?? `/${lang}`;
  const needed = navPermissionForPath(pathname, lang);
  if (needed) {
    const perms = await getEffectivePermissions(session.id, session.role);
    if (!perms[needed]) {
      redirect(`/${lang}`);
    }
  }

  return (
    <>
      <LocaleSync lang={lang} userLocale={session.locale} />
      <DashboardShell lang={lang} t={t} user={session}>
        {children}
      </DashboardShell>
    </>
  );
}
