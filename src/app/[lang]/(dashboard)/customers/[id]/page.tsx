import { requireAuth } from '@/lib/page-context';
import { CustomerProfileView } from '@/features/customers/CustomerProfileView';

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang: paramLang, id } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <CustomerProfileView t={t} lang={lang} id={id} />;
}
