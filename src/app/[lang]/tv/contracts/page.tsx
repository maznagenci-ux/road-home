import { redirect } from 'next/navigation';
import { getTvPublicPage } from '@/features/tv/tv-auth';

/** Legacy TV routes → public map home. */
export default async function TvContractsRedirect({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { lang } = await getTvPublicPage(paramLang);
  redirect(`/${lang}/tv`);
}
