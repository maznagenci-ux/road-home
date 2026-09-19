import { requireGuest } from '@/lib/page-context';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { lang: paramLang } = await params;
  const { token = '' } = await searchParams;
  const { t, lang } = await requireGuest(paramLang);
  return <ResetPasswordForm lang={lang} t={t} token={token} />;
}
