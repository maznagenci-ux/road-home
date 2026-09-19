import { requireAuth } from '@/lib/page-context';
import { PropertiesCrudView } from '@/features/properties/PropertiesCrudView';

export default async function PropertiesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const { t } = await requireAuth(lang);
  return <PropertiesCrudView t={t} />;
}
