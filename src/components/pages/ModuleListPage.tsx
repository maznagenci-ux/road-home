import { PageHeader, EmptyState } from '@/components/ui/PageHeader';
import { requireAuth } from '@/lib/page-context';

export async function ModuleListPage({
  lang,
  title,
  addLabel,
  emptyMessage,
}: {
  lang: string;
  title: string;
  addLabel: string;
  emptyMessage: string;
}) {
  await requireAuth(lang);
  return (
    <div>
      <PageHeader title={title} addLabel={addLabel} />
      <EmptyState message={emptyMessage} />
    </div>
  );
}
