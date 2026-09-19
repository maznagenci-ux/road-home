'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Printer, Pencil, Star, X, Trash2 } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { locales, localeLabels, type Locale } from '@/i18n/locale-config';
import { BRAND_NAME } from '@/lib/brand';
import type { Dictionary } from '@/i18n/dictionaries';
import {
  SUPPORT_PURPOSES,
  SUPPORT_RECIPIENT_KINDS,
  buildSupportLetterBody,
  purposeLabel,
  recipientKindLabel,
  supportDefaultToName,
  supportPurposeSubject,
  type SupportPurpose,
  type SupportRecipientKind,
} from '@/lib/support/templates';

type SupportRow = {
  id: string;
  supportNo: string;
  recipientKind: string;
  purpose: string;
  applicant: string;
  beneficiaryName: string | null;
  beneficiaryIdNo: string | null;
  beneficiaryPhone: string | null;
  fromName: string | null;
  toName: string;
  recipientAddress: string | null;
  subject: string;
  content: string;
  propertyRef: string | null;
  managerName: string;
  managerTitle: string | null;
  branch: string | null;
  issuedAt: string;
};

type FormState = {
  recipientKind: SupportRecipientKind;
  purpose: SupportPurpose;
  applicant: string;
  beneficiaryName: string;
  beneficiaryIdNo: string;
  beneficiaryPhone: string;
  fromName: string;
  toName: string;
  recipientAddress: string;
  subject: string;
  content: string;
  propertyRef: string;
  managerName: string;
  managerTitle: string;
  branch: string;
  issuedAt: string;
};

const emptyForm = (locale: Locale): FormState => ({
  recipientKind: 'GOVERNMENT',
  purpose: 'OWNERSHIP',
  applicant: BRAND_NAME,
  beneficiaryName: '',
  beneficiaryIdNo: '',
  beneficiaryPhone: '',
  fromName: BRAND_NAME,
  toName: supportDefaultToName('GOVERNMENT', locale),
  recipientAddress: '',
  subject: supportPurposeSubject('OWNERSHIP', locale),
  content: buildSupportLetterBody('OWNERSHIP', locale, {
    toName: supportDefaultToName('GOVERNMENT', locale),
    company: BRAND_NAME,
  }),
  propertyRef: '',
  managerName: '',
  managerTitle: '',
  branch: 'بارەگای سەرەکی',
  issuedAt: new Date().toISOString().slice(0, 10),
});

