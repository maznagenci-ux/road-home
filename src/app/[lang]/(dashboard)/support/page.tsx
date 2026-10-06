import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/page-context';
import { isSuperAdmin } from '@/lib/access/permissions';
import { SupportView } from '@/features/support/SupportView';

export default async function SupportPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang, session } = await requireAuth(paramLang);
  if (!isSuperAdmin(session.role)) redirect(`/${lang}`);
  return <SupportView t={t} lang={lang} />;
}
