import { requireAuth } from '@/lib/page-context';
import { StatementsHubView } from '@/features/accounting/StatementsHubView';

export default async function StatementsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <StatementsHubView t={t} lang={lang} />;
}
