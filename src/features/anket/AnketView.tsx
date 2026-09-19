'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Printer,
  X,
  Loader2,
  ShieldCheck,
  Building2,
  Users,
  FileCheck2,
  Check,
  Search,
  Trash2,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { ANKET_DOCUMENT_OPTIONS, labelAnketDoc } from '@/lib/anket/documents';
import type { Dictionary } from '@/i18n/dictionaries';

type AnketRow = {
  id: string;
  anketNo: string;
  kind: 'SALE' | 'RENT';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  issuedAt: string;
  securityStationName: string;
  party1Name: string;
  party2Name: string;
  propertyNo: string;
  projectName: string;
  documents: string[];
};

type FormState = {
  kind: 'SALE' | 'RENT';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  branch: string;
  issuedAt: string;
  securityStationName: string;
  location: string;
  propertyType: 'HOUSE' | 'APARTMENT' | 'LAND' | 'SHOP' | 'BUILDING';
  propertyNo: string;
  propertyName: string;
  projectName: string;
  buildingNo: string;
  floorNo: string;
  unitNo: string;
  propertyStatus: string;
  party1Name: string;
  party1Phone: string;
  party1Address: string;
  party1Nationality: string;
  party1Occupation: string;
  party1Code: string;
  party2Name: string;
  party2Phone: string;
  party2Address: string;
  party2Nationality: string;
  party2Occupation: string;
  party2Origin: string;
  documents: string[];
  notes: string;
  organizerName: string;
  mukhtarName: string;
};

const emptyForm = (): FormState => ({
  kind: 'RENT',
  status: 'DRAFT',
  branch: 'بارەگای سەرەکی',
  issuedAt: new Date().toISOString().slice(0, 10),
  securityStationName: '',
  location: '',
  propertyType: 'APARTMENT',
  propertyNo: '',
  propertyName: '',
  projectName: '',
  buildingNo: '',
  floorNo: '',
  unitNo: '',
  propertyStatus: '',
  party1Name: '',
  party1Phone: '',
  party1Address: '',
  party1Nationality: '',
  party1Occupation: '',
  party1Code: '',
  party2Name: '',
  party2Phone: '',
  party2Address: '',
  party2Nationality: '',
  party2Occupation: '',
  party2Origin: '',
  documents: ['national-card', 'information-card', 'mukhtar-letter'],
  notes: '',
  organizerName: 'Road Home ZMKH Real Estate',
  mukhtarName: '',
});

type Step = 'main' | 'parties' | 'property' | 'docs';

