import { requireAuth } from '@/lib/page-context';
import { ContractsListView } from '@/features/contracts/ContractsListView';

export default async function ContractsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { lang: paramLang } = await params;
  const { scope } = await searchParams;
  const { t, lang } = await requireAuth(paramLang);
  return <ContractsListView t={t} lang={lang} initialScope={scope ?? null} />;
}
