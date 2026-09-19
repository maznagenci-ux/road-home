import type { MonthlyOwnerBundle } from '@/lib/accounting/types';
import { BRAND_NAME, BRAND_NAME_KU, BRAND_SLOGAN_KU } from '@/lib/brand';

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(Math.round(n));
}

function catTable(title: string, rows: { category: string; amountIqd: number }[]) {
  const body = rows.length
    ? rows
        .map(
          (r) =>
            `<tr><td>${esc(r.category)}</td><td class="num">${fmt(r.amountIqd)}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="2">—</td></tr>`;
  return `
  <section class="block">
    <h2>${esc(title)}</h2>
    <table><thead><tr><th>پۆل</th><th>بڕ (د.ع)</th></tr></thead><tbody>${body}</tbody></table>
  </section>`;
}

export function renderMonthlyOwnerReportHtml(
  bundle: MonthlyOwnerBundle,
  opts?: { assetBase?: string },
) {
  const base = (opts?.assetBase ?? '').replace(/\/$/, '');
  const logo = `${base}/brand/logo.png`;
  const e = bundle.executive;
  const cards = [
    ['داهات', e.incomeIqd],
    ['خەرجی', e.expenseIqd],
    ['قازانج', e.netIqd],
    ['نەقد / بەردەست', e.cashIqd],
    ['قەرزی کڕیار', e.receivablesIqd],
    ['قەرزی دابینکەر', e.payablesIqd],
  ]
    .map(
      ([label, val]) =>
        `<div class="card"><span>${esc(String(label))}</span><strong>${fmt(Number(val))}</strong></div>`,
    )
    .join('');

  const cashBlocks = bundle.cashReports
    .map(
      (r) =>
        `<tr><td>${esc(r.code)} — ${esc(r.name)}</td><td class="num">${fmt(r.openingBalanceIqd)}</td><td class="num">${fmt(r.closingBalanceIqd)}</td></tr>`,
    )
    .join('');
  void bundle.bankReports;
  const recv = bundle.receivables
    .map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${fmt(r.balanceIqd)}</td></tr>`)
    .join('');
  const pay = bundle.payables
    .map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${fmt(r.balanceIqd)}</td></tr>`)
    .join('');
  const props = bundle.propertyPerformance
    .map(
      (r) =>
        `<tr><td>${esc(r.label)}</td><td class="num">${fmt(r.incomeIqd)}</td><td class="num">${fmt(r.expenseIqd)}</td><td class="num">${fmt(r.profitIqd)}</td></tr>`,
    )
    .join('');

  const appendix = bundle.transactions
    .map(
      (t) =>
        `<tr><td>${esc(t.txnNo)}</td><td>${esc(t.date.slice(0, 10))}</td><td>${esc(t.type)}</td><td>${esc(t.category)}</td><td>${esc(t.partyName ?? '—')}</td><td class="num">${fmt(t.amountBaseIqd)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>ڕاپۆرتی مانگانەی خاوەن — ${bundle.year}/${bundle.month}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap');
    body { font-family: 'Noto Kufi Arabic', Tahoma, sans-serif; color: #1c1917; margin: 0; background: #fafaf9; }
    .page { max-width: 960px; margin: 0 auto; padding: 28px 24px 48px; }
    header { display: flex; gap: 16px; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { height: 56px; width: auto; }
    h1 { margin: 0; font-size: 1.35rem; }
    .slogan { color: #57534e; font-size: 0.9rem; margin-top: 4px; }
    .meta { color: #78716c; font-size: 0.85rem; margin-top: 8px; }
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0 24px; }
    .card { background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 12px; }
    .card span { display: block; font-size: 0.75rem; color: #78716c; }
    .card strong { display: block; margin-top: 6px; font-size: 1.05rem; }
    .block { background: #fff; border: 1px solid #e7e5e4; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
    h2 { margin: 0 0 10px; font-size: 1.05rem; color: #0f766e; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { border-bottom: 1px solid #f5f5f4; padding: 7px 4px; text-align: right; }
    th { color: #78716c; font-weight: 600; }
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media print { body { background: #fff; } .page { padding: 0; } .block, .card { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <img class="logo" src="${logo}" alt="${esc(BRAND_NAME)}" />
      <div>
        <h1>${esc(BRAND_NAME_KU)}</h1>
        <div class="slogan">${esc(BRAND_SLOGAN_KU)}</div>
        <div class="meta">ڕاپۆرتی دارایی مانگانە · ${bundle.year}/${String(bundle.month).padStart(2, '0')}</div>
      </div>
    </header>

    <section>
      <h2>١. پوختەی جێبەجێکاری</h2>
      <div class="cards">${cards}</div>
    </section>

    ${catTable('٢. داهات بەپێی پۆل', bundle.incomeByCategory)}
    ${catTable('٣. خەرجی بەپێی پۆل', bundle.expenseByCategory)}

    <section class="block">
      <h2>٤. ڕاپۆرتی نەقد</h2>
      <table><thead><tr><th>هەژمار</th><th>کردنەوە</th><th>داخستن</th></tr></thead>
      <tbody>${cashBlocks || '<tr><td colspan="3">—</td></tr>'}</tbody></table>
    </section>

    <section class="block">
      <h2>٥. قازانج و زەرەر (P&amp;L)</h2>
      <p>داهات: <strong>${fmt(bundle.pl.incomeIqd)}</strong> · خەرجی: <strong>${fmt(bundle.pl.expenseIqd)}</strong> · قازانجی خاوێن: <strong>${fmt(bundle.pl.netProfitIqd)}</strong></p>
      <p style="font-size:0.8rem;color:#78716c">سەرمایە/ڕاکێشانی خاوەن لە P&amp;L دەرنەخراون.</p>
    </section>

    <section class="block">
      <h2>٦. قەرزی کڕیار</h2>
      <table><thead><tr><th>کڕیار</th><th>باڵانس</th></tr></thead>
      <tbody>${recv || '<tr><td colspan="2">—</td></tr>'}</tbody></table>
    </section>

    <section class="block">
      <h2>٧. قەرزی دابینکەر</h2>
      <table><thead><tr><th>دابینکەر</th><th>باڵانس</th></tr></thead>
      <tbody>${pay || '<tr><td colspan="2">—</td></tr>'}</tbody></table>
    </section>

    <section class="block">
      <h2>٨. ئەدای خانووبەرە</h2>
      <table><thead><tr><th>یەکە</th><th>داهات</th><th>خەرجی</th><th>قازانج</th></tr></thead>
      <tbody>${props || '<tr><td colspan="4">—</td></tr>'}</tbody></table>
    </section>

    <section class="block cmp">
      <div>
        <h2>٩. بەراورد لەگەڵ مانگی پێشوو</h2>
        <p>داهات: ${fmt(bundle.comparison.prevMonth.incomeIqd)} · خەرجی: ${fmt(bundle.comparison.prevMonth.expenseIqd)} · قازانج: ${fmt(bundle.comparison.prevMonth.netIqd)}</p>
      </div>
      <div>
        <h2>YTD</h2>
        <p>داهات: ${fmt(bundle.comparison.ytd.incomeIqd)} · خەرجی: ${fmt(bundle.comparison.ytd.expenseIqd)} · قازانج: ${fmt(bundle.comparison.ytd.netIqd)}</p>
      </div>
    </section>

    <section class="block">
      <h2>١٠. پاشکۆی مامەڵەکان</h2>
      <table>
        <thead><tr><th>ژمارە</th><th>بەروار</th><th>جۆر</th><th>پۆل</th><th>لایەن</th><th>بڕ</th></tr></thead>
        <tbody>${appendix || '<tr><td colspan="6">—</td></tr>'}</tbody>
      </table>
    </section>
  </div>
</body>
</html>`;
}
