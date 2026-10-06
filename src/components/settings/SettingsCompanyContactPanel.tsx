'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Save } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';

type CompanyItem = {
  address?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  phone4?: string;
};

export function SettingsCompanyContactPanel({ t }: { t: Dictionary }) {
  const s = t.pages.settings as Record<string, string>;
  const [address, setAddress] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [phone3, setPhone3] = useState('');
  const [phone4, setPhone4] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  const applyItem = (item: CompanyItem) => {
    setAddress(item.address ?? '');
    setPhone1(item.phone1 ?? '');
    setPhone2(item.phone2 ?? '');
    setPhone3(item.phone3 ?? '');
    setPhone4(item.phone4 ?? '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/settings/company');
    if (res.status === 403) {
      setError(s.companyForbidden ?? 'تەنها سوپەر ئەدمین');
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(t.common.error);
      setLoading(false);
      return;
    }
    const data = await res.json();
    applyItem((data.item ?? {}) as CompanyItem);
    setLoading(false);
  }, [s.companyForbidden, t.common.error]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    const res = await fetch('/api/settings/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: address.trim(),
        phone1: phone1.trim(),
        phone2: phone2.trim(),
        phone3: phone3.trim(),
        phone4: phone4.trim(),
      }),
    });
    setBusy(false);
    if (res.status === 403) {
      setError(s.companyForbidden ?? 'تەنها سوپەر ئەدمین');
      return;
    }
    if (!res.ok) {
      setError(s.companySaveError ?? t.common.error);
      return;
    }
    const data = await res.json();
    applyItem((data.item ?? {}) as CompanyItem);
    setOk(s.companySaved ?? 'پاشەکەوت کرا — لە وەسڵ و گرێبەست دەردەکەوێت');
  };

  const phoneFields = [
    { key: '1', label: s.companyPhone1 ?? 'مۆبایل ١', value: phone1, set: setPhone1, required: true },
    { key: '2', label: s.companyPhone2 ?? 'مۆبایل ٢', value: phone2, set: setPhone2, required: false },
    { key: '3', label: s.companyPhone3 ?? 'مۆبایل ٣', value: phone3, set: setPhone3, required: false },
    { key: '4', label: s.companyPhone4 ?? 'مۆبایل ٤', value: phone4, set: setPhone4, required: false },
  ] as const;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2" dir="rtl">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {s.companyTitle ?? 'ناونیشان و مۆبایل (وەسڵ / گرێبەست)'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {s.companyDesc ??
              'ئەم زانیاریانە لە سەرەوەی وەسڵ و گرێبەستە چاپکراوەکان دەردەکەون — تەنها سوپەر ئەدمین'}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.common.loading}
        </p>
      ) : (
        <form onSubmit={(e) => void save(e)} className="space-y-3 max-w-xl">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {s.companyAddress ?? 'ناونیشان'}
            </label>
            <input
              className={field}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="هەولێر — …"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {phoneFields.map((pf) => (
              <div key={pf.key}>
                <label className="block text-xs text-muted-foreground mb-1">{pf.label}</label>
                <input
                  className={`${field} dir-ltr`}
                  dir="ltr"
                  value={pf.value}
                  onChange={(e) => pf.set(e.target.value)}
                  placeholder="0750 …"
                  required={pf.required}
                />
              </div>
            ))}
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {ok ? <p className="text-sm text-teal-700">{ok}</p> : null}
          <button
            type="submit"
            disabled={busy || !address.trim() || !phone1.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {s.companySave ?? t.common.save}
          </button>
        </form>
      )}
    </div>
  );
}