export function SupportView({ t, lang }: { t: Dictionary; lang: string }) {
  const locale = lang as Locale;
  const s = t.pages.support as Record<string, string>;
  const [items, setItems] = useState<SupportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filterKind, setFilterKind] = useState<'all' | SupportRecipientKind>('all');
  const [filterPurpose, setFilterPurpose] = useState<'' | SupportPurpose>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(locale));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [printMenuId, setPrintMenuId] = useState<string | null>(null);
  const printMenuRef = useRef<HTMLDivElement | null>(null);
  const contentTouched = useRef(false);

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (debounced) qs.set('q', debounced);
    if (filterKind !== 'all') qs.set('kind', filterKind);
    if (filterPurpose) qs.set('purpose', filterPurpose);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const res = await fetch(`/api/support?${qs.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  }, [debounced, filterKind, filterPurpose, from, to]);

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(tmr);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!printMenuId) return;
    const onDoc = (e: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setPrintMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [printMenuId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyTemplate = (
    next: Partial<FormState> & { recipientKind?: SupportRecipientKind; purpose?: SupportPurpose },
    forceBody = false,
  ) => {
    setForm((prev) => {
      const recipientKind = next.recipientKind ?? prev.recipientKind;
      const purpose = next.purpose ?? prev.purpose;
      const toName =
        next.toName !== undefined
          ? next.toName
          : next.recipientKind
            ? supportDefaultToName(recipientKind, locale)
            : prev.toName;
      const subject = next.purpose ? supportPurposeSubject(purpose, locale) : (next.subject ?? prev.subject);
      const merged = { ...prev, ...next, recipientKind, purpose, toName, subject };
      if (forceBody || !contentTouched.current) {
        merged.content = buildSupportLetterBody(purpose, locale, {
          beneficiary: merged.beneficiaryName,
          idNo: merged.beneficiaryIdNo,
          phone: merged.beneficiaryPhone,
          propertyRef: merged.propertyRef,
          toName: merged.toName,
          company: merged.fromName || BRAND_NAME,
        });
      }
      return merged;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    contentTouched.current = false;
    setForm(emptyForm(locale));
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: SupportRow) => {
    setEditingId(row.id);
    contentTouched.current = true;
    setForm({
      recipientKind: (SUPPORT_RECIPIENT_KINDS.includes(row.recipientKind as SupportRecipientKind)
        ? row.recipientKind
        : 'GOVERNMENT') as SupportRecipientKind,
      purpose: (SUPPORT_PURPOSES.includes(row.purpose as SupportPurpose)
        ? row.purpose
        : 'OWNERSHIP') as SupportPurpose,
      applicant: row.applicant || BRAND_NAME,
      beneficiaryName: row.beneficiaryName ?? '',
      beneficiaryIdNo: row.beneficiaryIdNo ?? '',
      beneficiaryPhone: row.beneficiaryPhone ?? '',
      fromName: row.fromName ?? BRAND_NAME,
      toName: row.toName,
      recipientAddress: row.recipientAddress ?? '',
      subject: row.subject,
      content: row.content,
      propertyRef: row.propertyRef ?? '',
      managerName: row.managerName,
      managerTitle: row.managerTitle ?? '',
      branch: row.branch || 'بارەگای سەرەکی',
      issuedAt: row.issuedAt.slice(0, 10),
    });
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!form.toName || !form.subject || !form.content || !form.managerName || !form.beneficiaryName) {
      setError(t.pages.projects.required);
      return;
    }
    setSaving(true);
    const payload = {
      recipientKind: form.recipientKind,
      purpose: form.purpose,
      applicant: form.applicant || BRAND_NAME,
      beneficiaryName: form.beneficiaryName || null,
      beneficiaryIdNo: form.beneficiaryIdNo || null,
      beneficiaryPhone: form.beneficiaryPhone || null,
      fromName: form.fromName || null,
      toName: form.toName,
      recipientAddress: form.recipientAddress || null,
      subject: form.subject,
      content: form.content,
      propertyRef: form.propertyRef || null,
      managerName: form.managerName,
      managerTitle: form.managerTitle || null,
      branch: form.branch || null,
      issuedAt: form.issuedAt,
    };
    const res = await fetch(editingId ? `/api/support/${editingId}` : '/api/support', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setModalOpen(false);
    await load();
  };

  const deleteItem = async (row: SupportRow) => {
    const okConfirm = window.confirm(
      s.confirmDelete ?? 'دەتەوێت ئەم پشتگیرییە بۆ هەمیشە بسڕیتەوە؟',
    );
    if (!okConfirm) return;
    setBusyId(row.id);
    setError('');
    const res = await fetch(`/api/support/${row.id}`, { method: 'DELETE' });
    setBusyId(null);
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setOk(t.common.deleted);
    await load();
  };

  const printItem = (id: string, pdfLocale: Locale) => {
    setPrintMenuId(null);
    window.open(`/api/pdf/support/${id}?locale=${pdfLocale}&print=1`, '_blank', 'noopener,noreferrer');
  };

  const regenerateBody = () => {
    contentTouched.current = false;
    applyTemplate({}, true);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{s.title ?? 'پشتگیرییەکان'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {s.subtitle ?? 'پشتگیریی فەرمی بۆ دائیرەی حکومەت و کونسوڵخانە'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {s.add ?? 'پشتگیریی فەرمی نوێ'}
        </button>
      </div>

      {error && !modalOpen ? <p className="text-sm text-rose-600">{error}</p> : null}
      {ok && !modalOpen ? <p className="text-sm text-primary">{ok}</p> : null}

      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              {s.listTitle ?? 'پشتگیرییە تۆمارکراوەکان'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['all', s.filterAll ?? 'هەموو'],
                  ['GOVERNMENT', s.kindGovernment ?? 'دائیرەی حکومەت'],
                  ['CONSULATE', s.kindConsulate ?? 'کونسوڵخانە'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterKind(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    filterKind === key
                      ? 'border-primary/50 bg-primary/10 text-foreground font-semibold'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col lg:flex-row flex-wrap gap-2">
            <input
              className={cn(field, 'flex-1 min-w-[200px]')}
              placeholder={s.searchPlaceholder ?? s.search ?? 'گەڕان'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value as '' | SupportPurpose)}
              className={cn(field, 'w-auto min-w-[160px]')}
              aria-label={s.purpose}
            >
              <option value="">{s.purposeAll ?? t.common.all}</option>
              {SUPPORT_PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {purposeLabel(p, locale)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={cn(field, 'w-auto')}
              aria-label={s.fromDate ?? 'لە بەروار'}
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={cn(field, 'w-auto')}
              aria-label={s.toDate ?? 'بۆ بەروار'}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm text-start">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">{s.number ?? 'ژمارە'}</th>
                <th className="px-4 py-3 font-medium">{s.recipientKind ?? 'جۆری لایەن'}</th>
                <th className="px-4 py-3 font-medium">{s.purpose ?? 'مەبەست'}</th>
                <th className="px-4 py-3 font-medium">{s.beneficiary ?? 'سوودمەند'}</th>
                <th className="px-4 py-3 font-medium">{s.to ?? 'بۆ'}</th>
                <th className="px-4 py-3 font-medium">{s.date ?? 'ڕێکەوت'}</th>
                <th className="px-4 py-3 font-medium">{t.common.print}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {t.common.loading}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {s.empty ?? 'هیچ پشتگیرییەک تۆمار نەکراوە'}
                  </td>
                </tr>
              ) : (
                items.map((row, i) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{row.supportNo}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 rounded-lg text-[11px] font-medium',
                          row.recipientKind === 'CONSULATE'
                            ? 'bg-violet-500/10 text-violet-800'
                            : row.recipientKind === 'GOVERNMENT'
                              ? 'bg-sky-500/10 text-sky-800'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {recipientKindLabel(row.recipientKind, locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{purposeLabel(row.purpose, locale)}</td>
                    <td className="px-4 py-3 font-medium">{row.beneficiaryName || row.applicant || '—'}</td>
                    <td className="px-4 py-3 max-w-[14rem] truncate">{row.toName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(row.issuedAt, lang)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t.common.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <div
                          className="relative"
                          ref={printMenuId === row.id ? printMenuRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setPrintMenuId((cur) => (cur === row.id ? null : row.id))
                            }
                            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            title={s.printPdfLang ?? t.common.print}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {printMenuId === row.id ? (
                            <div className="absolute end-0 z-20 mt-1 min-w-[9.5rem] rounded-xl border border-border bg-card p-1 shadow-lg">
                              {locales.map((loc) => (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => printItem(row.id, loc)}
                                  className={cn(
                                    'w-full text-start rounded-lg px-2 py-1.5 text-xs hover:bg-muted',
                                    loc === lang && 'font-semibold text-primary',
                                  )}
                                >
                                  {localeLabels[loc]}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void deleteItem(row)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-50"
                          title={t.common.delete}
                          aria-label={t.common.delete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-card">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId ? (s.edit ?? 'دەستکاری پشتگیری') : (s.add ?? 'پشتگیریی فەرمی نوێ')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.formHint ?? 'بۆ دائیرەی فەرمی حکومەت یان کونسوڵخانە'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <section className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{s.sectionRecipient ?? '١) لایەنی وەرگر'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      {s.recipientKind ?? 'جۆری لایەن'}
                    </label>
                    <select
                      className={field}
                      value={form.recipientKind}
                      onChange={(e) =>
                        applyTemplate({ recipientKind: e.target.value as SupportRecipientKind })
                      }
                    >
                      {SUPPORT_RECIPIENT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {recipientKindLabel(k, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      {s.purpose ?? 'مەبەستی پشتگیری'}
                    </label>
                    <select
                      className={field}
                      value={form.purpose}
                      onChange={(e) =>
                        applyTemplate({ purpose: e.target.value as SupportPurpose })
                      }
                    >
                      {SUPPORT_PURPOSES.map((p) => (
                        <option key={p} value={p}>
                          {purposeLabel(p, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{s.to ?? 'بۆ'}</label>
                  <input
                    className={field}
                    value={form.toName}
                    onChange={(e) => set('toName', e.target.value)}
                    placeholder={s.toPlaceholder ?? 'ناوی دائیرە یان کونسوڵخانە'}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    {s.recipientAddress ?? 'ناونیشانی لایەن (ئارەزوومەندانە)'}
                  </label>
                  <input
                    className={field}
                    value={form.recipientAddress}
                    onChange={(e) => set('recipientAddress', e.target.value)}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{s.sectionPerson ?? '٢) سوودمەند'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">
                      {s.beneficiary ?? 'ناوی سوودمەند'}
                    </label>
                    <input
                      className={field}
                      value={form.beneficiaryName}
                      onChange={(e) => {
                        set('beneficiaryName', e.target.value);
                        if (!contentTouched.current) {
                          applyTemplate({ beneficiaryName: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      {s.beneficiaryId ?? 'ژمارەی ناسنامە / پاسپۆرت'}
                    </label>
                    <input
                      className={field}
                      value={form.beneficiaryIdNo}
                      onChange={(e) => {
                        set('beneficiaryIdNo', e.target.value);
                        if (!contentTouched.current) {
                          applyTemplate({ beneficiaryIdNo: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      {s.beneficiaryPhone ?? 'مۆبایل'}
                    </label>
                    <input
                      className={field}
                      value={form.beneficiaryPhone}
                      onChange={(e) => {
                        set('beneficiaryPhone', e.target.value);
                        if (!contentTouched.current) {
                          applyTemplate({ beneficiaryPhone: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">
                      {s.propertyRef ?? 'ناونیشان / ژمارەی گرێبەست / موڵک'}
                    </label>
                    <input
                      className={field}
                      value={form.propertyRef}
                      onChange={(e) => {
                        set('propertyRef', e.target.value);
                        if (!contentTouched.current) {
                          applyTemplate({ propertyRef: e.target.value });
                        }
                      }}
                      placeholder={s.propertyRefHint ?? 'نموونە: CT-2026-0001 · گوڵان دوو · هەولێر'}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{s.sectionLetter ?? '٣) نووسراوی فەرمی'}</p>
                  <button
                    type="button"
                    onClick={regenerateBody}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
                  >
                    {s.regenBody ?? 'دروستکردنەوەی دەق لە قاڵب'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{s.from ?? 'لە'}</label>
                    <input
                      className={field}
                      value={form.fromName}
                      onChange={(e) => set('fromName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{s.branch ?? 'لق'}</label>
                    <input
                      className={field}
                      value={form.branch}
                      onChange={(e) => set('branch', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{s.subject ?? 'بابەت'}</label>
                  <input
                    className={field}
                    value={form.subject}
                    onChange={(e) => set('subject', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{s.content ?? 'ناوەڕۆک'}</label>
                  <textarea
                    className={cn(field, 'min-h-[180px] resize-y')}
                    value={form.content}
                    onChange={(e) => {
                      contentTouched.current = true;
                      set('content', e.target.value);
                    }}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{s.sectionSign ?? '٤) واژۆ'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      {s.manager ?? 'بەڕێوەبەری کارگێڕی'}
                    </label>
                    <input
                      className={field}
                      value={form.managerName}
                      onChange={(e) => set('managerName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{s.post ?? 'پۆست'}</label>
                    <input
                      className={field}
                      value={form.managerTitle}
                      onChange={(e) => set('managerTitle', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{s.date ?? 'ڕێکەوت'}</label>
                    <input
                      type="date"
                      className={field}
                      value={form.issuedAt}
                      onChange={(e) => set('issuedAt', e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-muted"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t.common.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
