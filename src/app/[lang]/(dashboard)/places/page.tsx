import { requireAuth } from '@/lib/page-context';
import { PlacesView } from '@/features/places/PlacesView';

export default async function PlacesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <PlacesView t={t} lang={lang} />;
}
