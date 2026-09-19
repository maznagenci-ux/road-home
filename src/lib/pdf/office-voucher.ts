import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';
import { isRTL } from '@/i18n/locale-config';
import { BRAND_NAME, BRAND_NAME_KU, BRAND_SLOGAN_KU } from '@/lib/brand';

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

function dinar(n: number) {
  return `${new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(Math.round(n))} د.ع`;
}

function parseNoteMoney(note: string | null | undefined) {
  if (!note) return { deduction: 0, gross: 0, clean: '' };
  const ded = note.match(/deduction=([\d.]+)/i);
  const gross = note.match(/gross=([\d.]+)/i);
  const clean = note
    .replace(/\s*·\s*deduction=[\d.]+/gi, '')
    .replace(/\s*·\s*gross=[\d.]+/gi, '')
    .replace(/deduction=[\d.]+/gi, '')
    .replace(/gross=[\d.]+/gi, '')
    .replace(/\s*·\s*/g, ' · ')
    .trim();
  return {
    deduction: ded ? Number(ded[1]) || 0 : 0,
    gross: gross ? Number(gross[1]) || 0 : 0,
    clean,
  };
}

export type OfficeVoucherPdfData = {
  voucherNo: string;
  kind: 'office' | 'salary';
  categoryLabel: string;
  partyName: string;
  periodLabel?: string | null;
  amountIqd: number;
  deductionIqd?: number;
  paymentMethod: string;
  note?: string | null;
  issuedAt: Date;
  createdByName?: string | null;
  yearToDateIqd?: number;
  yearLabel?: number;
  autoPrint?: boolean;
  assetBase?: string;
};

