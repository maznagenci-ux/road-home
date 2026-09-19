import { requireAuth } from '@/lib/page-context';
import { AnketView } from '@/features/anket/AnketView';

export default async function AnketPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <AnketView t={t} lang={lang} />;
}
