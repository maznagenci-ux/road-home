'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PropertyShowcase } from '@/components/auth/PropertyShowcase';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useT } from '@/i18n/I18nProvider';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';

const BRAND_NAME = 'Mazn Agency';
const BRAND_URL =
  'https://www.facebook.com/profile.php?id=61590509712166&mibextid=wwXIfr';

function DeveloperCreditLine({
  prefix,
  name = BRAND_NAME,
}: {
  prefix: string;
  name?: string;
}) {
  return (
    <p className="text-[12px] tracking-tight text-muted-foreground">
      {prefix}{' '}
      <a
        href={BRAND_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary hover:underline underline-offset-2 transition-opacity hover:opacity-90"
      >
        {name}
      </a>
    </p>
  );
}

export function LoginForm({ lang: initialLang, t: initialT }: { lang: Locale; t: Dictionary }) {
  const router = useRouter();
  const { t, locale } = useT();
  const lang = locale || initialLang;
  const dict = t ?? initialT;

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const creditPrefix = dict.auth.developerCreditPrefix || 'دیزاین و گەشەپێدان لەلایەن';
  const creditName = dict.auth.developerName || BRAND_NAME;
  const fieldClass =
    'w-full px-3.5 py-3 rounded-xl border border-border bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone || !password) {
      setError(dict.auth.errors.required);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data.error === 'string' ? data.error : '';
        if (code === 'DATABASE_UNREACHABLE' || code === 'DATABASE_AUTH') {
          setError(dict.auth.errors.server);
        } else {
          setError(dict.auth.errors.invalid);
        }
        return;
      }
      const userLocale = data.user?.locale ?? lang;
      router.replace(`/${userLocale}`);
      router.refresh();
    } catch {
      setError(dict.auth.errors.server);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background">
      <div className="relative lg:col-span-7 min-h-[38vh] lg:min-h-screen order-1 lg:order-none">
        <PropertyShowcase
          developerCreditPrefix={creditPrefix}
          developerName={creditName}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      <div className="relative lg:col-span-5 flex flex-col min-h-[62vh] lg:min-h-screen order-2">
        <div className="absolute top-4 end-4 sm:top-6 sm:end-6 flex items-center gap-2 z-10">
          <ThemeToggle t={dict} variant="icon" />
          <LanguageSwitcher lang={lang} t={dict} alwaysVisible />
        </div>

        <div className="flex-1 flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8 flex flex-col items-center text-center">
              <BrandLogo size={128} priority className="mb-5" />
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {dict.auth.login}
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm">
                {dict.auth.loginSubtitle}
              </p>
            </div>

            <form
              onSubmit={(e) => void submit(e)}
              className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm space-y-4"
            >
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-1.5">
                  {dict.auth.phone}
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="07501234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\u0660-\u0669\u06f0-\u06f9]/g, ''))}
                  className={fieldClass}
                  autoComplete="tel"
                  enterKeyHint="next"
                  dir="ltr"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {dict.auth.phoneHint ?? 'تەنها ژمارەی مۆبایل — وەک 0750xxxxxxx (ئیمەیڵ نا)'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                    {dict.auth.password}
                  </label>
                  <Link
                    href={`/${lang}/auth/forgot-password`}
                    className="text-xs font-medium text-primary hover:underline underline-offset-2"
                  >
                    {dict.auth.forgotPassword}
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-2 rounded-xl">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-12 py-3 rounded-xl text-base sm:text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-sm"
              >
                {loading ? dict.common.loading : dict.auth.loginButton}
              </button>
            </form>

            <div className="mt-6 space-y-1 text-center">
              <p className="text-[11px] text-muted-foreground">{dict.app.tagline}</p>
              <p className="text-[11px] text-muted-foreground/80">
                © {new Date().getFullYear()} {dict.app.name}. {dict.auth.rightsReserved}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-5 py-3.5 text-center">
          <DeveloperCreditLine prefix={creditPrefix} name={creditName} />
        </div>
      </div>
    </div>
  );
}
