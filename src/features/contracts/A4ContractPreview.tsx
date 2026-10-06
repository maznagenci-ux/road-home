'use client';

import {
  BRAND_ADDRESS_KU,
  BRAND_COMPANY_KU,
  BRAND_NAME,
  BRAND_NAME_EN,
  BRAND_PHONES,
  BRAND_SLOGAN_EN,
  BRAND_SLOGAN_KU,
} from '@/lib/brand';
import { formatContractMoney } from '@/lib/utils';
import type { ContractFormState } from '@/lib/contracts/templates';
import type { Dictionary } from '@/i18n/dictionaries';

export function A4ContractPreview({
  t,
  lang,
  form,
  contractNo,
}: {
  t: Dictionary;
  lang: string;
  form: ContractFormState;
  contractNo?: string;
}) {
  const remaining = Math.max(0, form.totalAmount - form.downPayment);
  const rate = form.exchangeRate || 150_000;
  const total = formatContractMoney(form.totalAmount || 0, form.currency, rate, lang);
  const down = formatContractMoney(form.downPayment || 0, form.currency, rate, lang);
  const rest = formatContractMoney(remaining, form.currency, rate, lang);
  const g = t.pages.contractGen as Record<string, string>;

  const typeLabels: Record<string, string> = {
    HOUSE: g.typeHouse,
    APARTMENT: g.typeApartment,
    LAND: g.typeLand,
    SHOP: g.typeShop,
    BUILDING: g.typeBuilding,
  };

  const title =
    form.title ||
    g.contractTitleSaleRent ||
    g.contractTitle ||
    'گرێبەستی کڕین و فرۆشتن';
  const sellerLab = g.party1Seller ?? `لایەنی یەکەم (${g.seller ?? 'فرۆشیار'})`;
  const buyerLab = g.party2Buyer ?? `لایەنی دووەم (${g.buyer ?? 'کڕیار'})`;
  const mobileLab = g.mobileNo ?? t.table.phone;
  const phones = BRAND_PHONES.join('-');

  const Field = ({ lab, val }: { lab: string; val: string }) => (
    <div className="flex gap-1.5 border-b border-slate-200 py-0.5 text-[11px] leading-snug">
      <span className="shrink-0 font-bold text-[#0b2a55]">{lab} :</span>
      <span className="min-w-0 font-semibold text-slate-900">{val || '—'}</span>
    </div>
  );

  return (
    <div className="a4-sheet relative mx-auto overflow-hidden bg-white text-[#0b1f3a] shadow-2xl print:shadow-none">
      <div className="pointer-events-none absolute inset-[28%_18%_22%] flex items-center justify-center opacity-[0.05] select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.png" alt="" className="w-[48%] max-w-[220px]" />
      </div>

      <header className="relative mb-2 grid grid-cols-[72px_1fr_72px] items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt={BRAND_NAME} className="mx-auto h-[64px] w-[64px] object-contain" />
        <div className="text-center leading-snug">
          <p className="text-[14px] font-extrabold text-[#0b2a55]">{BRAND_COMPANY_KU}</p>
          <p className="mt-0.5 text-[12px] font-extrabold tracking-wide text-[#0b2a55] uppercase">
            {BRAND_NAME_EN}
          </p>
          <p className="mt-1 text-[15px] font-extrabold text-[#e8a012]">{BRAND_SLOGAN_KU}</p>
          <p className="mt-0.5 text-[11px] font-extrabold tracking-wider text-[#e8a012]">
            {BRAND_SLOGAN_EN}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="" className="mx-auto h-[64px] w-[64px] object-contain" />
      </header>

      <div className="relative mb-2 border-t-[1.5px] border-[#0b2a55] border-b-[3.5px] border-b-slate-800 py-0.5" />

      <div className="relative mb-3 rounded bg-[#111827] px-3 py-1.5 text-center text-[15px] font-extrabold text-white">
        {title}
      </div>

      <section className="relative mb-3 grid grid-cols-[0.95fr_1.15fr] gap-3">
        <div className="space-y-1 rounded border border-slate-300 bg-slate-100 px-2.5 py-2 text-[11px]">
          <div className="flex justify-between gap-2 border-b border-dotted border-slate-300 py-0.5">
            <span className="font-semibold text-slate-600">{g.contractNo}</span>
            <span className="font-extrabold tabular-nums" dir="ltr">
              {contractNo ?? g.draftNo}
            </span>
          </div>
          <div className="flex justify-between gap-2 border-b border-dotted border-slate-300 py-0.5">
            <span className="font-semibold text-slate-600">{g.contractDate ?? g.signingDate}</span>
            <span className="font-extrabold tabular-nums" dir="ltr">
              {form.signingDate || '—'}
            </span>
          </div>
          <div className="flex justify-between gap-2 py-0.5">
            <span className="font-semibold text-slate-600">{g.companyBranch}</span>
            <span className="font-extrabold">{form.location || BRAND_ADDRESS_KU}</span>
          </div>
        </div>
        <div>
          <Field lab={sellerLab} val={form.sellerName} />
          <Field lab={mobileLab} val={form.sellerPhone} />
          <Field lab={buyerLab} val={form.buyerName} />
          <Field lab={mobileLab} val={form.buyerPhone} />
          <Field lab={g.propertyType ?? 'جۆری موڵک'} val={typeLabels[form.propertyType] ?? form.propertyType} />
          <Field lab={g.address ?? 'ناونیشان'} val={form.location} />
          <Field lab={g.propertyNo ?? 'ژمارەی موڵک'} val={form.houseCode || form.tapuCode} />
          <Field
            lab={g.areaShort ?? 'ڕووبەر'}
            val={form.areaSqm ? `${form.areaSqm} م٢` : '—'}
          />
        </div>
      </section>

      <p className="relative mb-2 text-[12px] font-bold leading-relaxed">
        {g.pdfIntroShort ?? 'هەردوو لایەن ڕێکەوتن لەسەر ئەم خاڵانەی خوارەوە:'}
      </p>

      <section className="relative mb-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded border border-slate-200 bg-slate-50 px-2 py-2">
          <p className="text-slate-500">{g.totalPrice}</p>
          <p className="mt-0.5 font-bold tabular-nums">{total.primary}</p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 px-2 py-2">
          <p className="text-slate-500">{g.downPayment}</p>
          <p className="mt-0.5 font-bold tabular-nums text-teal-800">{down.primary}</p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 px-2 py-2">
          <p className="text-slate-500">{g.remaining}</p>
          <p className="mt-0.5 font-bold tabular-nums">{rest.primary}</p>
        </div>
      </section>

      {form.legalConditions ? (
        <section className="relative mb-4">
          <pre className="whitespace-pre-wrap font-[inherit] text-[11px] leading-6 text-slate-700">
            {form.legalConditions}
          </pre>
        </section>
      ) : null}

      <footer className="relative mt-auto space-y-4 border-t border-slate-300 pt-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[11px]">
          {[
            { lab: sellerLab, name: form.sellerName },
            { lab: buyerLab, name: form.buyerName },
            { lab: `${g.witnessSign} (١)`, name: form.witness1Name },
            { lab: `${g.witnessSign} (٢)`, name: form.witness2Name },
          ].map((s) => (
            <div key={s.lab} className="text-center">
              <p className="mb-3 text-start font-extrabold text-[#0b1f3a]">{s.lab} :</p>
              <div className="mx-1 mb-1.5 h-7 border-b-[1.5px] border-slate-600" />
              <p className="font-bold">{s.name || ''}</p>
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between gap-3 border-t-[3px] border-[#0b2a55] pt-2 text-[11px] font-bold text-[#0b2a55]">
          <span>{BRAND_NAME}</span>
          <div className="text-end leading-snug">
            <div>{BRAND_ADDRESS_KU}</div>
            <div dir="ltr" className="tabular-nums">
              {phones}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
