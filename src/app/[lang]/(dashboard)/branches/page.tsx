import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/page-context';
import { isSuperAdmin } from '@/lib/access/permissions';
import { BranchesView } from '@/features/branches/BranchesView';

export default async function BranchesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang, session } = await requireAuth(paramLang);
  if (!isSuperAdmin(session.role)) redirect(`/${lang}`);
  return <BranchesView t={t} lang={lang} />;
}
