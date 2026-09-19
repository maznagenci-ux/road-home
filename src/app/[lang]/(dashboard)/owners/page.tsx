import { requireAuth } from '@/lib/page-context';
import { PartyCrudView } from '@/features/parties/PartyCrudView';

export default async function OwnersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const { t } = await requireAuth(lang);
  return (
    <PartyCrudView
      t={t}
      apiPath="/api/owners"
      title={t.pages.owners.title}
      addLabel={t.pages.owners.add}
      emptyMessage={t.pages.owners.empty}
    />
  );
}
