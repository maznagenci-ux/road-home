import { requireAuth } from '@/lib/page-context';
import { AccountingLedgerView } from '@/features/accounting/AccountingLedgerView';

export default async function AccountingRentalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return (
    <AccountingLedgerView t={t} lang={lang} stream="rental" kind="income" title={t.nav.rentalIncome} />
  );
}
