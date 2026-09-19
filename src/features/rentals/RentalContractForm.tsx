'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { cn, formatCurrency, formatContractMoney } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import { BRAND_NAME } from '@/lib/brand';
import { placeSelectLabel, type PlaceOption } from '@/lib/places';
import { DealEmployeeSelect } from '@/features/deals/DealEmployeeSelect';
import type { Dictionary } from '@/i18n/dictionaries';

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
      {currency === 'IQD'
        ? `${t.pages.contractGen.equivUsd}: ${m.usd}`
        : `${t.pages.contractGen.equivIqd}: ${m.iqd}`}
    </p>
  );
}

type ScheduleRow = { dueDate: string; amountIqd: number; label: string };

export type LeaseEditData = {
  id: string;
  leaseNo: string;
  propertyCode: string;
  propertyName: string | null;
  landlordName: string | null;
  landlordPhone: string | null;
  tenantName: string;
  tenantPhone: string | null;
  witness1Name: string | null;
  witness1Phone: string | null;
  witness2Name: string | null;
  witness2Phone: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  propertyType: 'HOUSE' | 'APARTMENT' | 'LAND' | 'SHOP' | 'BUILDING';
  areaSqm: number | null;
  rentPurpose: string | null;
  startDate: string;
  endDate: string;
  durationMonths: number | null;
  signingDate: string | null;
  currency: 'IQD' | 'USD';
  exchangeRate: number;
  monthlyRentIqd: number;
  advancePaymentIqd: number;
  securityDepositIqd: number;
  dailyPenaltyIqd: number;
  cancelFeeIqd: number;
  lateFeeIqd: number;
  commissionTenantIqd: number;
  commissionLandlordIqd: number;
  propertyStatusNote: string | null;
  notes: string | null;
  staffNote: string | null;
  organizerName: string | null;
  showOrganizer: boolean;
  dealEmployeeId?: string | null;
  dealEmployeeName?: string | null;
  paymentSchedule: string | null;
};

type FormState = {
  landlordName: string;
  landlordPhone: string;
  tenantName: string;
  tenantPhone: string;
  witness1Name: string;
  witness1Phone: string;
  witness2Name: string;
  witness2Phone: string;
  guarantorName: string;
  guarantorPhone: string;
  propertyCode: string;
  propertyName: string;
  propertyType: 'HOUSE' | 'APARTMENT' | 'LAND' | 'SHOP' | 'BUILDING';
  areaSqm: string;
  rentPurpose: string;
  startDate: string;
  endDate: string;
  durationMonths: string;
  signingDate: string;
  currency: 'IQD' | 'USD';
  monthlyRent: string;
  advancePayment: string;
  securityDeposit: string;
  dailyPenalty: string;
  cancelFee: string;
  lateFee: string;
  commissionTenant: string;
  commissionLandlord: string;
  propertyStatusNote: string;
  notes: string;
  staffNote: string;
  organizerName: string;
  showOrganizer: boolean;
  dealEmployeeId: string;
};

const emptyForm = (): FormState => ({
  landlordName: '',
  landlordPhone: '',
  tenantName: '',
  tenantPhone: '',
  witness1Name: '',
  witness1Phone: '',
  witness2Name: '',
  witness2Phone: '',
  guarantorName: '',
  guarantorPhone: '',
  propertyCode: '',
  propertyName: '',
  propertyType: 'HOUSE',
  areaSqm: '',
  rentPurpose: 'residential',
  startDate: '',
  endDate: '',
  durationMonths: '12',
  signingDate: '',
  currency: 'IQD',
  monthlyRent: '',
  advancePayment: '',
  securityDeposit: '',
  dailyPenalty: '',
  cancelFee: '',
  lateFee: '',
  commissionTenant: '',
  commissionLandlord: '',
  propertyStatusNote: '',
  notes: '',
  staffNote: '',
  organizerName: BRAND_NAME,
  showOrganizer: true,
  dealEmployeeId: '',
});

function toIqd(amount: number, currency: 'IQD' | 'USD', rate: number) {
  return currency === 'USD' ? amount * rate : amount;
}

