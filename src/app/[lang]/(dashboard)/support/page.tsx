import { requireAuth } from '@/lib/page-context';
import { SupportView } from '@/features/support/SupportView';

export default async function SupportPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <SupportView t={t} lang={lang} />;
}
