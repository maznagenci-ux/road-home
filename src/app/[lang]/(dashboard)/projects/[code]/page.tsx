import { requireAuth } from '@/lib/page-context';
import { ProjectProfileClient } from '@/features/projects';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ lang: string; code: string }>;
}) {
  const { lang: paramLang, code } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <ProjectProfileClient t={t} lang={lang} code={decodeURIComponent(code)} />;
}
