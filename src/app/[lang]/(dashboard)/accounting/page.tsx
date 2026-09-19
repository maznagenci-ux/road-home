import { requireAuth } from '@/lib/page-context';
import { SimpleReportView } from '@/features/accounting/SimpleReportView';

export default async function AccountingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <SimpleReportView t={t} lang={lang} />;
}