function AnketField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function AnketView({ t, lang }: { t: Dictionary; lang: string }) {
  const A = t.pages.anket as typeof t.pages.anket & Record<string, string>;
  const statusLabels = (t.status as { anket?: Record<string, string> }).anket ?? {};
  const [items, setItems] = useState<AnketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState<Step>('main');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | 'SALE' | 'RENT'>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'DRAFT' | 'SUBMITTED' | 'APPROVED'>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fieldClass =
    'w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15';

  const filterField =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debounced) params.set('q', debounced);
    if (kindFilter) params.set('kind', kindFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const res = await fetch(`/api/anket${qs ? `?${qs}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else setError(t.pages.projects.error);
    setLoading(false);
  }, [debounced, kindFilter, statusFilter, from, to, t.pages.projects.error]);

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(tmr);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusTone = (status: AnketRow['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/15 text-emerald-800 border-emerald-600/30';
      case 'SUBMITTED':
        return 'bg-sky-500/15 text-sky-900 border-sky-600/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const statusLabel = (status: string) => statusLabels[status] ?? status;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setStep('main');
    setError('');
    setOk('');
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    const res = await fetch('/api/anket');
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    const data = await res.json();
    const full = (data.items as Array<FormState & { id: string; issuedAt: string; notes?: string | null }>).find(
      (i) => i.id === id,
    );
    if (!full) return;
    setEditingId(id);
    setForm({
      ...emptyForm(),
      ...full,
      issuedAt: full.issuedAt?.slice(0, 10) || emptyForm().issuedAt,
      documents: full.documents ?? [],
      notes: full.notes ?? '',
    });
    setStep('main');
    setError('');
    setOk('');
    setModalOpen(true);
  };

  const toggleDoc = (key: string) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.includes(key)
        ? prev.documents.filter((d) => d !== key)
        : [...prev.documents, key],
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.party1Name.trim() || !form.party2Name.trim()) {
      setError(t.pages.projects.required);
      setStep('parties');
      return;
    }
    setSaving(true);
    const payload = { ...form, notes: form.notes.trim() || null };
    const res = await fetch('/api/anket', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    setSaving(false);
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setOk(A.saved);
    setModalOpen(false);
    await load();
  };

  const deleteAnket = async (row: AnketRow) => {
    const okConfirm = window.confirm(
      A.confirmDelete ?? 'دەتەوێت ئەم ئەنکێتە بۆ هەمیشە بسڕیتەوە؟',
    );
    if (!okConfirm) return;
    setBusyId(row.id);
    setError('');
    const res = await fetch(`/api/anket?id=${encodeURIComponent(row.id)}`, {
      method: 'DELETE',
    });
    setBusyId(null);
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setOk(t.common.deleted);
    await load();
  };

  const steps = useMemo(
    () =>
      [
        { id: 'main' as const, label: A.stepMain, icon: ShieldCheck },
        { id: 'parties' as const, label: A.stepParties, icon: Users },
        { id: 'property' as const, label: A.stepProperty, icon: Building2 },
        { id: 'docs' as const, label: A.stepDocs, icon: FileCheck2 },
      ] as const,
    [A.stepMain, A.stepParties, A.stepProperty, A.stepDocs],
  );

  return (
    <div className="space-y-6 max-w-[1180px] mx-auto">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#0f2744] via-[#14375c] to-[#0f766e] text-white p-6 sm:p-8">
        <div className="absolute -top-16 -end-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">{A.badge}</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold">{A.title}</h1>
            <p className="mt-2 text-sm text-white/75 max-w-xl">{A.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-[#0f2744] hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            {A.add}
          </button>
        </div>
      </div>

      {error && !modalOpen ? <p className="text-sm text-rose-600">{error}</p> : null}
      {ok && !modalOpen ? <p className="text-sm text-primary">{ok}</p> : null}

      <div className="flex flex-col lg:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={A.searchPlaceholder ?? 'گەڕان بە ژمارە، لایەن، موڵک…'}
            className={cn(filterField, 'w-full ps-9')}
          />
        </div>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as '' | 'SALE' | 'RENT')}
          className={cn(filterField, 'min-w-[140px]')}
          aria-label={A.kind}
        >
          <option value="">{A.kindAll ?? t.common.all}</option>
          <option value="SALE">{A.kindSale}</option>
          <option value="RENT">{A.kindRent}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as '' | 'DRAFT' | 'SUBMITTED' | 'APPROVED')
          }
          className={cn(filterField, 'min-w-[140px]')}
          aria-label={A.status ?? 'دۆخ'}
        >
          <option value="">{A.statusAll ?? t.common.all}</option>
          <option value="DRAFT">{statusLabel('DRAFT')}</option>
          <option value="SUBMITTED">{statusLabel('SUBMITTED')}</option>
          <option value="APPROVED">{statusLabel('APPROVED')}</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={filterField}
          aria-label={A.fromDate ?? 'لە بەروار'}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={filterField}
          aria-label={A.toDate ?? 'بۆ بەروار'}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">{A.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{A.number}</th>
                  <th className="px-4 py-3 text-start font-medium">{A.kind}</th>
                  <th className="px-4 py-3 text-start font-medium">{A.status ?? 'دۆخ'}</th>
                  <th className="px-4 py-3 text-start font-medium">{A.party1}</th>
                  <th className="px-4 py-3 text-start font-medium">{A.party2}</th>
                  <th className="px-4 py-3 text-start font-medium">{A.propertyNo}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.date}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{row.anketNo}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 rounded-md text-xs font-medium',
                          row.kind === 'RENT'
                            ? 'bg-teal-500/10 text-teal-700'
                            : 'bg-sky-500/10 text-sky-800',
                        )}
                      >
                        {row.kind === 'RENT' ? A.kindRent : A.kindSale}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border',
                          statusTone(row.status),
                        )}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.party1Name || '—'}</td>
                    <td className="px-4 py-3">{row.party2Name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.propertyNo || '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(row.issuedAt, lang)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void openEdit(row.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t.common.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <a
                          href={`/api/pdf/anket/${row.id}?locale=${lang}&print=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t.common.print}
                        >
                          <Printer className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void deleteAnket(row)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-50"
                          title={t.common.delete}
                          aria-label={t.common.delete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-sidebar/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-4xl max-h-[100dvh] sm:max-h-[92vh] overflow-hidden rounded-none sm:rounded-3xl border border-border bg-[#f7f8fa] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-card">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingId ? A.edit : A.add}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{A.formHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {steps.map((s) => {
                  const Icon = s.icon;
                  const active = step === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStep(s.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-start transition-colors',
                        active
                          ? 'border-primary/40 bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-card text-foreground hover:bg-muted/60',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90" />
                      <span className="text-xs font-semibold leading-tight">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={(e) => void save(e)} className="flex-1 overflow-y-auto rh-scroll p-4 sm:p-5 space-y-4">
              {step === 'main' ? (
                <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{A.stepMain}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{A.mainHint}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnketField label={A.branch}>
                      <input className={fieldClass} value={form.branch} onChange={(e) => set('branch', e.target.value)} />
                    </AnketField>
                    <AnketField label={A.date}>
                      <input
                        type="date"
                        className={fieldClass}
                        value={form.issuedAt}
                        onChange={(e) => set('issuedAt', e.target.value)}
                      />
                    </AnketField>
                    <AnketField label={A.securityStation} className="sm:col-span-2">
                      <input
                        className={fieldClass}
                        value={form.securityStationName}
                        onChange={(e) => set('securityStationName', e.target.value)}
                        placeholder={A.securityStationPh}
                      />
                    </AnketField>
                    <AnketField label={A.location}>
                      <input className={fieldClass} value={form.location} onChange={(e) => set('location', e.target.value)} />
                    </AnketField>
                    <AnketField label={A.kind}>
                      <div className="inline-flex rounded-xl border border-border p-1 bg-muted/40">
                        {(['RENT', 'SALE'] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => set('kind', k)}
                            className={cn(
                              'px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
                              form.kind === k
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {k === 'RENT' ? A.kindRent : A.kindSale}
                          </button>
                        ))}
                      </div>
                    </AnketField>
                  </div>
                </section>
              ) : null}

              {step === 'parties' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <section className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-l from-[#0f2744] to-[#334155]" />
                    <div className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold">{A.party1}</h3>
                      <p className="text-xs text-muted-foreground">{A.party1Hint}</p>
                      <AnketField label={A.fullName}>
                        <input className={fieldClass} value={form.party1Name} onChange={(e) => set('party1Name', e.target.value)} required />
                      </AnketField>
                      <AnketField label={t.table.phone}>
                        <input className={fieldClass} value={form.party1Phone} onChange={(e) => set('party1Phone', e.target.value)} />
                      </AnketField>
                      <AnketField label={A.address}>
                        <input className={fieldClass} value={form.party1Address} onChange={(e) => set('party1Address', e.target.value)} />
                      </AnketField>
                      <div className="grid grid-cols-2 gap-3">
                        <AnketField label={A.nationality}>
                          <input className={fieldClass} value={form.party1Nationality} onChange={(e) => set('party1Nationality', e.target.value)} />
                        </AnketField>
                        <AnketField label={A.occupation}>
                          <input className={fieldClass} value={form.party1Occupation} onChange={(e) => set('party1Occupation', e.target.value)} />
                        </AnketField>
                      </div>
                      <AnketField label={A.code}>
                        <input className={fieldClass} value={form.party1Code} onChange={(e) => set('party1Code', e.target.value)} />
                      </AnketField>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-l from-[#0f766e] to-[#14b8a6]" />
                    <div className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold">{A.party2}</h3>
                      <p className="text-xs text-muted-foreground">{A.party2Hint}</p>
                      <AnketField label={A.fullName}>
                        <input className={fieldClass} value={form.party2Name} onChange={(e) => set('party2Name', e.target.value)} required />
                      </AnketField>
                      <AnketField label={t.table.phone}>
                        <input className={fieldClass} value={form.party2Phone} onChange={(e) => set('party2Phone', e.target.value)} />
                      </AnketField>
                      <AnketField label={A.address}>
                        <input className={fieldClass} value={form.party2Address} onChange={(e) => set('party2Address', e.target.value)} />
                      </AnketField>
                      <div className="grid grid-cols-2 gap-3">
                        <AnketField label={A.nationality}>
                          <input className={fieldClass} value={form.party2Nationality} onChange={(e) => set('party2Nationality', e.target.value)} />
                        </AnketField>
                        <AnketField label={A.occupation}>
                          <input className={fieldClass} value={form.party2Occupation} onChange={(e) => set('party2Occupation', e.target.value)} />
                        </AnketField>
                      </div>
                      <AnketField label={A.origin}>
                        <input className={fieldClass} value={form.party2Origin} onChange={(e) => set('party2Origin', e.target.value)} />
                      </AnketField>
                    </div>
                  </section>
                </div>
              ) : null}

              {step === 'property' ? (
                <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">{A.propertyInfo}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{A.propertyHint}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnketField label={A.project}>
                      <input className={fieldClass} value={form.projectName} onChange={(e) => set('projectName', e.target.value)} />
                    </AnketField>
                    <AnketField label={A.propertyName}>
                      <input className={fieldClass} value={form.propertyName} onChange={(e) => set('propertyName', e.target.value)} />
                    </AnketField>
                    <AnketField label={A.propertyNo}>
                      <input className={fieldClass} value={form.propertyNo} onChange={(e) => set('propertyNo', e.target.value)} />
                    </AnketField>
                    <AnketField label={t.pages.contractGen.propertyType}>
                      <select
                        className={fieldClass}
                        value={form.propertyType}
                        onChange={(e) => set('propertyType', e.target.value as FormState['propertyType'])}
                      >
                        <option value="APARTMENT">{t.pages.contractGen.typeApartment}</option>
                        <option value="HOUSE">{t.pages.contractGen.typeHouse}</option>
                        <option value="LAND">{t.pages.contractGen.typeLand}</option>
                        <option value="SHOP">{t.pages.contractGen.typeShop}</option>
                        <option value="BUILDING">{t.pages.contractGen.typeBuilding}</option>
                      </select>
                    </AnketField>
                    <AnketField label={A.building}>
                      <input className={fieldClass} value={form.buildingNo} onChange={(e) => set('buildingNo', e.target.value)} placeholder="Building" />
                    </AnketField>
                    <AnketField label={A.floor}>
                      <input className={fieldClass} value={form.floorNo} onChange={(e) => set('floorNo', e.target.value)} />
                    </AnketField>
                    <AnketField label={A.unit}>
                      <input className={fieldClass} value={form.unitNo} onChange={(e) => set('unitNo', e.target.value)} />
                    </AnketField>
                    <AnketField label={A.propertyStatus}>
                      <input className={fieldClass} value={form.propertyStatus} onChange={(e) => set('propertyStatus', e.target.value)} />
                    </AnketField>
                  </div>
                </section>
              ) : null}

              {step === 'docs' ? (
                <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">{A.docsRequired}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{A.docsHint}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ANKET_DOCUMENT_OPTIONS.map((doc) => {
                      const on = form.documents.includes(doc.key);
                      return (
                        <button
                          key={doc.key}
                          type="button"
                          onClick={() => toggleDoc(doc.key)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                            on
                              ? 'border-[#0f2744] bg-[#0f2744] text-white'
                              : 'border-border bg-muted/40 text-foreground hover:bg-muted',
                          )}
                        >
                          {on ? <Check className="h-3.5 w-3.5" /> : null}
                          {labelAnketDoc(doc.key, lang)}
                        </button>
                      );
                    })}
                  </div>
                  <AnketField label={t.form.notes}>
                    <textarea
                      className={cn(fieldClass, 'min-h-[100px] resize-y')}
                      value={form.notes}
                      onChange={(e) => set('notes', e.target.value)}
                    />
                  </AnketField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnketField label={A.organizer}>
                      <input className={fieldClass} value={form.organizerName} onChange={(e) => set('organizerName', e.target.value)} />
                    </AnketField>
                    <AnketField label={A.mukhtar}>
                      <input className={fieldClass} value={form.mukhtarName} onChange={(e) => set('mukhtarName', e.target.value)} />
                    </AnketField>
                  </div>
                </section>
              ) : null}

              {error ? <p className="text-sm text-rose-600 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p> : null}

              <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur px-4 py-3">
                <div className="flex gap-2">
                  {step !== 'main' ? (
                    <button
                      type="button"
                      onClick={() =>
                        setStep(
                          step === 'docs' ? 'property' : step === 'property' ? 'parties' : 'main',
                        )
                      }
                      className="px-3 py-2 rounded-xl text-sm border border-border hover:bg-muted"
                    >
                      {t.common.back}
                    </button>
                  ) : null}
                  {step !== 'docs' ? (
                    <button
                      type="button"
                      onClick={() =>
                        setStep(
                          step === 'main' ? 'parties' : step === 'parties' ? 'property' : 'docs',
                        )
                      }
                      className="px-3 py-2 rounded-xl text-sm border border-border hover:bg-muted"
                    >
                      {A.next}
                    </button>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#0f2744] text-white hover:bg-[#0f2744]/90 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
