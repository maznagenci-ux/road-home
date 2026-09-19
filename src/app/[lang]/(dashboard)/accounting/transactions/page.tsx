import { requireAuth } from '@/lib/page-context';
import { TransactionsView } from '@/features/accounting/TransactionsView';

export default async function TransactionsAccountingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <TransactionsView t={t} lang={lang} />;
}
