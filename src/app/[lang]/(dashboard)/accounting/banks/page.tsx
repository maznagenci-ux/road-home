import { redirect } from 'next/navigation';

/** Bank module removed from product UI — send users to cash. */
export default async function BanksAccountingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/accounting/cash`);
}
