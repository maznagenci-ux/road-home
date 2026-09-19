import { requireAuth } from '@/lib/page-context';
import { ReportsView } from '@/features/reports/ReportsView';

export default async function ReportsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <ReportsView t={t} lang={lang} />;
}
