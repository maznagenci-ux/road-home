import { requireAuth } from '@/lib/page-context';
import { AccountingLedgerView } from '@/features/accounting/AccountingLedgerView';

export default async function ConstructionWithdrawPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return (
    <AccountingLedgerView
      t={t}
      lang={lang}
      stream="construction"
      kind="expense"
      title={t.nav.moneyWithdraw}
    />
  );
}
