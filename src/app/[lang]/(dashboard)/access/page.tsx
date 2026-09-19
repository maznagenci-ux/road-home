import { requireAuth } from '@/lib/page-context';
import { AccessControlView } from '@/features/access';

export default async function AccessPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <AccessControlView t={t} lang={lang} />;
}
