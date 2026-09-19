import { requireAuth } from '@/lib/page-context';
import { OfficeExpensesView } from '@/features/office/OfficeExpensesView';

export default async function OfficeExpensesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <OfficeExpensesView t={t} lang={lang} />;
}
