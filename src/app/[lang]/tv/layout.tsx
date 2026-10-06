import { TvClientRoot } from '@/features/tv/TvClientRoot';

export default async function TvLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return <TvClientRoot lang={lang}>{children}</TvClientRoot>;
}
