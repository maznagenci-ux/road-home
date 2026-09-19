import { requireAuth } from '@/lib/page-context';
import { PartyCrudView } from '@/features/parties/PartyCrudView';

export default async function SuppliersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const { t } = await requireAuth(lang);
  return (
    <PartyCrudView
      t={t}
      apiPath="/api/suppliers"
      title={t.pages.suppliers.title}
      addLabel={t.pages.suppliers.add}
      emptyMessage={t.pages.suppliers.empty}
    />
  );
}
