import { requireAuth } from '@/lib/page-context';
import { ProjectsListView } from '@/features/projects';

export default async function ProjectsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return <ProjectsListView t={t} lang={lang} />;
}
