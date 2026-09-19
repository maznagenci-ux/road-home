import { requireAuth } from '@/lib/page-context';
import { CashAccountsView } from '@/features/accounting/CashAccountsView';

export default async function CashAccountingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <CashAccountsView t={t} lang={lang} />;
}
