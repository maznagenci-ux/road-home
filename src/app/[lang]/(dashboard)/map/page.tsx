import { requireAuth } from '@/lib/page-context';
import { MapView } from '@/features/map/MapView';

export default async function MapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <MapView t={t} lang={lang} />;
}
