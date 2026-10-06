import type { SimpleOwnerReport, ReportCurrency } from '@/lib/accounting/simple-report';
import { BRAND_NAME, BRAND_NAME_KU, BRAND_SLOGAN_KU } from '@/lib/brand';
import { companyContact } from '@/lib/company-contact';
import { brandLogoPair } from '@/lib/pdf/assets';

function esc(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function fmtIqd(n: number) {
  return `${new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(Math.round(n))} د.ع`;
}

function fmtUsd(n: number) {
  return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)}`;
}

function money(amount: number, currency: ReportCurrency) {
  return currency === 'USD' ? fmtUsd(amount) : fmtIqd(amount);
}

function catCell(iqd: number, usd: number) {
  const parts: string[] = [];
  if (iqd > 0.5) parts.push(fmtIqd(iqd));
  if (usd > 0.005) parts.push(fmtUsd(usd));
  return parts.length ? parts.join(' · ') : '—';
}

/** Beautiful bilingual owner report for Word (.doc) and print/PDF. */
export function renderSimpleReportWordHtml(
  report: SimpleOwnerReport,
  opts?: { assetBase?: string },
) {
  const from = report.from.slice(0, 10);
  const to = report.to.slice(0, 10);
  const { logo, mark } = brandLogoPair(opts?.assetBase);
  const contact = companyContact();
  const phones = contact.phones.filter(Boolean);

  const incomeCat = report.incomeByCategory
    .map(
      (r) =>
        `<tr><td>${esc(r.category)}</td><td class="num">${esc(catCell(r.amountIqd, r.amountUsd))}</td></tr>`,
    )
    .join('');
  const expenseCat = report.expenseByCategory
    .map(
      (r) =>
        `<tr><td>${esc(r.category)}</td><td class="num">${esc(catCell(r.amountIqd, r.amountUsd))}</td></tr>`,
    )
    .join('');
  const incomeRows = report.incomeRows
    .map(
      (r) =>
        `<tr><td>${esc(r.date)}</td><td>${esc(r.category)}</td><td>${esc(r.partyName)}</td><td>${esc(r.description)}</td><td class="num">${esc(money(r.amount, r.currency))}</td><td class="cur">${esc(r.currency)}</td></tr>`,
    )
    .join('');
  const expenseRows = report.expenseRows
    .map(
      (r) =>
        `<tr><td>${esc(r.date)}</td><td>${esc(r.category)}</td><td>${esc(r.partyName)}</td><td>${esc(r.description)}</td><td class="num">${esc(money(r.amount, r.currency))}</td><td class="cur">${esc(r.currency)}</td></tr>`,
    )
    .join('');
  const salaryRows = report.salaryRows
    .map(
      (r) =>
        `<tr><td>${esc(r.date)}</td><td>${esc(r.employeeName)}</td><td>${esc(r.category)}</td><td>${esc(r.periodLabel || '—')}</td><td class="num">${esc(money(r.amount, r.currency))}</td><td class="cur">${esc(r.currency)}</td><td>${esc(r.voucherNo)}</td></tr>`,
    )
    .join('');

  const phoneHtml = phones
    .map((p, i) => `<span class="phone" dir="ltr">${esc(p)}</span>${i < phones.length - 1 ? '<span class="sep">·</span>' : ''}`)
    .join('');

  return `<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
