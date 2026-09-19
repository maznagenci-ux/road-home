import { requireGuest } from '@/lib/page-context';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireGuest(paramLang);
  return <ForgotPasswordForm lang={lang} t={t} />;
}
