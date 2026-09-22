'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { isRTL } from '@/i18n/locale-config';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';

type Step = 'phone' | 'reset';

export function ForgotPasswordForm({ lang, t }: { lang: Locale; t: Dictionary }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [done, setDone] = useState(false);
  const rtl = isRTL(lang);
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const field =
    'w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

  const sendCode = async () => {
    setError('');
    if (!phone) {
      setError(t.auth.errors.required);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { error?: string; devCode?: string };
      if (res.status === 429) {
        setError(t.auth.errors.otpTooSoon ?? 'چاوەڕوان بە کەمێک');
        return;
      }
      if (!res.ok) {
        if (data.error === 'INVALID_PHONE') setError(t.auth.errors.invalidPhone);
        else if (data.error === 'OTP_SEND_FAILED')
          setError(t.auth.errors.otpSendFailed ?? t.auth.errors.server);
        else setError(t.common.error);
        return;
      }
      setDevCode(typeof data.devCode === 'string' ? data.devCode : '');
      setStep('reset');
      setCode('');
    } catch {
      setError(t.auth.errors.server);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    if (!phone || !code || !password || !confirm) {
      setError(t.auth.errors.required);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.errors.passwordShort);
      return;
    }
    if (password !== confirm) {
      setError(t.auth.errors.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (data.error === 'EXPIRED') setError(t.auth.errors.otpInvalid ?? t.auth.errors.invalidToken);
        else if (data.error === 'INVALID') setError(t.auth.errors.otpInvalid ?? t.auth.errors.invalid);
        else if (data.error === 'TOO_MANY') setError(t.auth.errors.otpInvalid ?? t.common.error);
        else setError(t.common.error);
        return;
      }
      setDone(true);
      window.setTimeout(() => router.push(`/${lang}/auth/login`), 1600);
    } catch {
      setError(t.auth.errors.server);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'phone') await sendCode();
    else await resetPassword();
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
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {step === 'phone'
              ? (t.auth.forgotSubtitleWhatsapp ?? t.auth.forgotSubtitle)
              : (t.auth.forgotEnterCodeHint ?? t.auth.resetSubtitle)}
          </p>

          {done ? (
            <p className="mt-6 text-sm text-primary bg-primary/10 rounded-xl px-3 py-2.5">
              {t.auth.resetSuccess}
            </p>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-1.5">
                  {t.auth.phone}
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="07"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={field}
                  autoComplete="tel"
                  dir="ltr"
                  required
                  disabled={step === 'reset'}
                />
              </div>

              {step === 'reset' ? (
                <>
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-muted-foreground mb-1.5">
                      {t.auth.otpCodeWhatsapp ?? t.auth.otpCode ?? 'کۆدی واتساپ'}
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="1234"
                      maxLength={4}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className={field}
                      autoComplete="one-time-code"
                      dir="ltr"
                      autoFocus
                      required
                    />
                    {devCode ? (
                      <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                        Dev OTP: <span className="font-mono font-semibold" dir="ltr">{devCode}</span>
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setCode('');
                        setPassword('');
                        setConfirm('');
                        setDevCode('');
                        setError('');
                      }}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      {t.auth.changePhone ?? 'گۆڕینی ژمارە'}
                    </button>
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
                      {t.auth.newPasswordLabel}
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={field}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-muted-foreground mb-1.5">
                      {t.auth.confirmPassword}
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={field}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </>
              ) : null}

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
                {loading
                  ? t.common.loading
                  : step === 'phone'
                    ? (t.auth.sendWhatsappCode ?? t.auth.sendOtp ?? 'ناردنی کۆد بۆ واتساپ')
                    : t.auth.resetSubmit}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
