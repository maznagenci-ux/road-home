import type { MonthlyOwnerBundle } from '@/lib/accounting/types';
import { BRAND_NAME, BRAND_NAME_KU, BRAND_SLOGAN_KU } from '@/lib/brand';
import { companyAddressLine, companyContact } from '@/lib/company-contact';
import { brandLogoUrl } from '@/lib/pdf/assets';

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function fmtIqd(n: number) {
  return `${new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(Math.round(n))} د.ع`;
}

function fmtUsd(n: number) {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)}`;
}

function moneyTxn(amountOriginal: number, currency: string, amountBaseIqd: number) {
  if (currency === 'USD') return fmtUsd(amountOriginal);
  return fmtIqd(amountBaseIqd || amountOriginal);
}

function catTable(title: string, rows: { category: string; amountIqd: number }[]) {
  const body = rows.length
    ? rows
        .map(
          (r) =>
            `<tr><td>${esc(r.category)}</td><td class="num">${esc(fmtIqd(r.amountIqd))}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="2">—</td></tr>`;
  return `
  <section class="block">
    <h2>${esc(title)}</h2>
    <table><thead><tr><th>پۆل</th><th>بڕ</th></tr></thead><tbody>${body}</tbody></table>
  </section>`;
}

export function renderMonthlyOwnerReportHtml(
  bundle: MonthlyOwnerBundle,
  opts?: { assetBase?: string },
) {
  const logo = brandLogoUrl('logo.png', opts?.assetBase);
  const contact = companyContact();
  const phones = contact.phones.filter(Boolean);
  const e = bundle.executive;

  let incomeUsd = 0;
  let expenseUsd = 0;
  const incomeTypes = new Set([
    'INCOME',
    'CUSTOMER_PAYMENT',
    'PROPERTY_SALE',
    'PROPERTY_RENTAL',
    'INSTALLMENT',
    'COMMISSION',
    'EMPLOYEE_COMMISSION',
    'OWNER_CAPITAL',
    'CASH_DEPOSIT',
    'BANK_DEPOSIT',
  ]);
  for (const t of bundle.transactions) {
    if (t.currency !== 'USD') continue;
    const amt = t.amountOriginal || 0;
    if (incomeTypes.has(String(t.type))) incomeUsd += amt;
    else expenseUsd += amt;
  }

  const cards = [
    ['داهات (دینار)', fmtIqd(e.incomeIqd)],
    ['داهات (دۆلار)', fmtUsd(incomeUsd)],
    ['خەرجی (دینار)', fmtIqd(e.expenseIqd)],
    ['خەرجی (دۆلار)', fmtUsd(expenseUsd)],
    ['قازانج (دینار)', fmtIqd(e.netIqd)],
    ['قازانج (دۆلار)', fmtUsd(incomeUsd - expenseUsd)],
    ['نەقد / بەردەست', fmtIqd(e.cashIqd)],
    ['قەرزی کڕیار', fmtIqd(e.receivablesIqd)],
    ['قەرزی دابینکەر', fmtIqd(e.payablesIqd)],
  ]
    .map(
      ([label, val]) =>
        `<div class="card"><span>${esc(String(label))}</span><strong>${esc(String(val))}</strong></div>`,
    )
    .join('');

  const cashBlocks = bundle.cashReports
    .map(
      (r) =>
        `<tr><td>${esc(r.code)} — ${esc(r.name)}</td><td class="num">${esc(fmtIqd(r.openingBalanceIqd))}</td><td class="num">${esc(fmtIqd(r.closingBalanceIqd))}</td></tr>`,
    )
    .join('');
  void bundle.bankReports;
  const recv = bundle.receivables
    .map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${esc(fmtIqd(r.balanceIqd))}</td></tr>`)
    .join('');
  const pay = bundle.payables
    .map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${esc(fmtIqd(r.balanceIqd))}</td></tr>`)
    .join('');
  const props = bundle.propertyPerformance
    .map(
      (r) =>
        `<tr><td>${esc(r.label)}</td><td class="num">${esc(fmtIqd(r.incomeIqd))}</td><td class="num">${esc(fmtIqd(r.expenseIqd))}</td><td class="num">${esc(fmtIqd(r.profitIqd))}</td></tr>`,
    )
    .join('');

  const appendix = bundle.transactions
    .map(
      (t) =>
        `<tr><td>${esc(t.txnNo)}</td><td>${esc(t.date.slice(0, 10))}</td><td>${esc(t.type)}</td><td>${esc(t.category)}</td><td>${esc(t.partyName ?? '—')}</td><td class="num">${esc(moneyTxn(t.amountOriginal, t.currency, t.amountBaseIqd))}</td><td class="cur">${esc(t.currency)}</td></tr>`,
    )
    .join('');

  const phoneHtml = phones
    .map(
      (p, i) =>
        `<span class="phone" dir="ltr">${esc(p)}</span>${i < phones.length - 1 ? '<span class="sep">·</span>' : ''}`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>ڕاپۆرتی مانگانەی خاوەن — ${bundle.year}/${bundle.month}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    :root {
      --ink: #0b1f38;
      --teal: #0f766e;
      --muted: #64748b;
      --line: #e2e8f0;
      --soft: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Noto Kufi Arabic', Tahoma, sans-serif; color: var(--ink);
      margin: 0; background: linear-gradient(180deg, #eef6f5 0%, #f8fafc 40%, #fff 100%);
    }
    .page { max-width: 980px; margin: 0 auto; padding: 28px 24px 48px; }
    header.top {
      display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: center;
      background: #fff; border: 1px solid var(--line); border-radius: 18px;
      padding: 16px 18px; margin-bottom: 18px;
      box-shadow: 0 10px 30px rgba(15, 39, 68, 0.06);
    }
    .logo { height: 58px; width: auto; }
    h1 { margin: 0; font-size: 1.35rem; color: var(--ink); }
    .slogan { color: var(--muted); font-size: 0.9rem; margin-top: 4px; }
    .meta { color: var(--teal); font-size: 0.85rem; margin-top: 8px; font-weight: 700; }
    .contact { margin-top: 8px; font-size: 0.82rem; color: var(--muted); }
    .phones { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; direction: ltr; }
    .phone { font-variant-numeric: tabular-nums; font-weight: 700; color: var(--ink); }
    .sep { color: #94a3b8; }
    .note {
      display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      background: #ecfdf5; border: 1px solid #99f6e4; border-radius: 12px;
      padding: 10px 14px; margin-bottom: 16px; font-size: 0.85rem; color: #115e59;
    }
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0 0 18px; }
    .card {
      background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px;
      box-shadow: 0 4px 14px rgba(15, 39, 68, 0.04);
    }
    .card span { display: block; font-size: 0.75rem; color: var(--muted); }
    .card strong { display: block; margin-top: 6px; font-size: 1.02rem; font-variant-numeric: tabular-nums; }
    .block {
      background: #fff; border: 1px solid var(--line); border-radius: 16px;
      padding: 14px 16px; margin-bottom: 14px;
    }
    h2 { margin: 0 0 10px; font-size: 1.05rem; color: var(--teal); }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { border-bottom: 1px solid var(--soft); padding: 8px 5px; text-align: right; }
    th { color: var(--muted); font-weight: 700; background: var(--soft); }
    tr:nth-child(even) td { background: #fcfdff; }
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 700; }
    .cur { font-size: 0.75rem; font-weight: 800; color: var(--teal); }
    .cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media print {
      body { background: #fff; }
      .page { padding: 0; }
      .block, .card, header.top { break-inside: avoid; box-shadow: none; }
    }
    @media (max-width: 720px) {
      .cards, .cmp { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="top">
      <img class="logo" src="${logo}" alt="${esc(BRAND_NAME)}" />
      <div>
        <h1>${esc(BRAND_NAME_KU)}</h1>
        <div class="slogan">${esc(BRAND_SLOGAN_KU)} · ${esc(BRAND_NAME)}</div>
        <div class="meta">ڕاپۆرتی دارایی مانگانە · ${bundle.year}/${String(bundle.month).padStart(2, '0')}</div>
        <div class="contact">${esc(companyAddressLine(contact))}</div>
        <div class="phones">${phoneHtml || '—'}</div>
      </div>
    </header>

    <div class="note">
      <span>دراو: دینار و دۆلار بە جیا — هەر مامەڵەیەک بە دراوی خۆی</span>
      <span>${esc(bundle.range.from.slice(0, 10))} → ${esc(bundle.range.to.slice(0, 10))}</span>
    </div>

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
      <p>داهات: <strong>${esc(fmtIqd(bundle.pl.incomeIqd))}</strong> · خەرجی: <strong>${esc(fmtIqd(bundle.pl.expenseIqd))}</strong> · قازانجی خاوێن: <strong>${esc(fmtIqd(bundle.pl.netProfitIqd))}</strong></p>
      <p style="font-size:0.8rem;color:#64748b">سەرمایە/ڕاکێشانی خاوەن لە P&amp;L دەرنەخراون. دۆلار جیا لە دینار نیشاندراوە.</p>
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
        <p>داهات: ${esc(fmtIqd(bundle.comparison.prevMonth.incomeIqd))} · خەرجی: ${esc(fmtIqd(bundle.comparison.prevMonth.expenseIqd))} · قازانج: ${esc(fmtIqd(bundle.comparison.prevMonth.netIqd))}</p>
      </div>
      <div>
        <h2>YTD</h2>
        <p>داهات: ${esc(fmtIqd(bundle.comparison.ytd.incomeIqd))} · خەرجی: ${esc(fmtIqd(bundle.comparison.ytd.expenseIqd))} · قازانج: ${esc(fmtIqd(bundle.comparison.ytd.netIqd))}</p>
      </div>
    </section>

    <section class="block">
      <h2>١٠. پاشکۆی مامەڵەکان</h2>
      <table>
        <thead><tr><th>ژمارە</th><th>بەروار</th><th>جۆر</th><th>پۆل</th><th>لایەن</th><th>بڕ</th><th>دراو</th></tr></thead>
        <tbody>${appendix || '<tr><td colspan="7">—</td></tr>'}</tbody>
      </table>
    </section>
  </div>
</body>
</html>`;
}
