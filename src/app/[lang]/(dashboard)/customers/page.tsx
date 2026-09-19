import { requireAuth } from '@/lib/page-context';
import { CustomersView } from '@/features/customers/CustomersView';

export default async function CustomersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <CustomersView t={t} lang={lang} />;
}