/** Printable voucher for office expense / employee salary — IQD only, original+copy on one A4 */
export function renderOfficeVoucherHtml(
  locale: Locale,
  t: Dictionary,
  data: OfficeVoucherPdfData,
): string {
  const rtl = isRTL(locale);
  const dir = rtl ? 'rtl' : 'ltr';
  const font = rtl
    ? "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Segoe UI', system-ui, sans-serif";
  const o = (t.pages as { officeExpenses?: Record<string, string> }).officeExpenses ?? {};
  const isSalary = data.kind === 'salary';
  const title =
    (isSalary ? o.voucherSalaryTitle : o.voucherOfficeTitle) ??
    (isSalary ? 'وەسڵی مووچەی کارمەند' : 'وەسڵی خەرجی ئۆفیس');
  const party = esc(data.partyName || '—');
  const safeNo = esc(data.voucherNo);
  const dateStr = isoDate(data.issuedAt);
  const base = (data.assetBase ?? '').replace(/\/$/, '');
  const logoFull = `${base}/brand/logo.png`;
  const logoMark = `${base}/brand/logo-mark.png`;
  const payLabel =
    data.paymentMethod === 'CREDIT'
      ? (o.credit ?? 'قەرز')
      : (o.cashVault ?? 'کاش / خەزێنە');
  const parsed = parseNoteMoney(data.note);
  const net = data.amountIqd;
  const deduction = data.deductionIqd && data.deductionIqd > 0 ? data.deductionIqd : parsed.deduction;
  const gross =
    deduction > 0
      ? parsed.gross > 0
        ? parsed.gross
        : net + deduction
      : net;
  const period = data.periodLabel?.trim() || '—';
  const noteClean = parsed.clean;
  const issuer = esc(data.createdByName || BRAND_NAME);

  const block = (copy: 'original' | 'duplicate') => `
  <article class="voucher">
    <div class="wm" aria-hidden="true"><img src="${logoMark}" alt="" /></div>
    <header class="head">
      <div class="brand-col">
        <img class="logo" src="${logoFull}" alt="Road Home" />
        <div class="copy-pill">${
          copy === 'original'
            ? (t.pdf.receiptCopyOriginal ?? 'ڕەسەن')
            : (t.pdf.receiptCopyDuplicate ?? 'کۆپی')
        }</div>
      </div>
      <div class="names-col">
        <p class="n-brand">${esc(BRAND_NAME_KU)}</p>
        <p class="n-slogan">${esc(BRAND_SLOGAN_KU)}</p>
        <h1 class="doc-title">${esc(title)}</h1>
      </div>
      <table class="meta-box">
        <tr><th>${o.number ?? 'ژمارە'}</th><td>${safeNo}</td></tr>
        <tr><th>${o.date ?? 'ڕێکەوت'}</th><td>${dateStr}</td></tr>
      </table>
    </header>

    <div class="amount-hero">
      <span class="amount-lab">${isSalary ? (o.netPay ?? 'بڕی خالص') : (o.amount ?? 'بڕ')}</span>
      <strong class="amount-val">${dinar(net)}</strong>
    </div>

    <table class="info">
      <tr>
        <th>${isSalary ? (o.employee ?? 'کارمەند') : (o.payee ?? 'لایەن')}</th>
        <td>${party}</td>
      </tr>
      <tr>
        <th>${o.category ?? 'جۆر'}</th>
        <td>${esc(data.categoryLabel)}</td>
      </tr>
      ${
        isSalary
          ? `<tr><th>${o.period ?? 'ماوە'}</th><td>${esc(period)}</td></tr>`
          : ''
      }
      ${
        isSalary && data.yearToDateIqd != null
          ? `<tr><th>${o.yearToDate ?? 'کۆی وەرگیراو لەم ساڵەدا'}${
              data.yearLabel ? ` (${data.yearLabel})` : ''
            }</th><td>${dinar(data.yearToDateIqd)}</td></tr>`
          : ''
      }
      ${
        isSalary && deduction > 0
          ? `<tr><th>${o.gross ?? 'بڕی گشتی'}</th><td>${dinar(gross)}</td></tr>
             <tr><th>${o.deduction ?? 'دەرهێنان'}</th><td>${dinar(deduction)}</td></tr>`
          : ''
      }
      <tr>
        <th>${o.paymentMethod ?? 'شێوازی پارەدان'}</th>
        <td>${esc(payLabel)}</td>
      </tr>
      ${
        noteClean
          ? `<tr><th>${
              isSalary ? (o.note ?? 'تێبینی') : (o.expenseFor ?? 'بۆ چی خەرج کرا')
            }</th><td>${esc(noteClean)}</td></tr>`
          : ''
      }
      <tr>
        <th>${o.issuedBy ?? 'دەرکەر'}</th>
        <td>${issuer}</td>
      </tr>
    </table>

    <footer class="signs">
      <div class="sign">
        <div class="sign-label">${t.pdf.payerLine ?? 'تەحویلکەر / دەرکەر'}</div>
        <div class="sign-space" aria-hidden="true"></div>
        <div class="sign-line"></div>
        <div class="sign-name">${esc(BRAND_NAME)}</div>
      </div>
      <div class="sign">
        <div class="sign-label">${
          isSalary
            ? ((t.pdf as { employeeSign?: string }).employeeSign ?? 'واژووی کارمەند / وەرگر')
            : (t.pdf.receiverLine ?? 'وەرگر')
        }</div>
        <div class="sign-space" aria-hidden="true"></div>
        <div class="sign-line"></div>
        <div class="sign-name">${party}</div>
      </div>
    </footer>
  </article>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(title)} — ${safeNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 5mm; }
    body { font-family: ${font}; color: #0f2744; background: #e8eef5; direction: ${dir}; }
    .toolbar { max-width: 210mm; margin: 10px auto; display: flex; justify-content: flex-end; padding: 0 8px; }
    .toolbar button { font-family: inherit; border: 0; background: #0f2744; color: #fff; padding: 8px 16px; font-size: 13px; cursor: pointer; border-radius: 6px; }
    .page {
      width: 210mm; height: 297mm; margin: 0 auto 12px; background: #fff;
      padding: 5mm 8mm; display: flex; flex-direction: column; gap: 0;
      box-shadow: 0 8px 28px rgb(15 39 68 / 0.12); overflow: hidden;
    }
    .voucher {
      position: relative; flex: 1 1 50%; height: 50%; min-height: 0;
      padding: 2mm 1mm 1mm; display: flex; flex-direction: column;
      border-bottom: 1px dashed #c5d0dc; overflow: hidden;
    }
    .voucher:last-child { border-bottom: 0; }
    .wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.04; pointer-events: none; }
    .wm img { width: 32%; max-width: 140px; }
    .head { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: start; margin-bottom: 4px; }
    .logo { height: 34px; width: auto; }
    .copy-pill { display: inline-block; margin-top: 3px; font-size: 9px; background: #0f2744; color: #fff; padding: 1px 7px; border-radius: 3px; }
    .n-brand { font-size: 13px; font-weight: 700; }
    .n-slogan { font-size: 10px; color: #5a6b7d; margin-top: 1px; }
    .doc-title { margin-top: 2px; font-size: 13px; font-weight: 700; color: #0f766e; }
    .meta-box { border-collapse: collapse; font-size: 10px; }
    .meta-box th, .meta-box td { border: 1px solid #d5dee8; padding: 2px 6px; text-align: start; }
    .meta-box th { background: #f3f6fa; font-weight: 600; white-space: nowrap; }
    .amount-hero {
      display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
      background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;
      padding: 6px 10px; margin: 2px 0 4px;
    }
    .amount-lab { font-size: 11px; color: #065f46; font-weight: 600; }
    .amount-val { font-size: 18px; font-weight: 800; color: #064e3b; font-variant-numeric: tabular-nums; }
    .info { width: 100%; border-collapse: collapse; font-size: 11px; }
    .info th, .info td { border-bottom: 1px solid #e6edf4; padding: 3px 3px; text-align: start; vertical-align: top; }
    .info th { width: 28%; color: #5a6b7d; font-weight: 600; }
    .info td { font-weight: 600; }
    .signs {
      margin-top: auto; padding-top: 10px; padding-bottom: 2px;
      display: grid; grid-template-columns: 1fr 1fr; gap: 22px;
      flex: 0 0 auto;
    }
    .sign { display: flex; flex-direction: column; min-height: 72px; }
    .sign-label { font-size: 10px; color: #5a6b7d; font-weight: 600; }
    .sign-space { flex: 1 1 auto; min-height: 42px; }
    .sign-line { border-top: 1px solid #0f2744; margin-top: 0; }
    .sign-name { font-size: 11px; font-weight: 600; padding-top: 4px; }
    @media print {
      html, body { height: auto; background: #fff; }
      .toolbar { display: none !important; }
      .page {
        box-shadow: none; margin: 0; width: 100%; height: auto;
        max-height: 287mm; padding: 0; overflow: hidden;
        page-break-after: avoid; page-break-inside: avoid;
      }
      .voucher {
        flex: none; height: auto; max-height: 140mm;
        page-break-inside: avoid; page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="window.print()">${
    t.common.print ?? 'چاپکردن'
  }</button></div>
  <div class="page">
    ${block('original')}
    ${block('duplicate')}
  </div>
  ${
    data.autoPrint
      ? `<script>window.addEventListener("load",function(){document.title=" ";setTimeout(function(){window.print()},300)});</script>`
      : ''
  }
</body>
</html>`;
}
