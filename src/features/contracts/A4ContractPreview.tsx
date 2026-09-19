'use client';

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

  const typeLabels: Record<string, string> = {
    HOUSE: t.pages.contractGen.typeHouse,
    APARTMENT: t.pages.contractGen.typeApartment,
    LAND: t.pages.contractGen.typeLand,
    SHOP: t.pages.contractGen.typeShop,
    BUILDING: t.pages.contractGen.typeBuilding,
  };

  return (
    <div className="a4-sheet relative mx-auto bg-white text-slate-900 shadow-2xl print:shadow-none">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06] select-none print:opacity-[0.08]">
        <span className="text-6xl font-black tracking-widest rotate-[-28deg]">{t.app.name}</span>
      </div>

      <header className="relative border-b-2 border-teal-700 pb-4 mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="Road Home" width={64} height={64} className="object-contain print:block" />
          <div>
            <p className="text-xl font-bold text-teal-800">{t.app.name}</p>
            <p className="text-xs text-slate-500 mt-1">{t.app.tagline}</p>
          </div>
        </div>
        <div className="text-end text-xs text-slate-600">
          <p className="font-mono font-semibold text-slate-800">
            {contractNo ?? t.pages.contractGen.draftNo}
          </p>
          <p className="mt-1">
            {form.kind === 'SALE' ? t.pages.contractGen.kindSale : t.pages.contractGen.kindPurchase}
          </p>
          <p>{typeLabels[form.propertyType]}</p>
          <p className="mt-1 font-semibold text-teal-800">
            {form.currency === 'USD' ? t.pages.contractGen.currencyUsd : t.pages.contractGen.currencyIqd}
          </p>
        </div>
      </header>

      <h1 className="relative text-center text-lg font-bold mb-6">{form.title || t.pages.contractGen.title}</h1>

      <section className="relative grid grid-cols-2 gap-4 text-sm mb-5">
        <div className="rounded border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-teal-700 mb-2">{t.pages.contractGen.buyer}</p>
          <p><span className="text-slate-500">{t.table.name}:</span> {form.buyerName || '—'}</p>
          <p><span className="text-slate-500">{t.table.phone}:</span> {form.buyerPhone || '—'}</p>
          <p><span className="text-slate-500">{t.pages.contractGen.idNo}:</span> {form.buyerIdNo || '—'}</p>
        </div>
        <div className="rounded border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-teal-700 mb-2">{t.pages.contractGen.seller}</p>
          <p><span className="text-slate-500">{t.table.name}:</span> {form.sellerName || '—'}</p>
          <p><span className="text-slate-500">{t.table.phone}:</span> {form.sellerPhone || '—'}</p>
          <p><span className="text-slate-500">{t.pages.contractGen.idNo}:</span> {form.sellerIdNo || '—'}</p>
        </div>
      </section>

      <section className="relative text-sm mb-5 rounded border border-slate-200 p-3 space-y-1">
        <p>
          <span className="text-slate-500">{t.pages.contractGen.tapu}:</span>{' '}
          <span className="font-mono font-semibold">{form.tapuCode || '—'}</span>
        </p>
        <p>
          <span className="text-slate-500">{t.pages.projects.code}:</span>{' '}
          <span className="font-mono">{form.houseCode || '—'}</span>
        </p>
        <p>
          <span className="text-slate-500">{t.pages.projects.location}:</span> {form.location || '—'}
        </p>
        <p>
          <span className="text-slate-500">{t.pages.contractGen.exchangeRate}:</span>{' '}
          <span className="tabular-nums font-semibold">{rate.toLocaleString(lang === 'en' ? 'en-US' : 'ar-IQ')}</span>
        </p>
      </section>

      <section className="relative grid grid-cols-3 gap-3 text-sm mb-5">
        <div className="rounded bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-[11px] text-slate-500">{t.pages.contractGen.totalPrice}</p>
          <p className="font-bold tabular-nums mt-1">{total.primary}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
            {form.currency === 'IQD' ? total.usd : total.iqd}
          </p>
        </div>
        <div className="rounded bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-[11px] text-slate-500">{t.pages.contractGen.downPayment}</p>
          <p className="font-bold tabular-nums mt-1 text-teal-700">{down.primary}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
            {form.currency === 'IQD' ? down.usd : down.iqd}
          </p>
        </div>
        <div className="rounded bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-[11px] text-slate-500">{t.pages.contractGen.remaining}</p>
          <p className="font-bold tabular-nums mt-1">{rest.primary}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
            {form.currency === 'IQD' ? rest.usd : rest.iqd}
          </p>
        </div>
      </section>

      {form.installments.length > 0 && (
        <section className="relative mb-5">
          <h2 className="text-sm font-semibold mb-2">{t.pages.contractGen.installments}</h2>
          <table className="w-full text-xs border border-slate-200">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-2 py-1.5 text-start">#</th>
                <th className="border border-slate-200 px-2 py-1.5 text-start">{t.pages.installments.dueDate}</th>
                <th className="border border-slate-200 px-2 py-1.5 text-start">{t.table.amount}</th>
                <th className="border border-slate-200 px-2 py-1.5 text-start">{t.form.notes}</th>
              </tr>
            </thead>
            <tbody>
              {form.installments.map((row, i) => {
                const m = formatContractMoney(row.amount || 0, form.currency, rate, lang);
                return (
                  <tr key={row.id}>
                    <td className="border border-slate-200 px-2 py-1.5">{i + 1}</td>
                    <td className="border border-slate-200 px-2 py-1.5">{row.dueDate || '—'}</td>
                    <td className="border border-slate-200 px-2 py-1.5 tabular-nums">
                      <div>{m.primary}</div>
                      <div className="text-[10px] text-slate-500">{form.currency === 'IQD' ? m.usd : m.iqd}</div>
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5">{row.label || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="relative mb-8">
        <h2 className="text-sm font-semibold mb-2">{t.pages.contractGen.legal}</h2>
        <pre className="whitespace-pre-wrap text-xs leading-6 font-[inherit] text-slate-700">
          {form.legalConditions || '—'}
        </pre>
      </section>

      <footer className="relative space-y-10 pt-6 mt-auto">
        <div className="grid grid-cols-2 gap-10">
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-slate-400 pt-2 text-xs text-slate-600">
              {t.pages.contractGen.buyerSign}
              {form.buyerName ? <p className="mt-1 font-medium text-slate-800">{form.buyerName}</p> : null}
            </div>
          </div>
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-slate-400 pt-2 text-xs text-slate-600">
              {t.pages.contractGen.sellerSign}
              {form.sellerName ? <p className="mt-1 font-medium text-slate-800">{form.sellerName}</p> : null}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4 text-center">{t.pages.contractGen.witnesses}</h2>
          <div className="grid grid-cols-2 gap-10">
            <div className="text-center">
              <div className="h-10" />
              <div className="border-t border-slate-400 pt-2 text-xs text-slate-600">
                {t.pages.contractGen.witnessSign} (١)
                <p className="mt-1 font-medium text-slate-800">{form.witness1Name || '—'}</p>
                {form.witness1IdNo ? (
                  <p className="text-[10px] text-slate-500">{t.pages.contractGen.idNo}: {form.witness1IdNo}</p>
                ) : null}
              </div>
            </div>
            <div className="text-center">
              <div className="h-10" />
              <div className="border-t border-slate-400 pt-2 text-xs text-slate-600">
                {t.pages.contractGen.witnessSign} (٢)
                <p className="mt-1 font-medium text-slate-800">{form.witness2Name || '—'}</p>
                {form.witness2IdNo ? (
                  <p className="text-[10px] text-slate-500">{t.pages.contractGen.idNo}: {form.witness2IdNo}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
