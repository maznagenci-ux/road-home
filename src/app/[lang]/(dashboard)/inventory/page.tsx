import { requireAuth } from '@/lib/page-context';
import { InventoryView } from '@/features/inventory/InventoryView';

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <InventoryView t={t} lang={lang} />;
}
