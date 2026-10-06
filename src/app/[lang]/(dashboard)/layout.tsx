import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { requireAuth } from '@/lib/page-context';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { LocaleSync } from '@/components/layout/LocaleSync';
import {
  getEffectivePermissions,
  isSuperAdmin,
  navPermissionForPath,
} from '@/lib/access/permissions';

/** First staff page the user may open (avoids redirect loops when home is forbidden). */
function firstAllowedPath(lang: string, perms: Record<string, boolean>): string {
  const candidates: { key: string; path: string }[] = [
    { key: 'VIEW_DASHBOARD', path: `/${lang}` },
    { key: 'VIEW_CONTRACTS', path: `/${lang}/contracts` },
    { key: 'VIEW_RECEIPTS', path: `/${lang}/receipts?stream=trading` },
    { key: 'VIEW_RENTALS', path: `/${lang}/rentals` },
    { key: 'VIEW_PROPERTIES', path: `/${lang}/houses` },
    { key: 'VIEW_ACCOUNTING', path: `/${lang}/accounting` },
    { key: 'VIEW_PROJECTS', path: `/${lang}/projects` },
    { key: 'VIEW_ANKET', path: `/${lang}/anket` },
    { key: 'VIEW_REPORTS', path: `/${lang}/reports` },
  ];
  for (const c of candidates) {
    if (perms[c.key]) return c.path;
  }
  return `/${lang}/auth/login`;
}

function samePath(a: string, b: string) {
  const norm = (p: string) => (p.split('?')[0] || '').replace(/\/$/, '') || '/';
  return norm(a) === norm(b);
}

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
  const base = `/${lang}`;
  const rest =
    pathname === base || pathname === `${base}/` ? '' : pathname.slice(base.length);

  const deny = (perms: Record<string, boolean>) => {
    const fallback = firstAllowedPath(lang, perms);
    if (samePath(pathname, fallback)) {
      redirect(`/${lang}/auth/login`);
    }
    redirect(fallback);
  };

  if (
    (rest.startsWith('/branches') || rest.startsWith('/support')) &&
    !isSuperAdmin(session.role)
  ) {
    const perms = await getEffectivePermissions(session.id, session.role);
    deny(perms);
  }

  const needed = navPermissionForPath(pathname, lang);
  if (needed) {
    const perms = await getEffectivePermissions(session.id, session.role);
    if (!perms[needed]) deny(perms);
  } else if (rest.startsWith('/receipts') && !isSuperAdmin(session.role)) {
    const perms = await getEffectivePermissions(session.id, session.role);
    if (!perms.VIEW_RECEIPTS && !perms.VIEW_CONTRACTS && !perms.VIEW_RENTALS) {
      deny(perms);
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
