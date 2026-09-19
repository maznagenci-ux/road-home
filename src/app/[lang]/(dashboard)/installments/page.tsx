import { requireAuth } from '@/lib/page-context';
import { InstallmentsView } from '@/features/installments/InstallmentsView';

export default async function InstallmentsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <InstallmentsView t={t} lang={lang} />;
}
