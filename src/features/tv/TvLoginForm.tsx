'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';
import { TvKeypad } from './TvKeypad';

type Field = 'phone' | 'password';

/** TV-only login — same /api/auth/login; remote keypad, no mouse required. */
export function TvLoginForm({ lang, t }: { lang: Locale; t: Dictionary }) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [field, setField] = useState<Field>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const applyDigit = (d: string) => {
    if (field === 'phone') {
      setPhone((p) => (p + d).slice(0, 11));
    } else {
      setPassword((p) => (p + d).slice(0, 32));
    }
  };

  const applyDelete = () => {
    if (field === 'phone') setPhone((p) => p.slice(0, -1));
    else setPassword((p) => p.slice(0, -1));
  };

  const applyClear = () => {
    if (field === 'phone') setPhone('');
    else setPassword('');
  };

  const submit = async () => {
    setError('');
    if (!phone || !password) {
      setError(t.auth.errors.required);
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
        setError(t.auth.errors.invalid);
        return;
      }
      const userLocale = data.user?.locale ?? lang;
      router.replace(`/${userLocale}/tv`);
      router.refresh();
    } catch {
      setError(t.auth.errors.server);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rh-tv-login-layout">
      <div className="rh-tv-login rh-tv-card">
        <p className="rh-tv-login-hint">ریمووت: ژمارەکان · OK بۆ هەڵبژاردن · Back</p>

        <button
          type="button"
          className={`rh-tv-field-btn${field === 'phone' ? ' rh-tv-field-btn-active' : ''}`}
          data-tv-focus
          onClick={() => setField('phone')}
        >
          <span className="rh-tv-field-label">{t.auth.phone}</span>
          <span className="rh-tv-field-value">{phone || '07…'}</span>
        </button>

        <button
          type="button"
          className={`rh-tv-field-btn${field === 'password' ? ' rh-tv-field-btn-active' : ''}`}
          data-tv-focus
          onClick={() => setField('password')}
        >
          <span className="rh-tv-field-label">{t.auth.password}</span>
          <span className="rh-tv-field-value">
            {password ? '•'.repeat(Math.min(password.length, 16)) : '••••'}
          </span>
        </button>

        {error ? <p className="rh-tv-error">{error}</p> : null}

        <div className="rh-tv-actions">
          <button
            type="button"
            className="rh-tv-btn"
            data-tv-focus
            onClick={() => setField(field === 'phone' ? 'password' : 'phone')}
          >
            {field === 'phone' ? t.auth.password : t.auth.phone}
          </button>
          <button
            type="button"
            className="rh-tv-btn rh-tv-btn-primary"
            data-tv-focus
            disabled={loading}
            onClick={() => void submit()}
          >
            {loading ? t.common.loading : t.auth.login}
          </button>
        </div>
      </div>

      <TvKeypad onDigit={applyDigit} onDelete={applyDelete} onClear={applyClear} />
    </div>
  );
}
