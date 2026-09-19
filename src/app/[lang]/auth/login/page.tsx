import { requireGuest } from '@/lib/page-context';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireGuest(paramLang);
  return <LoginForm lang={lang} t={t} />;
}
