import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';
import { isRTL } from '@/i18n/locale-config';
import { BRAND_NAME, BRAND_NAME_AR, BRAND_NAME_EN } from '@/lib/brand';
import {
  accountColumnLabels,
  kindLabel,
  type AccountRow,
  type AccountStream,
} from '@/lib/exports/account-rows';
import { formatCurrency, formatDate } from '@/lib/utils';

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Clean A4 landscape commission/accounts sheet for sale + rental. */
export function renderAccountsReportHtml(
  locale: Locale,
  t: Dictionary,
  data: {
    title: string;
    subtitle?: string;
    rows: AccountRow[];
    stream?: AccountStream;
    autoPrint?: boolean;
    assetBase?: string;
  },
): string {
  const rtl = isRTL(locale);
  const dir = rtl ? 'rtl' : 'ltr';
  const font = "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif";
  const base = (data.assetBase ?? '').replace(/\/$/, '');
  const logoFull = `${base}/brand/logo.png`;
  const logoMark = `${base}/brand/logo-mark.png`;
  const stream: AccountStream = data.stream ?? 'all';
  const L = accountColumnLabels(locale, stream);
  const showKind = stream === 'all';
  const showProgress = stream === 'sale' || stream === 'all';
  const phones = ['0750 207 0008', '0750 490 0302'];
  const totalSeller = data.rows.reduce((s, r) => s + (r.commissionSellerIqd || 0), 0);
  const totalBuyer = data.rows.reduce((s, r) => s + (r.commissionBuyerIqd || 0), 0);
  const totalCommission = totalSeller + totalBuyer;
  const totalSellerUsd = data.rows.reduce((s, r) => s + (r.commissionSellerUsd || 0), 0);
  const totalBuyerUsd = data.rows.reduce((s, r) => s + (r.commissionBuyerUsd || 0), 0);
  const totalCommissionUsd = Math.round((totalSellerUsd + totalBuyerUsd) * 100) / 100;
  const totalPriceIqd = data.rows.reduce((s, r) => s + (r.propertyPriceIqd || 0), 0);
  const totalPriceUsd =
    Math.round(data.rows.reduce((s, r) => s + (r.propertyPriceUsd || 0), 0) * 100) / 100;
  const totalPaid = data.rows.reduce((s, r) => s + (r.paidAmountIqd || 0), 0);
  const totalRemain = data.rows.reduce((s, r) => s + (r.remainingAmountIqd || 0), 0);
  const paidLabel =
    locale === 'en' ? 'Collected' : locale === 'ar' ? 'المحصل' : 'وەرگیراو';
  const remainLabel =
    locale === 'en' ? 'Remaining' : locale === 'ar' ? 'المتبقي' : 'ماوە';
  const moneyIqd = (n: number) => formatCurrency(n, locale, 'IQD');
  const moneyUsd = (n: number) => formatCurrency(n, locale, 'USD');
  const dual = (iqd: number, usd: number) =>
    `${esc(moneyIqd(iqd))}<br/><span class="usd">${esc(moneyUsd(usd))}</span>`;

  const bodyRows = data.rows
    .map(
      (r, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td class="mono">${esc(r.refNo)}</td>
      ${showKind ? `<td>${esc(kindLabel(r.kind, locale))}</td>` : ''}
      <td>${esc(r.name)}</td>
      <td class="cur">${esc(r.currency)}</td>
      <td class="money price">${dual(r.propertyPriceIqd, r.propertyPriceUsd)}</td>
      <td class="money side-s">${dual(r.commissionSellerIqd, r.commissionSellerUsd)}</td>
      <td class="money side-b">${dual(r.commissionBuyerIqd, r.commissionBuyerUsd)}</td>
      <td class="money total-c">${dual(r.commissionIqd, r.commissionUsd)}</td>
      ${
        showProgress
          ? `<td class="money progress">
        <span class="paid">${esc(moneyIqd(r.paidAmountIqd))}</span>
        <span class="remain">${esc(moneyIqd(r.remainingAmountIqd))}</span>
      </td>`
          : ''
      }
      <td>${esc(r.intermediaryName)}</td>
      <td>${esc(r.sellerName)}</td>
      <td>${esc(r.buyerName)}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${esc(data.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: #e8eef4; color: #0f2744;
      font-family: ${font}; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .toolbar {
      position: sticky; top: 0; z-index: 10; display: flex; gap: 8px; justify-content: center;
      padding: 10px; background: rgba(15,39,68,.92);
    }
    .toolbar button {
      border: 0; border-radius: 10px; padding: 8px 16px; font: inherit; font-weight: 700;
      cursor: pointer; background: #fff; color: #0f2744;
    }
    .sheet {
      width: 297mm; min-height: 210mm; margin: 16px auto; padding: 12mm 12mm 10mm;
      background: #fff; box-shadow: 0 12px 40px rgba(15,39,68,.12); position: relative;
    }
    .wm {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      pointer-events: none; opacity: .04;
    }
    .wm img { width: 280px; height: auto; }
    .head {
      display: flex; justify-content: space-between; gap: 16px; align-items: flex-start;
      border-bottom: 2px solid #0f2744; padding-bottom: 12px; margin-bottom: 14px;
    }
    .logo-row { display: flex; gap: 10px; align-items: center; }
    .logo { height: 48px; width: auto; object-fit: contain; }
    .brand-mark { font-size: 13px; font-weight: 800; color: #0f2744; }
    .page-tag { font-size: 11px; color: #64748b; margin-top: 2px; }
    .names { text-align: ${rtl ? 'left' : 'right'}; }
    .n-ku { margin: 0; font-size: 15px; font-weight: 800; color: #0f2744; }
    .n-ar, .n-en { margin: 2px 0 0; font-size: 11px; color: #64748b; }
    .phones { margin-top: 6px; font-size: 11px; color: #475569; direction: ltr; unicode-bidi: isolate; }
    .phones .sep { margin: 0 6px; color: #94a3b8; }
    .doc-title { margin: 8px 0 0; font-size: 16px; font-weight: 800; color: #8b4513; }
    .sub { margin: 4px 0 0; font-size: 12px; color: #64748b; }
    .summary {
      display: grid; grid-template-columns: repeat(${showProgress ? 6 : 4}, 1fr); gap: 8px; margin-bottom: 14px;
    }
    .summary .card {
      border: 1px solid #dbe3ef; border-radius: 10px; padding: 8px 10px; background: #f8fafc;
    }
    .summary .card.price { border-color: #cbd5e1; background: #f1f5f9; }
    .summary .card.paid { border-color: #99f6e4; background: #f0fdfa; }
    .summary .card.remain { border-color: #fcd34d; background: #fffbeb; }
    .summary .card.total { border-color: #86efac; background: #ecfdf5; }
    .summary .lbl { font-size: 10px; color: #64748b; margin: 0 0 4px; }
    .summary .val { font-size: 12px; font-weight: 800; margin: 0; font-variant-numeric: tabular-nums; }
    .summary .val .usd { display: block; margin-top: 2px; font-size: 10px; font-weight: 700; color: #475569; }
    .summary .card.price .val { color: #334155; }
    .summary .card.paid .val { color: #0f766e; }
    .summary .card.remain .val { color: #b45309; }
    .summary .card.total .val { color: #047857; }
    table.acc { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    table.acc th {
      background: #0f2744; color: #fff; font-weight: 700; padding: 7px 5px;
      text-align: start; white-space: nowrap;
    }
    table.acc td {
      padding: 6px 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: start;
    }
    table.acc tr:nth-child(even) td { background: #f8fafc; }
    table.acc .num { width: 24px; color: #64748b; }
    table.acc .mono { font-family: ui-monospace, monospace; font-weight: 700; color: #0f2744; }
    table.acc .cur { font-weight: 800; font-size: 9px; }
    table.acc .money { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; line-height: 1.35; }
    table.acc .money .usd { display: block; font-size: 9px; font-weight: 600; color: #64748b; }
    table.acc .price { color: #334155; }
    table.acc .side-s { color: #075985; }
    table.acc .side-b { color: #5b21b6; }
    table.acc .total-c { color: #047857; }
    table.acc .progress .paid { display: block; color: #0f766e; }
    table.acc .progress .remain { display: block; font-size: 9px; color: #b45309; font-weight: 600; }
    .foot {
      margin-top: 14px; display: flex; justify-content: space-between; gap: 12px; align-items: center;
      border-top: 2px solid #0f2744; padding-top: 10px;
    }
    .total {
      font-size: 12px; font-weight: 700; color: #0f2744;
      background: #f1f5f9; border-radius: 10px; padding: 8px 12px;
      display: flex; flex-wrap: wrap; gap: 10px 16px;
    }
    .total b { color: #8b4513; }
    .meta { font-size: 11px; color: #64748b; }
    .empty { text-align: center; padding: 40px 12px; color: #64748b; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="document.title=' ';window.print()">${esc(t.common.print)}</button></div>
  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /></div>
    <header class="head">
      <div>
        <div class="logo-row">
          <img class="logo" src="${esc(logoFull)}" alt="Road Home" onerror="this.src='${esc(logoMark)}'" />
          <div>
            <div class="brand-mark">${esc(BRAND_NAME)}</div>
            <div class="page-tag">${esc(isoDate(new Date()))}</div>
          </div>
        </div>
      </div>
      <div class="names">
        <p class="n-ku">${esc(BRAND_NAME)}</p>
        <p class="n-ar">${esc(BRAND_NAME_AR)}</p>
        <p class="n-en">${esc(BRAND_NAME_EN)}</p>
        <div class="phones"><span>${phones[0]}</span><span class="sep">·</span><span>${phones[1]}</span></div>
        <h1 class="doc-title">${esc(data.title)}</h1>
        ${data.subtitle ? `<p class="sub">${esc(data.subtitle)}</p>` : ''}
      </div>
    </header>

    ${
      data.rows.length === 0
        ? `<p class="empty">${esc(locale === 'en' ? 'No records' : locale === 'ar' ? 'لا توجد سجلات' : 'هیچ تۆمارێک نییە')}</p>`
        : `<div class="summary">
      <div class="card price"><p class="lbl">${esc(L.propertyPrice)}</p><p class="val">${esc(moneyIqd(totalPriceIqd))}<span class="usd">${esc(moneyUsd(totalPriceUsd))}</span></p></div>
      <div class="card"><p class="lbl">${esc(L.commissionSeller)}</p><p class="val">${esc(moneyIqd(totalSeller))}<span class="usd">${esc(moneyUsd(totalSellerUsd))}</span></p></div>
      <div class="card"><p class="lbl">${esc(L.commissionBuyer)}</p><p class="val">${esc(moneyIqd(totalBuyer))}<span class="usd">${esc(moneyUsd(totalBuyerUsd))}</span></p></div>
      <div class="card total"><p class="lbl">${esc(L.commission)}</p><p class="val">${esc(moneyIqd(totalCommission))}<span class="usd">${esc(moneyUsd(totalCommissionUsd))}</span></p></div>
      ${
        showProgress
          ? `<div class="card paid"><p class="lbl">${esc(paidLabel)}</p><p class="val">${esc(moneyIqd(totalPaid))}</p></div>
      <div class="card remain"><p class="lbl">${esc(remainLabel)}</p><p class="val">${esc(moneyIqd(totalRemain))}</p></div>`
          : ''
      }
    </div>
    <table class="acc">
      <thead>
        <tr>
          <th>#</th>
          <th>${esc(L.refNo)}</th>
          ${showKind ? `<th>${esc(L.kind)}</th>` : ''}
          <th>${esc(L.name)}</th>
          <th>${esc(L.currency)}</th>
          <th>${esc(L.propertyPrice)}</th>
          <th>${esc(L.commissionSeller)}</th>
          <th>${esc(L.commissionBuyer)}</th>
          <th>${esc(L.commission)}</th>
          ${showProgress ? `<th>${esc(paidLabel)} / ${esc(remainLabel)}</th>` : ''}
          <th>${esc(L.intermediaryName)}</th>
          <th>${esc(L.sellerName)}</th>
          <th>${esc(L.buyerName)}</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>`
    }

    <div class="foot">
      <div class="total">
        <span>${esc(L.propertyPrice)}: <b>${esc(moneyIqd(totalPriceIqd))} · ${esc(moneyUsd(totalPriceUsd))}</b></span>
        ${
          showProgress
            ? `<span>${esc(paidLabel)}: <b>${esc(moneyIqd(totalPaid))}</b></span>
        <span>${esc(remainLabel)}: <b>${esc(moneyIqd(totalRemain))}</b></span>`
            : ''
        }
        <span>${esc(L.commissionSeller)}: <b>${esc(moneyIqd(totalSeller))} · ${esc(moneyUsd(totalSellerUsd))}</b></span>
        <span>${esc(L.commissionBuyer)}: <b>${esc(moneyIqd(totalBuyer))} · ${esc(moneyUsd(totalBuyerUsd))}</b></span>
        <span>${esc(L.commission)}: <b>${esc(moneyIqd(totalCommission))} · ${esc(moneyUsd(totalCommissionUsd))}</b> · ${data.rows.length}</span>
      </div>
      <div class="meta">${esc(t.pdf.generatedAt)}: ${esc(formatDate(new Date(), locale))}</div>
    </div>
  </div>
  ${
    data.autoPrint
      ? `<script>window.addEventListener("load",function(){document.title=" ";setTimeout(function(){window.print()},300)});</script>`
      : ''
  }
</body>
</html>`;
}