<meta charset="utf-8" />
<title>ڕاپۆرتی دارایی — ${from} → ${to}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
  :root {
    --ink: #0b1f38;
    --muted: #64748b;
    --line: #e2e8f0;
    --teal: #0f766e;
    --teal-soft: #ecfdf5;
    --rose: #9f1239;
    --rose-soft: #fff1f2;
    --amber: #92400e;
    --paper: #ffffff;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Kufi Arabic', Tahoma, sans-serif;
    color: var(--ink);
    background: #f1f5f9;
    margin: 0;
    padding: 28px 18px 48px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    max-width: 920px;
    margin: 0 auto;
    background: var(--paper);
    border-radius: 18px;
    box-shadow: 0 18px 50px rgb(11 31 56 / 0.08);
    overflow: hidden;
    border: 1px solid #dbe4ee;
  }
  .band {
    height: 6px;
    background: linear-gradient(90deg, #0f766e, #0ea5e9 55%, #0b1f38);
  }
  .head {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 22px 26px 18px;
    border-bottom: 1px solid var(--line);
  }
  .logo { height: 58px; width: auto; }
  h1 { font-size: 22px; margin: 0 0 2px; letter-spacing: -0.02em; }
  .en { font-size: 12px; color: var(--muted); font-weight: 600; }
  .slogan { font-size: 12px; color: var(--teal); margin-top: 4px; }
  .contact {
    text-align: left;
    direction: ltr;
    font-size: 11.5px;
    color: var(--muted);
    line-height: 1.55;
  }
  .contact .addr { color: var(--ink); font-weight: 700; margin-bottom: 4px; direction: rtl; text-align: right; }
  .phones { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: flex-end; }
  .phone { font-variant-numeric: tabular-nums; font-weight: 700; color: var(--ink); }
  .sep { color: #94a3b8; }
  .meta {
    padding: 12px 26px;
    background: #f8fafc;
    border-bottom: 1px solid var(--line);
    display: flex; flex-wrap: wrap; gap: 10px 18px;
    font-size: 12.5px; color: var(--muted);
  }
  .meta strong { color: var(--ink); }
  .body { padding: 22px 26px 28px; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
  .card {
    border-radius: 14px;
    padding: 14px 16px;
    border: 1px solid var(--line);
    background: #fff;
  }
  .card.income { background: var(--teal-soft); border-color: #99f6e4; }
  .card.expense { background: var(--rose-soft); border-color: #fecdd3; }
  .card.profit { background: #eff6ff; border-color: #bfdbfe; }
  .card span { display: block; font-size: 12px; color: var(--muted); margin-bottom: 8px; }
  .card .iqd { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .card .usd { font-size: 13px; font-weight: 700; color: var(--teal); margin-top: 4px; font-variant-numeric: tabular-nums; }
  h2 {
    font-size: 15px;
    margin: 22px 0 10px;
    color: var(--teal);
    display: flex; align-items: center; gap: 8px;
  }
  h2::before {
    content: '';
    width: 8px; height: 8px; border-radius: 99px; background: var(--teal);
  }
  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; margin-bottom: 6px; overflow: hidden; border-radius: 12px; border: 1px solid var(--line); }
  th, td { padding: 9px 10px; text-align: right; border-bottom: 1px solid var(--line); }
  th { background: #0b1f38; color: #fff; font-weight: 700; font-size: 11px; }
  tr:nth-child(even) td { background: #f8fafc; }
  tr:last-child td { border-bottom: 0; }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 700; }
  .cur { font-size: 11px; color: var(--muted); font-weight: 700; }
  .foot {
    margin-top: 28px; padding-top: 14px; border-top: 1px dashed var(--line);
    font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border: 0; border-radius: 0; }
  }
  @media (max-width: 720px) {
    .head { grid-template-columns: 1fr; }
    .cards { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="band"></div>
    <header class="head">
      <img class="logo" src="${logo}" alt="${esc(BRAND_NAME)}" onerror="this.src='${mark}'" />
      <div>
        <h1>${esc(BRAND_NAME_KU)}</h1>
        <div class="en">${esc(BRAND_NAME)}</div>
        <div class="slogan">${esc(BRAND_SLOGAN_KU)}</div>
      </div>
      <div class="contact">
        <div class="addr">${esc(contact.address)}</div>
        <div class="phones">${phoneHtml || '—'}</div>
      </div>
    </header>
    <div class="meta">
      <span>ڕاپۆرتی دارایی خاوەن</span>
      <span>ماوە: <strong dir="ltr">${from} → ${to}</strong></span>
      <span>دراو: دینار و دۆلار بە جیا</span>
    </div>
    <div class="body">
      <div class="cards">
        <div class="card income">
          <span>کۆی داهات</span>
          <div class="iqd">${fmtIqd(report.incomeIqd)}</div>
          ${report.incomeUsd > 0 ? `<div class="usd">${fmtUsd(report.incomeUsd)}</div>` : ''}
        </div>
        <div class="card expense">
          <span>کۆی خەرجی</span>
          <div class="iqd">${fmtIqd(report.expenseIqd)}</div>
          ${report.expenseUsd > 0 ? `<div class="usd">${fmtUsd(report.expenseUsd)}</div>` : ''}
        </div>
        <div class="card profit">
          <span>قازانج / زەرەر</span>
          <div class="iqd">${fmtIqd(report.profitIqd)}</div>
          ${report.incomeUsd > 0 || report.expenseUsd > 0 ? `<div class="usd">${fmtUsd(report.profitUsd)}</div>` : ''}
        </div>
      </div>

      <h2>داهات بەپێی پۆل</h2>
      <table><thead><tr><th>پۆل</th><th>بڕ</th></tr></thead>
      <tbody>${incomeCat || '<tr><td colspan="2">—</td></tr>'}</tbody></table>

      <h2>خەرجی بەپێی پۆل</h2>
      <table><thead><tr><th>پۆل</th><th>بڕ</th></tr></thead>
      <tbody>${expenseCat || '<tr><td colspan="2">—</td></tr>'}</tbody></table>

      <h2>وردەکاری داهات</h2>
      <table><thead><tr><th>بەروار</th><th>پۆل</th><th>لایەن</th><th>تێبینی</th><th>بڕ</th><th>دراو</th></tr></thead>
      <tbody>${incomeRows || '<tr><td colspan="6">—</td></tr>'}</tbody></table>

      <h2>وردەکاری خەرجی</h2>
      <table><thead><tr><th>بەروار</th><th>پۆل</th><th>لایەن</th><th>تێبینی</th><th>بڕ</th><th>دراو</th></tr></thead>
      <tbody>${expenseRows || '<tr><td colspan="6">—</td></tr>'}</tbody></table>

      <h2>مووچەی کارمەندان</h2>
      <table><thead><tr><th>بەروار</th><th>کارمەند</th><th>جۆر</th><th>ماوە</th><th>بڕ</th><th>دراو</th><th>وەسڵ</th></tr></thead>
      <tbody>${salaryRows || '<tr><td colspan="7">هیچ مووچەیەک لەم ماوەیەدا نییە</td></tr>'}</tbody></table>

      <div class="foot">
        <span>هەر مامەڵەیەک بە دراوی خۆی نیشاندراوە — دۆلار وەک دۆلار، دینار وەک دینار</span>
        <span dir="ltr">${esc(BRAND_NAME)}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}