function iqdToInput(iqd: number, currency: 'IQD' | 'USD', rate: number) {
  if (!iqd) return '';
  if (currency === 'USD') return String(Number((iqd / Math.max(1, rate)).toFixed(2)));
  return String(iqd);
}

function isoDay(value: string | null | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

function splitUserNotes(notes: string | null) {
  if (!notes) return '';
  const idx = notes.indexOf('\n---\n');
  if (idx >= 0) return notes.slice(0, idx).trim();
  if (notes.startsWith('بەندی')) return '';
  return notes;
}

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[12px] font-semibold text-foreground/80">
      {children}
    </label>
  );
}

export function RentalContractForm({
  t,
  lang,
  open,
  onClose,
  onSaved,
  lease,
}: {
  t: Dictionary;
  lang: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  lease?: LeaseEditData | null;
}) {
  const usdToIqd = useFxStore((s) => s.usdToIqd);
  const [form, setForm] = useState(emptyForm);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [placeOptions, setPlaceOptions] = useState<PlaceOption[]>([]);
  const editing = Boolean(lease?.id);

  const placesT = t.pages.places as Record<string, string>;
  const r = t.pages.rentals as Record<string, string>;
  const L = {
    title: editing
      ? (r.editContract ?? 'دەستکاری گرێبەستی کرێ')
      : (r.addContract ?? 'زیادکردنی گرێبەستی کرێ'),
    hint: editing
      ? (r.editContractHint ?? 'بەروار، بڕی پارە، لایەنەکان و وردەکاری دەستکاری بکە')
      : (r.addContractHint ?? 'ناوی لایەنەکان، موڵک، بڕی پارە و خشتەی کرێ'),
    parties: r.parties ?? '١) لایەنەکان',
    details: r.details ?? '٢) وردەکاری موڵک و ماوە',
    voucher: r.voucher ?? '٣) بڕی پارە و کرێ',
    scheduleTitle: r.scheduleTitle ?? '٤) خشتەی پێدانی کرێ',
    landlord: r.landlord ?? 'ناوی بەکرێدەر (خاوەن موڵک)',
    landlordPhone: r.landlordPhone ?? 'مۆبایلی بەکرێدەر',
    tenant: r.tenant ?? 'ناوی کرێچی',
    tenantPhone: 'مۆبایلی کرێچی',
    witness1: r.witness1 ?? 'ناوی شایەدی یەکەم',
    witness1Phone: r.witness1Phone ?? 'مۆبایلی شایەدی یەکەم',
    witness2: r.witness2 ?? 'ناوی شایەدی دووەم',
    witness2Phone: r.witness2Phone ?? 'مۆبایلی شایەدی دووەم',
    guarantor: r.guarantor ?? 'ناوی کەفیل',
    guarantorPhone: r.guarantorPhone ?? 'مۆبایلی کەفیل',
    houseCode: placesT.code ?? t.pages.projects.code ?? 'کۆدی خانوو',
    selectPlace: placesT.selectPlace ?? 'شوێن هەڵبژێرە',
    property: t.pdf.property ?? 'ناوی موڵک / شوێن',
    propertyType: t.pages.contractGen.propertyType ?? 'جۆری موڵک',
    area: r.area ?? 'ڕووبەر (مەتر دووجا)',
    purpose: r.purpose ?? 'مەبەستی بەکرێگرتن',
    purposeResidential: r.purposeResidential ?? 'نیشتەجێبوون',
    purposeCommercial: r.purposeCommercial ?? 'بازرگانی',
    duration: r.duration ?? 'ماوەی کرێ (بە مانگ)',
    rentStart: r.rentStart ?? 'بەرواری دەستپێکی کرێ',
    endDate: t.pages.contracts.endDate ?? 'بەرواری کۆتایی کرێ',
    signingDate: r.signingDate ?? 'بەرواری واژووکردنی گرێبەست',
    organizer: r.organizer ?? 'ڕێکخەری گرێبەست',
    showOrganizer: r.showOrganizer ?? 'ناوی ڕێکخەر لە گرێبەستدا پیشان بدرێت',
    dealEmployee: r.dealEmployee ?? 'کارمەندی بەکرێدان',
    dealEmployeeHint:
      r.dealEmployeeHint ?? 'دەستخۆشی دەچێتە سەر هەژماری ئەم کارمەندە — لەسەر پەڕەی گرێبەست دەرناکەوێت',
    dealEmployeeNone: r.dealEmployeeNone ?? 'کارمەند هەڵبژێرە',
    dinar: r.dinar ?? 'دینار',
    dollar: r.dollar ?? 'دۆلار',
    monthlyRent: r.monthlyRent ?? 'کرێی مانگانە',
    advance: r.advance ?? 'پارەی پێشەکی',
    deposit: r.deposit ?? 'بارمتە / تأمینات',
    dailyPenalty: r.dailyPenalty ?? 'کرێی ڕۆژانە دوای بەسەرچوون',
    cancelFee: r.cancelFee ?? 'سزای هەڵوەشاندنەوەی گرێبەست',
    lateFee: r.lateFee ?? 'سزای دواکەوتنی پارەدان',
    commissionTenant: r.commissionTenant ?? 'دەستخۆشی وەرگیراو لە کرێچی',
    commissionLandlord: r.commissionLandlord ?? 'دەستخۆشی وەرگیراو لە بەکرێدەر',
    buildSchedule: r.buildSchedule ?? 'دروستکردنی خشتەی پارەدان',
    scheduleHint:
      r.scheduleHint ?? 'سەرەتا بەرواری دەستپێک، کرێی مانگانە و ماوە پڕ بکەرەوە، پاشان خشتە دروست بکە.',
    scheduleNeedFields: r.scheduleNeedFields ?? 'بەرواری دەستپێک، کرێی مانگانە و ماوە پێویستن',
    scheduleEmpty: r.scheduleEmpty ?? 'هیچ خشتەیەکی پارەدان نییە',
    scheduledTotal: r.scheduledTotal ?? 'کۆی خشتە',
    payDate: r.payDate ?? 'ڕێکەوتی پارەدان',
    month: r.month ?? 'مانگ',
    propertyStatus: r.propertyStatus ?? 'دۆخی موڵک (وەسف)',
    notes: t.form.notes ?? 'تێبینی گشتی',
    staffNote: r.staffNote ?? 'تێبینی ناوخۆیی بۆ کارمەند',
    houseMissing: r.houseMissing ?? 'کۆدی خانوو نەدۆزرایەوە',
  };

  useEffect(() => {
    if (!open) return;
    void fetch('/api/places')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) setPlaceOptions(data.items as PlaceOption[]);
      })
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (!lease) {
      setForm(emptyForm());
      setSchedule([]);
      return;
    }
    const currency = lease.currency === 'USD' ? 'USD' : 'IQD';
    const rate = Math.max(1, lease.exchangeRate || usdToIqd);
    setForm({
      landlordName: lease.landlordName ?? '',
      landlordPhone: lease.landlordPhone ?? '',
      tenantName: lease.tenantName ?? '',
      tenantPhone: lease.tenantPhone ?? '',
      witness1Name: lease.witness1Name ?? '',
      witness1Phone: lease.witness1Phone ?? '',
      witness2Name: lease.witness2Name ?? '',
      witness2Phone: lease.witness2Phone ?? '',
      guarantorName: lease.guarantorName ?? '',
      guarantorPhone: lease.guarantorPhone ?? '',
      propertyCode: lease.propertyCode ?? '',
      propertyName: lease.propertyName ?? '',
      propertyType: lease.propertyType ?? 'HOUSE',
      areaSqm: lease.areaSqm != null ? String(lease.areaSqm) : '',
      rentPurpose: lease.rentPurpose || 'residential',
      startDate: isoDay(lease.startDate),
      endDate: isoDay(lease.endDate),
      durationMonths: lease.durationMonths != null ? String(lease.durationMonths) : '',
      signingDate: isoDay(lease.signingDate),
      currency,
      monthlyRent: iqdToInput(lease.monthlyRentIqd, currency, rate),
      advancePayment: iqdToInput(lease.advancePaymentIqd, currency, rate),
      securityDeposit: iqdToInput(lease.securityDepositIqd, currency, rate),
      dailyPenalty: iqdToInput(lease.dailyPenaltyIqd, currency, rate),
      cancelFee: iqdToInput(lease.cancelFeeIqd, currency, rate),
      lateFee: iqdToInput(lease.lateFeeIqd, currency, rate),
      commissionTenant: iqdToInput(lease.commissionTenantIqd, currency, rate),
      commissionLandlord: iqdToInput(lease.commissionLandlordIqd, currency, rate),
      propertyStatusNote: lease.propertyStatusNote ?? '',
      notes: splitUserNotes(lease.notes),
      staffNote: lease.staffNote ?? '',
      organizerName: lease.organizerName ?? BRAND_NAME,
      showOrganizer: lease.showOrganizer ?? true,
      dealEmployeeId: lease.dealEmployeeId ?? '',
    });
    try {
      const parsed = lease.paymentSchedule
        ? (JSON.parse(lease.paymentSchedule) as ScheduleRow[])
        : [];
      setSchedule(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSchedule([]);
    }
  }, [open, lease, usdToIqd]);

  const field =
    'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/45';

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const moneyIqd = (raw: string) => toIqd(Number(raw) || 0, form.currency, usdToIqd);
  const fromIqd = (iqd: number) => (form.currency === 'USD' ? iqd / Math.max(1, usdToIqd) : iqd);
  const moneyLabel = form.currency === 'IQD' ? L.dinar : L.dollar;

  const summary = useMemo(() => {
    const rent = Number(form.monthlyRent) || 0;
    const advance = Number(form.advancePayment) || 0;
    const deposit = Number(form.securityDeposit) || 0;
    const cTenant = Number(form.commissionTenant) || 0;
    const cLandlord = Number(form.commissionLandlord) || 0;
    const scheduledIqd = schedule.reduce((s, row) => s + row.amountIqd, 0);
    const scheduled = form.currency === 'USD' ? scheduledIqd / Math.max(1, usdToIqd) : scheduledIqd;
    return { rent, advance, deposit, cTenant, cLandlord, scheduled };
  }, [form, schedule, usdToIqd]);

  const setCurrency = (c: 'IQD' | 'USD') => {
    setForm((f) => ({ ...f, currency: c }));
    setSchedule((rows) => {
      if (!rows.length) return rows;
      const amount = toIqd(Number(form.monthlyRent) || 0, c, usdToIqd);
      return rows.map((row) => ({ ...row, amountIqd: amount }));
    });
  };

  const buildSchedule = () => {
    setError('');
    if (!form.startDate || !form.monthlyRent || !form.durationMonths) {
      setError(L.scheduleNeedFields);
      return;
    }
    const months = Math.max(1, Number(form.durationMonths) || 1);
    const amount = moneyIqd(form.monthlyRent);
    const rows: ScheduleRow[] = [];
    for (let i = 0; i < months; i++) {
      rows.push({
        dueDate: addMonths(form.startDate, i),
        amountIqd: amount,
        label: `${L.month} ${i + 1}`,
      });
    }
    setSchedule(rows);
    if (!form.endDate) set('endDate', addMonths(form.startDate, months));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.propertyCode || !form.tenantName || !form.startDate || !form.endDate || !form.monthlyRent) {
      setError(t.pages.projects.required);
      return;
    }
    setSaving(true);
    const payload = {
      propertyCode: form.propertyCode,
      propertyName: form.propertyName || null,
      landlordName: form.landlordName || null,
      landlordPhone: form.landlordPhone || null,
      tenantName: form.tenantName,
      tenantPhone: form.tenantPhone || null,
      witness1Name: form.witness1Name || null,
      witness1Phone: form.witness1Phone || null,
      witness2Name: form.witness2Name || null,
      witness2Phone: form.witness2Phone || null,
      guarantorName: form.guarantorName || null,
      guarantorPhone: form.guarantorPhone || null,
      propertyType: form.propertyType,
      areaSqm: form.areaSqm === '' ? null : Number(form.areaSqm),
      rentPurpose: form.rentPurpose || null,
      startDate: form.startDate,
      endDate: form.endDate,
      durationMonths: form.durationMonths === '' ? null : Number(form.durationMonths),
      signingDate: form.signingDate || null,
      currency: form.currency,
      exchangeRate: usdToIqd,
      monthlyRentIqd: moneyIqd(form.monthlyRent),
      advancePaymentIqd: moneyIqd(form.advancePayment),
      securityDepositIqd: moneyIqd(form.securityDeposit),
      dailyPenaltyIqd: moneyIqd(form.dailyPenalty),
      cancelFeeIqd: moneyIqd(form.cancelFee),
      lateFeeIqd: moneyIqd(form.lateFee),
      commissionTenantIqd: moneyIqd(form.commissionTenant),
      commissionLandlordIqd: moneyIqd(form.commissionLandlord),
      propertyStatusNote: form.propertyStatusNote || null,
      notes: form.notes || null,
      staffNote: form.staffNote || null,
      organizerName: form.organizerName || null,
      showOrganizer: form.showOrganizer,
      dealEmployeeId: form.dealEmployeeId || null,
      paymentSchedule: schedule,
    };
    const res = await fetch(editing ? `/api/rentals/${lease!.id}` : '/api/rentals', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message === 'House code not found' ? L.houseMissing : t.pages.projects.error);
      return;
    }
    setForm(emptyForm());
    setSchedule([]);
    onSaved();
    onClose();
  };

  if (!open) return null;

  const moneyFields: { key: keyof FormState; label: string; hint: string }[] = [
    { key: 'monthlyRent', label: L.monthlyRent, hint: 'بڕی کرێ بۆ هەر مانگ' },
    { key: 'advancePayment', label: L.advance, hint: 'پارەی پێش دەستپێک' },
    { key: 'securityDeposit', label: L.deposit, hint: 'پارەی دەستەبەر' },
    { key: 'dailyPenalty', label: L.dailyPenalty, hint: 'بۆ هەر ڕۆژ دواکەوتن' },
    { key: 'cancelFee', label: L.cancelFee, hint: 'ئەگەر گرێبەست هەڵبوەشێتەوە' },
    { key: 'lateFee', label: L.lateFee, hint: 'دواکەوتنی پارەدان' },
    { key: 'commissionLandlord', label: L.commissionLandlord, hint: 'دەستخۆشی لە بەکرێدەر — جیا لە کرێچی' },
    { key: 'commissionTenant', label: L.commissionTenant, hint: 'دەستخۆشی لە کرێچی — جیا لە بەکرێدەر' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-sidebar/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[1280px] flex-col overflow-hidden rounded-none sm:rounded-2xl border border-border bg-[hsl(var(--background))] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{L.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{L.hint}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-muted" aria-label={t.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="flex-1 overflow-y-auto rh-scroll">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 p-5">
            <div className="space-y-5">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground mb-1">{L.parties}</h3>
                <p className="text-xs text-muted-foreground mb-4">ناوی خاوەن موڵک، کرێچی، شایەد و کەفیل</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>{L.landlord}</FieldLabel>
                    <input className={field} placeholder="ناوی تەواوی بەکرێدەر" value={form.landlordName} onChange={(e) => set('landlordName', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.landlordPhone}</FieldLabel>
                    <input className={field} placeholder="07xxxxxxxxx" value={form.landlordPhone} onChange={(e) => set('landlordPhone', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.tenant} *</FieldLabel>
                    <input className={field} placeholder="ناوی تەواوی کرێچی" value={form.tenantName} onChange={(e) => set('tenantName', e.target.value)} required />
                  </div>
                  <div>
                    <FieldLabel>{L.tenantPhone}</FieldLabel>
                    <input className={field} placeholder="07xxxxxxxxx" value={form.tenantPhone} onChange={(e) => set('tenantPhone', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.witness1}</FieldLabel>
                    <input className={field} placeholder="ناوی شایەد" value={form.witness1Name} onChange={(e) => set('witness1Name', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.witness1Phone}</FieldLabel>
                    <input className={field} placeholder="07xxxxxxxxx" value={form.witness1Phone} onChange={(e) => set('witness1Phone', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.witness2}</FieldLabel>
                    <input className={field} placeholder="ناوی شایەد" value={form.witness2Name} onChange={(e) => set('witness2Name', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.witness2Phone}</FieldLabel>
                    <input className={field} placeholder="07xxxxxxxxx" value={form.witness2Phone} onChange={(e) => set('witness2Phone', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>
                      {L.guarantor}{' '}
                      <span className="font-normal text-muted-foreground">
                        ({(t.pages.contractGen as { optional?: string }).optional ?? 'ئارەزوومەندانە'})
                      </span>
                    </FieldLabel>
                    <input className={field} placeholder="ناوی کەفیل (ئەگەر هەبێت)" value={form.guarantorName} onChange={(e) => set('guarantorName', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>
                      {L.guarantorPhone}{' '}
                      <span className="font-normal text-muted-foreground">
                        ({(t.pages.contractGen as { optional?: string }).optional ?? 'ئارەزوومەندانە'})
                      </span>
                    </FieldLabel>
                    <input className={field} placeholder="07xxxxxxxxx" value={form.guarantorPhone} onChange={(e) => set('guarantorPhone', e.target.value)} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground mb-1">{L.details}</h3>
                <p className="text-xs text-muted-foreground mb-4">کۆدی خانوو، جۆر، ڕووبەر و بەروارەکان</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>{L.houseCode} *</FieldLabel>
                    <select
                      className={field}
                      value={form.propertyCode}
                      required
                      onChange={(e) => {
                        const code = e.target.value;
                        const place = placeOptions.find((p) => p.code === code);
                        setForm((prev) => ({
                          ...prev,
                          propertyCode: code,
                          propertyName: place?.name || prev.propertyName,
                        }));
                      }}
                    >
                      <option value="">{L.selectPlace}</option>
                      {form.propertyCode &&
                      !placeOptions.some((p) => p.code === form.propertyCode) ? (
                        <option value={form.propertyCode}>{form.propertyCode}</option>
                      ) : null}
                      {placeOptions.map((p) => (
                        <option key={p.id} value={p.code}>
                          {placeSelectLabel(p)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      لە شوێنەکان هەڵیبژێرە — گەرەک و ناوی شوێن
                    </p>
                  </div>
                  <div>
                    <FieldLabel>{L.property}</FieldLabel>
                    <input className={field} placeholder="ناوی خانوو یان شوێن" value={form.propertyName} onChange={(e) => set('propertyName', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.propertyType}</FieldLabel>
                    <select className={field} value={form.propertyType} onChange={(e) => set('propertyType', e.target.value as FormState['propertyType'])}>
                      <option value="HOUSE">{t.pages.contractGen.typeHouse}</option>
                      <option value="APARTMENT">{t.pages.contractGen.typeApartment}</option>
                      <option value="SHOP">{t.pages.contractGen.typeShop}</option>
                      <option value="BUILDING">{t.pages.contractGen.typeBuilding}</option>
                      <option value="LAND">{t.pages.contractGen.typeLand}</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>{L.area}</FieldLabel>
                    <input type="number" className={cn(field, 'tabular-nums')} placeholder="بۆ نموونە 150" value={form.areaSqm} onChange={(e) => set('areaSqm', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.purpose}</FieldLabel>
                    <select className={field} value={form.rentPurpose} onChange={(e) => set('rentPurpose', e.target.value)}>
                      <option value="residential">{L.purposeResidential}</option>
                      <option value="commercial">{L.purposeCommercial}</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>{L.duration}</FieldLabel>
                    <input type="number" min="1" className={cn(field, 'tabular-nums')} placeholder="12" value={form.durationMonths} onChange={(e) => set('durationMonths', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.rentStart} *</FieldLabel>
                    <input type="date" className={field} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
                  </div>
                  <div>
                    <FieldLabel>{L.endDate} *</FieldLabel>
                    <input type="date" className={field} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} required />
                  </div>
                  <div>
                    <FieldLabel>{L.signingDate}</FieldLabel>
                    <input type="date" className={field} value={form.signingDate} onChange={(e) => set('signingDate', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>{L.organizer}</FieldLabel>
                    <input className={field} value={form.organizerName} onChange={(e) => set('organizerName', e.target.value)} />
                  </div>
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={form.showOrganizer} onChange={(e) => set('showOrganizer', e.target.checked)} />
                  {L.showOrganizer}
                </label>
                <div className="mt-4">
                  <DealEmployeeSelect
                    className={field}
                    value={form.dealEmployeeId}
                    onChange={(id) => set('dealEmployeeId', id)}
                    label={L.dealEmployee ?? 'کارمەندی بەکرێدان'}
                    hint={L.dealEmployeeHint ?? 'بۆ هەژماری کارمەند — لەسەر پەڕەی گرێبەست دەرناکەوێت'}
                    placeholder={L.dealEmployeeNone ?? 'کارمەند هەڵبژێرە'}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{L.voucher}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">کرێ، پێشەکی، بارمتە و دەستخۆشی</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-border p-1 bg-muted/40">
                      {(['IQD', 'USD'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCurrency(c)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                            form.currency === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {c === 'IQD' ? L.dinar : L.dollar}
                        </button>
                      ))}
                    </div>
                    {form.currency === 'USD' ? (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        $1 = {usdToIqd.toLocaleString('en-US')} IQD
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {moneyFields.map(({ key, label, hint }) => (
                    <div key={key}>
                      <FieldLabel>
                        {label} ({moneyLabel}){key === 'monthlyRent' ? ' *' : ''}
                      </FieldLabel>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className={cn(field, 'tabular-nums')}
                        placeholder="0"
                        value={form[key] as string}
                        onChange={(e) => set(key, e.target.value)}
                        required={key === 'monthlyRent'}
                      />
                      <MoneyHint
                        amount={Number(form[key] as string) || 0}
                        currency={form.currency}
                        rate={usdToIqd}
                        lang={lang}
                        t={t}
                      />
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{L.scheduleTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">مانگانە چەند و کەی دەدرێت</p>
                  </div>
                  <button
                    type="button"
                    onClick={buildSchedule}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#254a78]"
                  >
                    <Plus className="h-4 w-4" />
                    {L.buildSchedule}
                  </button>
                </div>
                <p className="text-xs text-sky-900 bg-sky-500/10 border border-sky-500/20 rounded-xl px-3 py-2">{L.scheduleHint}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  {[
                    ['rent', L.monthlyRent, summary.rent],
                    ['advance', L.advance, summary.advance],
                    ['deposit', L.deposit, summary.deposit],
                    ['cTenant', L.commissionTenant, summary.cTenant],
                    ['cLandlord', L.commissionLandlord, summary.cLandlord],
                    ['scheduled', L.scheduledTotal, summary.scheduled],
                  ].map(([id, label, val]) => (
                    <div key={id} className="rounded-xl bg-muted/50 border border-border px-3 py-2">
                      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
                      <p className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(Number(val), lang, form.currency)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-[11px] font-semibold text-foreground/70">
                        <th className="px-3 py-2 text-start">#</th>
                        <th className="px-3 py-2 text-start">{L.payDate}</th>
                        <th className="px-3 py-2 text-start">{L.monthlyRent} ({moneyLabel})</th>
                        <th className="px-3 py-2 text-start">{t.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                            {L.scheduleEmpty}
                          </td>
                        </tr>
                      ) : (
                        schedule.map((row, i) => (
                          <tr key={`${row.dueDate}-${i}`} className="border-t border-border">
                            <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                            <td className="px-3 py-2 tabular-nums">{row.dueDate}</td>
                            <td className="px-3 py-2 tabular-nums font-medium">
                              {formatCurrency(fromIqd(row.amountIqd), lang, form.currency)}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setSchedule((s) => s.filter((_, idx) => idx !== i))}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div>
                  <FieldLabel>{L.propertyStatus}</FieldLabel>
                  <textarea
                    className={cn(field, 'min-h-[88px] resize-y')}
                    placeholder="دۆخی ئێستای موڵک بنووسە"
                    value={form.propertyStatusNote}
                    onChange={(e) => set('propertyStatusNote', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>{L.notes}</FieldLabel>
                  <textarea
                    className={cn(field, 'min-h-[88px] resize-y')}
                    placeholder="تێبینی بۆ گرێبەست"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>{L.staffNote}</FieldLabel>
                  <textarea
                    className={cn(field, 'min-h-[72px] resize-y')}
                    placeholder="تەنها کارمەند دەیبینێت"
                    value={form.staffNote}
                    onChange={(e) => set('staffNote', e.target.value)}
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-rose-600 bg-rose-500/10 rounded-xl px-3 py-2">{error}</p> : null}

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.common.save}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t.common.cancel}
              </button>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
