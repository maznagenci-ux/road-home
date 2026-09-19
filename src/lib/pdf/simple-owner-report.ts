import type { SimpleOwnerReport } from '@/lib/accounting/simple-report';
import { BRAND_NAME_KU, BRAND_SLOGAN_KU } from '@/lib/brand';

function esc(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function renderSimpleReportWordHtml(report: SimpleOwnerReport) {
  const from = report.from.slice(0, 10);
  const to = report.to.slice(0, 10);

  const incomeCat = report.incomeByCategory
    .map((r) => `<tr><td>${esc(r.category)}</td><td class="num">${fmt(r.amountIqd)}</td></tr>`)
    .join('');
  const expenseCat = report.expenseByCategory
    .map((r) => `<tr><td>${esc(r.category)}</td><td class="num">${fmt(r.amountIqd)}</td></tr>`)
    .join('');
  const incomeRows = report.incomeRows
    .map(
      (r) =>
        `<tr><td>${esc(r.date)}</td><td>${esc(r.category)}</td><td>${esc(r.partyName)}</td><td>${esc(r.description)}</td><td class="num">${fmt(r.amountIqd)}</td></tr>`,
    )
    .join('');
  const expenseRows = report.expenseRows
    .map(
      (r) =>
        `<tr><td>${esc(r.date)}</td><td>${esc(r.category)}</td><td>${esc(r.partyName)}</td><td>${esc(r.description)}</td><td class="num">${fmt(r.amountIqd)}</td></tr>`,
    )
    .join('');
  const salaryRows = report.salaryRows
    .map(
      (r) =>
        `<tr><td>${esc(r.date)}</td><td>${esc(r.employeeName)}</td><td>${esc(r.category)}</td><td>${esc(r.periodLabel || '—')}</td><td class="num">${fmt(r.amountIqd)}</td><td>${esc(r.voucherNo)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
<meta charset="utf-8" />
<title>ڕاپۆرتی سادەی حیسابات</title>
<style>
  body { font-family: 'Noto Kufi Arabic', Tahoma, sans-serif; color: #1c1917; padding: 24px; }
  h1 { font-size: 22px; margin: 0; }
  .sub { color: #78716c; margin: 4px 0 18px; }
  .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .card { border: 1px solid #e7e5e4; border-radius: 10px; padding: 12px 16px; min-width: 140px; }
  .card span { display: block; font-size: 12px; color: #78716c; }
  .card strong { font-size: 18px; }
  h2 { font-size: 16px; color: #0f766e; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
  th, td { border: 1px solid #e7e5e4; padding: 6px 8px; text-align: right; }
  th { background: #f5f5f4; }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
</head>
<body>
  <h1>${esc(BRAND_NAME_KU)}</h1>
  <div class="sub">${esc(BRAND_SLOGAN_KU)} · هەموو ژمارەکان بە دینار · ${from} → ${to}</div>

  <div class="cards">
    <div class="card"><span>کۆی داهات (د.ع)</span><strong>${fmt(report.incomeIqd)}</strong></div>
    <div class="card"><span>کۆی خەرجی (د.ع)</span><strong>${fmt(report.expenseIqd)}</strong></div>
    <div class="card"><span>قازانج (د.ع)</span><strong>${fmt(report.profitIqd)}</strong></div>
  </div>

  <h2>داهات لە کوێ هاتووە؟ (بەپێی پۆل)</h2>
  <table><thead><tr><th>پۆل</th><th>بڕ (د.ع)</th></tr></thead>
  <tbody>${incomeCat || '<tr><td colspan="2">—</td></tr>'}</tbody></table>

  <h2>خەرجی بەپێی پۆل</h2>
  <table><thead><tr><th>پۆل</th><th>بڕ (د.ع)</th></tr></thead>
  <tbody>${expenseCat || '<tr><td colspan="2">—</td></tr>'}</tbody></table>

  <h2>وردەکاری داهات</h2>
  <table><thead><tr><th>بەروار</th><th>پۆل</th><th>لایەن</th><th>تێبینی</th><th>بڕ</th></tr></thead>
  <tbody>${incomeRows || '<tr><td colspan="5">—</td></tr>'}</tbody></table>

  <h2>وردەکاری خەرجی</h2>
  <table><thead><tr><th>بەروار</th><th>پۆل</th><th>لایەن</th><th>تێبینی</th><th>بڕ</th></tr></thead>
  <tbody>${expenseRows || '<tr><td colspan="5">—</td></tr>'}</tbody></table>

  <h2>مووچەی کارمەندان</h2>
  <table><thead><tr><th>بەروار</th><th>کارمەند</th><th>جۆر</th><th>ماوە</th><th>بڕ</th><th>ژمارەی وەسڵ</th></tr></thead>
  <tbody>${salaryRows || '<tr><td colspan="6">هیچ مووچەیەک لەم ماوەیەدا نییە</td></tr>'}</tbody></table>
</body>
</html>`;
}
