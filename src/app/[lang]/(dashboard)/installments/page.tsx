import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/page-context';

/** Installments UI removed — business does not use installment payments. */
export default async function InstallmentsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { lang } = await requireAuth(paramLang);
  redirect(`/${lang}`);
}
