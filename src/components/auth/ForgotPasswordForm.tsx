'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { isRTL } from '@/i18n/locale-config';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';

export function ForgotPasswordForm({ lang, t }: { lang: Locale; t: Dictionary }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const rtl = isRTL(lang);
  const BackIcon = rtl ? ArrowRight : ArrowLeft;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError(t.auth.errors.required);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale: lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t.common.error);
        return;
      }
      setDone(true);
      if (typeof data.resetUrl === 'string') setResetUrl(data.resetUrl);
    } catch {
      setError(t.auth.errors.server);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <ThemeToggle t={t} variant="icon" />
        <LanguageSwitcher lang={lang} t={t} alwaysVisible />
      </div>

      <div className="w-full max-w-md">
        <Link
          href={`/${lang}/auth/login`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <BackIcon className="h-4 w-4" />
          {t.auth.backToLogin}
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-5">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.auth.forgotTitle}</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t.auth.forgotSubtitle}</p>

          {done ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-primary bg-primary/10 rounded-xl px-3 py-2.5 leading-relaxed">
                {t.auth.forgotSent}
              </p>
              {resetUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t.auth.forgotLinkHint}</p>
                  <a
                    href={resetUrl}
                    className="block break-all text-sm font-medium text-primary hover:underline rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5"
                  >
                    {t.auth.resetPassword}
                  </a>
                </div>
              )}
              <Link
                href={`/${lang}/auth/login`}
                className="inline-flex w-full justify-center py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted"
              >
                {t.auth.backToLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">
                  {t.auth.email}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoComplete="email"
                  required
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
                className="w-full py-2.5 rounded-xl text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-sm"
              >
                {loading ? t.common.loading : t.auth.forgotSubmit}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
