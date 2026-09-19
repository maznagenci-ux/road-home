import { requireAuth } from '@/lib/page-context';
import { HousesCrudView } from '@/features/houses/HousesCrudView';

export default async function HousesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <HousesCrudView t={t} lang={lang} />;
}
