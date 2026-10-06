import { getTvPublicPage } from '@/features/tv/tv-auth';
import { TvShell } from '@/features/tv/TvShell';
import { TvMapPanel } from '@/features/tv/TvMapPanel';

/** TV = public fullscreen map only. */
export default async function TvHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { t, lang } = await getTvPublicPage(paramLang);

  return (
    <TvShell title="" subtitle="" lang={lang} showBack={false} minimal>
      <TvMapPanel t={t} lang={lang} />
    </TvShell>
  );
}
