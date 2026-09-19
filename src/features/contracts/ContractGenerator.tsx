'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { cn, formatContractMoney } from '@/lib/utils';
import {
  emptyContractForm,
  defaultLegalConditions,
  type ContractFormState,
  type InstallmentDraft,
} from '@/lib/contracts/templates';
import { useFxStore } from '@/stores/fx-store';
import { placeLocationLabel, placeSelectLabel, type PlaceOption } from '@/lib/places';
import type { Dictionary } from '@/i18n/dictionaries';
import { locales, localeLabels, type Locale } from '@/i18n/locale-config';
import { BRAND_NAME } from '@/lib/brand';
import { DealEmployeeSelect } from '@/features/deals/DealEmployeeSelect';

const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'LAND', 'SHOP', 'BUILDING'] as const;

function MoneyHint({
  amount,
  currency,
  rate,
  lang,
  t,
}: {
  amount: number;
  currency: 'IQD' | 'USD';
  rate: number;
  lang: string;
  t: Dictionary;
}) {
  if (!amount) return null;
  const m = formatContractMoney(amount, currency, rate, lang);
  return (
    <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
      {currency === 'IQD' ? `${t.pages.contractGen.equivUsd}: ${m.usd}` : `${t.pages.contractGen.equivIqd}: ${m.iqd}`}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[12px] font-semibold text-foreground/80">{children}</label>;
}

type InitialContract = {
  id: string;
  contractNo: string;
  kind: 'SALE' | 'PURCHASE';
  propertyType: 'HOUSE' | 'APARTMENT' | 'LAND' | 'SHOP' | 'BUILDING';
  title: string;
  tapuCode: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerIdNo: string | null;
  sellerName: string | null;
  sellerPhone: string | null;
  sellerIdNo: string | null;
  witness1Name: string | null;
  witness1Phone?: string | null;
  witness1IdNo: string | null;
  witness2Name: string | null;
  witness2Phone?: string | null;
  witness2IdNo: string | null;
  guarantorName?: string | null;
  guarantorPhone?: string | null;
  lawyerName?: string | null;
  lawyerPhone?: string | null;
  areaSqm?: number | null;
  currency: 'IQD' | 'USD';
  exchangeRate: number;
  totalAmount: number;
  totalAmountUsd: number;
  downPayment: number;
  downPaymentUsd: number;
  downPaymentHeld?: boolean;
  cancelFeeIqd?: number;
  dailyPenaltyIqd?: number;
  commissionSellerIqd?: number;
  commissionBuyerIqd?: number;
  remainingDueDate?: string | Date | null;
  handoverDate?: string | Date | null;
  signingDate?: string | Date | null;
  notes?: string | null;
  staffNote?: string | null;
  organizerName?: string | null;
  showOrganizer?: boolean;
  dealEmployeeId?: string | null;
  dealEmployeeName?: string | null;
  isExternal?: boolean;
  legalConditions: string | null;
  description: string | null;
  house: { code: string; name: string; location: string | null } | null;
  installments: Array<{
    id: string;
    dueDate: string | Date;
    amount: number;
    notes: string | null;
  }>;
};

export function ContractGenerator({
  t,
  lang,
  placeOptions,
  initialContract,
}: {
  t: Dictionary;
  lang: Locale;
  placeOptions: PlaceOption[];
  initialContract?: InitialContract | null;
}) {
  const router = useRouter();
  const usdToIqd = useFxStore((s) => s.usdToIqd);
  const editing = Boolean(initialContract?.id);
  const g = t.pages.contractGen as Record<string, string>;
  const placesT = t.pages.places as Record<string, string>;
  const r = t.pages.rentals as Record<string, string>;

  const dateStr = (v?: string | Date | null) => {
    if (!v) return '';
    return typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10);
  };

  const toForm = (c: InitialContract): ContractFormState => {
    const cur = c.currency === 'USD' ? 'USD' : 'IQD';
    const rate = Math.max(1, c.exchangeRate || usdToIqd);
    const fromIqd = (iqd: number) => (cur === 'USD' ? Math.round((iqd / rate) * 100) / 100 : iqd);
    return {
      kind: c.kind,
      propertyType: c.propertyType,
      title: c.title,
      tapuCode: c.tapuCode ?? '',
      buyerName: c.buyerName ?? '',
      buyerPhone: c.buyerPhone ?? '',
      buyerIdNo: c.buyerIdNo ?? '',
      sellerName: c.sellerName ?? '',
      sellerPhone: c.sellerPhone ?? '',
      sellerIdNo: c.sellerIdNo ?? '',
      witness1Name: c.witness1Name ?? '',
      witness1Phone: c.witness1Phone ?? '',
      witness1IdNo: c.witness1IdNo ?? '',
      witness2Name: c.witness2Name ?? '',
      witness2Phone: c.witness2Phone ?? '',
      witness2IdNo: c.witness2IdNo ?? '',
      guarantorName: c.guarantorName ?? '',
      guarantorPhone: c.guarantorPhone ?? '',
      lawyerName: c.lawyerName ?? '',
      lawyerPhone: c.lawyerPhone ?? '',
      houseCode: c.house?.code ?? '',
      location: c.description ?? c.house?.location ?? '',
      areaSqm: c.areaSqm != null ? String(c.areaSqm) : '',
      currency: cur,
      exchangeRate: rate,
      totalAmount: fromIqd(c.totalAmount),
      downPayment: fromIqd(c.downPayment),
      downPaymentHeld: c.downPaymentHeld ?? true,
      remainingDueDate: dateStr(c.remainingDueDate),
      cancelFee: fromIqd(c.cancelFeeIqd ?? 0),
      dailyPenalty: fromIqd(c.dailyPenaltyIqd ?? 0),
      commissionSeller: fromIqd(c.commissionSellerIqd ?? 0),
      commissionBuyer: fromIqd(c.commissionBuyerIqd ?? 0),
      handoverDate: dateStr(c.handoverDate),
      signingDate: dateStr(c.signingDate) || new Date().toISOString().slice(0, 10),
      notes: c.notes ?? '',
      staffNote: c.staffNote ?? '',
      organizerName: c.organizerName || BRAND_NAME,
      showOrganizer: c.showOrganizer ?? true,
      dealEmployeeId: c.dealEmployeeId ?? '',
      isExternal: c.isExternal ?? false,
      legalConditions: c.legalConditions ?? defaultLegalConditions(lang, c.kind),
      installments: (c.installments ?? []).map((i) => ({
        id: i.id || crypto.randomUUID(),
        dueDate: dateStr(i.dueDate),
        amount: fromIqd(i.amount),
        label: i.notes ?? '',
      })),
    };
  };

  const [form, setForm] = useState<ContractFormState>(() =>
    initialContract ? toForm(initialContract) : emptyContractForm(lang),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedNo, setSavedNo] = useState<string | undefined>(initialContract?.contractNo);
  const [savedId, setSavedId] = useState<string | undefined>(initialContract?.id);
  const [printLang, setPrintLang] = useState<Locale>(lang);

  useEffect(() => {
    if (editing) return;
    setForm((prev) => ({ ...prev, exchangeRate: usdToIqd }));
  }, [usdToIqd, editing]);

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  const set = <K extends keyof ContractFormState>(key: K, value: ContractFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const remaining = Math.max(0, (form.totalAmount || 0) - (form.downPayment || 0));

  const typeLabels = useMemo(
    () => ({
      HOUSE: t.pages.contractGen.typeHouse,
      APARTMENT: t.pages.contractGen.typeApartment,
      LAND: t.pages.contractGen.typeLand,
      SHOP: t.pages.contractGen.typeShop,
      BUILDING: t.pages.contractGen.typeBuilding,
    }),
    [t],
  );

  const addInstallment = () => {
    const row: InstallmentDraft = {
      id: crypto.randomUUID(),
      dueDate: form.remainingDueDate || '',
      amount: 0,
      label: '',
    };
    setForm((prev) => ({ ...prev, installments: [...prev.installments, row] }));
  };

  const updateInstallment = (id: string, patch: Partial<InstallmentDraft>) => {
    setForm((prev) => ({
      ...prev,
      installments: prev.installments.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeInstallment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      installments: prev.installments.filter((r) => r.id !== id),
    }));
  };

  const save = async () => {
    setError('');
    if (!form.buyerName || !form.sellerName || !form.totalAmount) {
      setError(t.pages.projects.required);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        propertyType: form.propertyType,
        title: form.title,
        tapuCode: form.tapuCode || null,
        buyerName: form.buyerName,
        buyerPhone: form.buyerPhone || null,
        buyerIdNo: form.buyerIdNo || null,
        sellerName: form.sellerName,
        sellerPhone: form.sellerPhone || null,
        sellerIdNo: form.sellerIdNo || null,
        witness1Name: form.witness1Name || null,
        witness1Phone: form.witness1Phone || null,
        witness1IdNo: form.witness1IdNo || null,
        witness2Name: form.witness2Name || null,
        witness2Phone: form.witness2Phone || null,
        witness2IdNo: form.witness2IdNo || null,
        guarantorName: form.guarantorName || null,
        guarantorPhone: form.guarantorPhone || null,
        lawyerName: form.lawyerName || null,
        lawyerPhone: form.lawyerPhone || null,
        houseCode: form.houseCode || null,
        areaSqm: form.areaSqm ? Number(form.areaSqm) : null,
        currency: form.currency,
        exchangeRate: form.exchangeRate,
        totalAmount: form.totalAmount,
        downPayment: form.downPayment,
        downPaymentHeld: form.downPaymentHeld,
        cancelFee: form.cancelFee,
        dailyPenalty: form.dailyPenalty,
        commissionSeller: form.commissionSeller,
        commissionBuyer: form.commissionBuyer,
        remainingDueDate: form.remainingDueDate || null,
        handoverDate: form.handoverDate || null,
        signingDate: form.signingDate || null,
        notes: form.notes || null,
        staffNote: form.staffNote || null,
        organizerName: form.organizerName || BRAND_NAME,
        showOrganizer: form.showOrganizer,
        dealEmployeeId: form.dealEmployeeId || null,
        isExternal: Boolean(form.isExternal),
        legalConditions: form.legalConditions,
        description: form.location || null,
        installments: form.installments
          .filter((i) => i.amount > 0 && i.dueDate)
          .map((i) => ({ amount: i.amount, dueDate: i.dueDate, notes: i.label || null })),
      };
      const res = await fetch(editing && savedId ? `/api/contracts/${savedId}` : '/api/contracts', {
        method: editing && savedId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        setError(t.pages.projects.error);
        return;
      }
      setSavedNo(data.contract?.contractNo);
      setSavedId(data.contract?.id);
      const scopeQs = form.isExternal ? 'external' : 'internal';
      router.push(`/${lang}/contracts?scope=${scopeQs}`);
      router.refresh();
    } catch {
      setSaving(false);
      setError(t.pages.projects.error);
    }
  };

  const printPdf = () => {
    if (!savedId) {
      setError(g.saveFirst ?? 'سەرەتا گرێبەست پاشەکەوت بکە');
      return;
    }
    window.open(`/api/pdf/contract/${savedId}?locale=${printLang}&print=1`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {editing ? (g.editTitle ?? 'دەستکاری گرێبەست') : (g.addTitle ?? 'زیادکردنی گرێبەستی فرۆشتن')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {editing
              ? (g.editHint ?? 'لایەنەکان، موڵک، پسووڵە و دەستخۆشی')
              : (g.addHint ?? 'وەک وێنەی فۆڕم — لایەنەکان، موڵک، پسووڵە و دەستخۆشی')}
          </p>
          {form.isExternal ? (
            <p className="mt-2 inline-flex items-center rounded-lg border-2 border-amber-600/40 bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-900">
              {g.scopeExternalStamp ?? 'گرێبەستی دەرەکی'}
            </p>
          ) : (
            <p className="mt-2 inline-flex items-center rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-800">
              {g.scopeInternal ?? 'ناوخۆیی'}
            </p>
          )}
          {savedNo ? (
            <p className="text-xs text-primary mt-1 font-mono">
              {g.contractNo}: {savedNo}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={cn(field, 'w-auto min-w-[8rem]')}
            value={printLang}
            onChange={(e) => setPrintLang(e.target.value as Locale)}
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeLabels[l]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={printPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-border hover:bg-muted"
          >
            <Printer className="h-4 w-4" />
            {g.print}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {g.save}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-base font-semibold mb-1">{g.partiesSection ?? '١) لایەنەکان'}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {g.partiesHint ?? 'فرۆشیار و کڕیار پێویستن — شایەد، کەفیل و پارێزەر ئارەزوومەندانەن'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <fieldset className="space-y-3 rounded-xl border border-border p-3">
                <legend className="px-1 text-xs text-primary">{g.seller}</legend>
                <div>
                  <FieldLabel>{t.table.name}</FieldLabel>
                  <input className={field} value={form.sellerName} onChange={(e) => set('sellerName', e.target.value)} />
                </div>
                <div>
                  <FieldLabel>{t.table.phone}</FieldLabel>
                  <input className={field} value={form.sellerPhone} onChange={(e) => set('sellerPhone', e.target.value)} placeholder="07xxxxxxxxx" />
                </div>
                <div>
                  <FieldLabel>{g.idNo}</FieldLabel>
                  <input className={field} value={form.sellerIdNo} onChange={(e) => set('sellerIdNo', e.target.value)} />
                </div>
              </fieldset>
              <fieldset className="space-y-3 rounded-xl border border-border p-3">
                <legend className="px-1 text-xs text-primary">{g.buyer}</legend>
                <div>
                  <FieldLabel>{t.table.name}</FieldLabel>
                  <input className={field} value={form.buyerName} onChange={(e) => set('buyerName', e.target.value)} />
                </div>
                <div>
                  <FieldLabel>{t.table.phone}</FieldLabel>
                  <input className={field} value={form.buyerPhone} onChange={(e) => set('buyerPhone', e.target.value)} placeholder="07xxxxxxxxx" />
                </div>
                <div>
                  <FieldLabel>{g.idNo}</FieldLabel>
                  <input className={field} value={form.buyerIdNo} onChange={(e) => set('buyerIdNo', e.target.value)} />
                </div>
              </fieldset>
              <div>
                <FieldLabel>{r.witness1 ?? g.witness1}</FieldLabel>
                <input className={field} value={form.witness1Name} onChange={(e) => set('witness1Name', e.target.value)} />
              </div>
              <div>
                <FieldLabel>{r.witness1Phone ?? t.table.phone}</FieldLabel>
                <input className={field} value={form.witness1Phone} onChange={(e) => set('witness1Phone', e.target.value)} />
              </div>
              <div>
                <FieldLabel>{r.witness2 ?? g.witness2}</FieldLabel>
                <input className={field} value={form.witness2Name} onChange={(e) => set('witness2Name', e.target.value)} />
              </div>
              <div>
                <FieldLabel>{r.witness2Phone ?? t.table.phone}</FieldLabel>
                <input className={field} value={form.witness2Phone} onChange={(e) => set('witness2Phone', e.target.value)} />
              </div>
              <div>
                <FieldLabel>
                  {r.guarantor ?? g.guarantor ?? 'ناوی کەفیل'}{' '}
                  <span className="font-normal text-muted-foreground">({g.optional ?? 'ئارەزوومەندانە'})</span>
                </FieldLabel>
                <input
                  className={field}
                  value={form.guarantorName}
                  onChange={(e) => set('guarantorName', e.target.value)}
                  placeholder={g.optionalHint ?? 'بەتاڵ جێبهێڵە ئەگەر نییە'}
                />
              </div>
              <div>
                <FieldLabel>
                  {r.guarantorPhone ?? g.guarantorPhone ?? 'مۆبایلی کەفیل'}{' '}
                  <span className="font-normal text-muted-foreground">({g.optional ?? 'ئارەزوومەندانە'})</span>
                </FieldLabel>
                <input
                  className={field}
                  value={form.guarantorPhone}
                  onChange={(e) => set('guarantorPhone', e.target.value)}
                  placeholder="07xxxxxxxxx"
                />
              </div>
              <div>
                <FieldLabel>
                  {g.lawyer ?? 'ناوی پارێزەر'}{' '}
                  <span className="font-normal text-muted-foreground">({g.optional ?? 'ئارەزوومەندانە'})</span>
                </FieldLabel>
                <input
                  className={field}
                  value={form.lawyerName}
                  onChange={(e) => set('lawyerName', e.target.value)}
                  placeholder={g.optionalHint ?? 'بەتاڵ جێبهێڵە ئەگەر نییە'}
                />
              </div>
              <div>
                <FieldLabel>
                  {g.lawyerPhone ?? 'مۆبایلی پارێزەر'}{' '}
                  <span className="font-normal text-muted-foreground">({g.optional ?? 'ئارەزوومەندانە'})</span>
                </FieldLabel>
                <input
                  className={field}
                  value={form.lawyerPhone}
                  onChange={(e) => set('lawyerPhone', e.target.value)}
                  placeholder="07xxxxxxxxx"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-base font-semibold mb-1">{g.propertySection ?? '٢) زانیارییەکانی موڵک'}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {g.propertyHint ?? 'کۆدی خانوو لە شوێنەکان، جۆر و ڕووبەر'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>{placesT.code ?? t.pages.projects.code}</FieldLabel>
                <select
                  className={field}
                  value={form.houseCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const place = placeOptions.find((p) => p.code === code);
                    setForm((prev) => ({
                      ...prev,
                      houseCode: code,
                      location: place ? placeLocationLabel(place) : prev.location,
                      title: prev.title || (place ? place.name : prev.title),
                    }));
                  }}
                >
                  <option value="">{placesT.selectPlace ?? 'شوێن هەڵبژێرە'}</option>
                  {form.houseCode && !placeOptions.some((p) => p.code === form.houseCode) ? (
                    <option value={form.houseCode}>{form.houseCode}</option>
                  ) : null}
                  {placeOptions.map((p) => (
                    <option key={p.id} value={p.code}>
                      {placeSelectLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>{g.propertyType}</FieldLabel>
                <select
                  className={field}
                  value={form.propertyType}
                  onChange={(e) => set('propertyType', e.target.value as ContractFormState['propertyType'])}
                >
                  {PROPERTY_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {typeLabels[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>{r.area ?? g.area ?? 'ڕووبەر (م٢)'}</FieldLabel>
                <input
                  type="number"
                  className={cn(field, 'tabular-nums')}
                  value={form.areaSqm}
                  onChange={(e) => set('areaSqm', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <FieldLabel>{g.tapu}</FieldLabel>
                <input className={field} value={form.tapuCode} onChange={(e) => set('tapuCode', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>{t.pages.projects.location ?? 'شوێن'}</FieldLabel>
                <input className={field} value={form.location} onChange={(e) => set('location', e.target.value)} />
              </div>
              <div>
                <FieldLabel>{g.kind}</FieldLabel>
                <select
                  className={field}
                  value={form.kind}
                  onChange={(e) => {
                    const kind = e.target.value as ContractFormState['kind'];
                    setForm((prev) => ({
                      ...prev,
                      kind,
                      legalConditions: defaultLegalConditions(lang, kind),
                    }));
                  }}
                >
                  <option value="SALE">{g.kindSale}</option>
                  <option value="PURCHASE">{g.kindPurchase}</option>
                </select>
              </div>
              <div>
                <FieldLabel>{t.table.name}</FieldLabel>
                <input className={field} value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-base font-semibold mb-1">{g.voucherSection ?? '٣) پسووڵە / پارەدان'}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {g.voucherHint ?? 'نرخ، پێشەکی، ماوە، سزا و خزمەتگوزاری'}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => set('currency', 'IQD')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border',
                  form.currency === 'IQD' ? 'bg-primary text-primary-foreground border-primary' : 'border-border',
                )}
              >
                {r.dinar ?? 'دینار'}
              </button>
              <button
                type="button"
                onClick={() => set('currency', 'USD')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border',
                  form.currency === 'USD' ? 'bg-primary text-primary-foreground border-primary' : 'border-border',
                )}
              >
                {r.dollar ?? 'دۆلار'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>{g.totalPrice}</FieldLabel>
                <input
                  type="number"
                  className={cn(field, 'tabular-nums')}
                  value={form.totalAmount || ''}
                  onChange={(e) => set('totalAmount', Number(e.target.value) || 0)}
                />
                <MoneyHint amount={form.totalAmount} currency={form.currency} rate={form.exchangeRate} lang={lang} t={t} />
              </div>
              <div>
                <FieldLabel>{g.downPayment}</FieldLabel>
                <input
                  type="number"
                  className={cn(field, 'tabular-nums')}
                  value={form.downPayment || ''}
                  onChange={(e) => set('downPayment', Number(e.target.value) || 0)}
                />
                <MoneyHint amount={form.downPayment} currency={form.currency} rate={form.exchangeRate} lang={lang} t={t} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.downPaymentHeld}
                    onChange={(e) => set('downPaymentHeld', e.target.checked)}
                  />
                  {g.downPaymentHeld ?? 'پێشەکی لای عەقارات دەمێنێتەوە'}
                </label>
              </div>
              <div>
                <FieldLabel>{g.remaining}</FieldLabel>
                <p className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm font-semibold tabular-nums text-rose-600">
                  {remaining.toLocaleString(lang === 'en' ? 'en' : 'ar-IQ')}
                </p>
              </div>
              <div>
                <FieldLabel>{g.remainingDueDate ?? 'ڕێکەوتی پێدانی بڕی ماوە'}</FieldLabel>
                <input
                  type="date"
                  className={field}
                  value={form.remainingDueDate}
                  onChange={(e) => set('remainingDueDate', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{g.cancelFee ?? 'سزای هەڵوەشاندنەوە'}</FieldLabel>
                <input
                  type="number"
                  className={cn(field, 'tabular-nums')}
                  value={form.cancelFee || ''}
                  onChange={(e) => set('cancelFee', Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <FieldLabel>{g.dailyPenalty ?? 'کرێی ڕۆژانە دواکەوتن'}</FieldLabel>
                <input
                  type="number"
                  className={cn(field, 'tabular-nums')}
                  value={form.dailyPenalty || ''}
                  onChange={(e) => set('dailyPenalty', Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold">
                {g.commissionSection ?? '٤) دەستخۆشی لە هەردوو لا'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {g.commissionHint ??
                  'پارەی دەستخۆشی کە لە فرۆشیار و لە کڕیار وەردەگیرێت — جیا بنووسە، کۆی گشتی خۆکارانە دەردەکەوێت'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
                <FieldLabel>{g.commissionSeller ?? 'لە فرۆشیار'}</FieldLabel>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={cn(field, 'tabular-nums bg-background')}
                  value={form.commissionSeller || ''}
                  onChange={(e) => set('commissionSeller', Number(e.target.value) || 0)}
                  placeholder="0"
                />
                <MoneyHint
                  amount={form.commissionSeller}
                  currency={form.currency}
                  rate={form.exchangeRate}
                  lang={lang}
                  t={t}
                />
              </div>
              <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3">
                <FieldLabel>{g.commissionBuyer ?? 'لە کڕیار'}</FieldLabel>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={cn(field, 'tabular-nums bg-background')}
                  value={form.commissionBuyer || ''}
                  onChange={(e) => set('commissionBuyer', Number(e.target.value) || 0)}
                  placeholder="0"
                />
                <MoneyHint
                  amount={form.commissionBuyer}
                  currency={form.currency}
                  rate={form.exchangeRate}
                  lang={lang}
                  t={t}
                />
              </div>
            </div>
            <div className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm font-medium text-emerald-900">
                {g.commissionTotalBoth ?? 'کۆی دەستخۆشی لە هەردوو لا'}
              </p>
              <p className="text-base font-bold tabular-nums text-emerald-800">
                {
                  formatContractMoney(
                    (form.commissionSeller || 0) + (form.commissionBuyer || 0),
                    form.currency,
                    form.exchangeRate,
                    lang,
                  ).primary
                }
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold">{g.installments}</h3>
              <button
                type="button"
                onClick={addInstallment}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.common.add}
              </button>
            </div>
            <div className="space-y-2">
              {form.installments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">{g.installmentsEmpty ?? 'هیچ قیستێک زیاد نەکراوە'}</p>
              ) : (
                form.installments.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <input
                      type="date"
                      className={field}
                      value={row.dueDate}
                      onChange={(e) => updateInstallment(row.id, { dueDate: e.target.value })}
                    />
                    <input
                      type="number"
                      className={cn(field, 'tabular-nums')}
                      placeholder={g.totalPrice}
                      value={row.amount || ''}
                      onChange={(e) => updateInstallment(row.id, { amount: Number(e.target.value) || 0 })}
                    />
                    <input
                      className={field}
                      placeholder={t.form.notes}
                      value={row.label}
                      onChange={(e) => updateInstallment(row.id, { label: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeInstallment(row.id)}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">{g.metaSection ?? 'بەروار و تێبینی'}</h3>
            <div>
              <FieldLabel>{g.handoverDate ?? 'ڕێکەوتی ڕادەستکردنی موڵک'}</FieldLabel>
              <input type="date" className={field} value={form.handoverDate} onChange={(e) => set('handoverDate', e.target.value)} />
            </div>
            <div>
              <FieldLabel>{g.signingDate}</FieldLabel>
              <input type="date" className={field} value={form.signingDate} onChange={(e) => set('signingDate', e.target.value)} />
            </div>
            <div>
              <FieldLabel>{r.organizer ?? g.organizer ?? 'ڕێکخەری گرێبەست'}</FieldLabel>
              <input className={field} value={form.organizerName} onChange={(e) => set('organizerName', e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showOrganizer} onChange={(e) => set('showOrganizer', e.target.checked)} />
              {r.showOrganizer ?? g.showOrganizer ?? 'ناوی ڕێکخەر لە گرێبەستدا پیشان بدرێت'}
            </label>
            <DealEmployeeSelect
              className={field}
              value={form.dealEmployeeId}
              onChange={(id) => set('dealEmployeeId', id)}
              label={g.dealEmployee ?? 'کارمەندی کرین و فرۆشتن'}
              hint={g.dealEmployeeHint ?? 'بۆ هەژماری کارمەند — لەسەر پەڕەی گرێبەست دەرناکەوێت'}
              placeholder={g.dealEmployeeNone ?? 'کارمەند هەڵبژێرە'}
            />
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">
                {g.scopeLabel ?? 'جۆری گرێبەست (ناوخۆیی / دەرەکی)'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('isExternal', false)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium border',
                    !form.isExternal
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {g.scopeInternal ?? 'ناوخۆیی'}
                </button>
                <button
                  type="button"
                  onClick={() => set('isExternal', true)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium border',
                    form.isExternal
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {g.scopeExternal ?? 'دەرەکی'}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {form.isExternal
                  ? (g.scopeExternalHint ?? 'ئەم گرێبەستە دەرەکییە')
                  : (g.scopeInternalHint ?? 'ئەم گرێبەستە ناوخۆییە')}
              </p>
            </div>
            <div>
              <FieldLabel>{t.form.notes}</FieldLabel>
              <textarea className={cn(field, 'min-h-[80px] resize-y')} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <div>
              <FieldLabel>{r.staffNote ?? g.staffNote ?? 'تێبینی بۆ کارمەند'}</FieldLabel>
              <textarea className={cn(field, 'min-h-[80px] resize-y')} value={form.staffNote} onChange={(e) => set('staffNote', e.target.value)} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
