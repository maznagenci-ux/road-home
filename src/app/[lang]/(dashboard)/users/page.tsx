import { redirect } from 'next/navigation';

export default async function UsersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${lang}/access`);
}
