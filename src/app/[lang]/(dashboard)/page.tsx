import { requireAuth } from '@/lib/page-context';
import { DashboardView } from '@/features/dashboard';
import { getDashboardData } from '@/lib/finance/dashboard-data';

export default async function DashboardPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  const { metrics, activity, installments, costCenters, audit } = await getDashboardData();

  return (
    <DashboardView
      t={t}
      locale={lang}
      metrics={metrics}
      activity={activity}
      installments={installments}
      costCenters={costCenters}
      audit={audit}
    />
  );
}
