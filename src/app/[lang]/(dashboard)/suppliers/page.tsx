import { requireAuth } from '@/lib/page-context';
import { MaterialPurchasesView } from '@/features/material-purchases';

export default async function SuppliersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const { t } = await requireAuth(lang);
  return <MaterialPurchasesView t={t} lang={lang} />;
}
