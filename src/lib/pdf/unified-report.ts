import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';
import { isRTL } from '@/i18n/locale-config';
import { BRAND_NAME, BRAND_NAME_KU, BRAND_SLOGAN_KU } from '@/lib/brand';
import { companyContact } from '@/lib/company-contact';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { UnifiedFinancials } from '@/lib/finance/unified-report';
import { brandLogoPair } from '@/lib/pdf/assets';

function esc(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function dual(locale: Locale, iqd: number, usd: number) {
  const parts: string[] = [];
  if (iqd > 0.5 || usd <= 0.005) parts.push(formatCurrency(iqd, locale, 'IQD'));
  if (usd > 0.005) parts.push(formatCurrency(usd, locale, 'USD'));
  return parts.join(' · ');
}

export function renderUnifiedFinancialReportHtml(
  locale: Locale,
  t: Dictionary,
  data: UnifiedFinancials & { assetBase?: string },
): string {
  const rtl = isRTL(locale);
  const dir = rtl ? 'rtl' : 'ltr';
  const font = rtl
    ? "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Segoe UI', system-ui, sans-serif";
  const r = (t.pages as { reports?: Record<string, string> }).reports ?? {};
  const period =
    data.from || data.to
      ? `${data.from ?? '…'} → ${data.to ?? '…'}`
      : (r.allTime ?? 'هەموو کات');
  const { logo, mark } = brandLogoPair(data.assetBase);
  const contact = companyContact();
  const phones = contact.phones.filter(Boolean);
  const phoneHtml = phones
    .map(
      (p, i) =>
        `<span dir="ltr">${esc(p)}</span>${i < phones.length - 1 ? '<span class="sep">·</span>' : ''}`,
    )
    .join('');

  const card = (label: string, value: string, tone = '') =>
    `<div class="card ${tone}"><label>${esc(label)}</label><div class="value">${esc(value)}</div></div>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(t.pdf.financialReport)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${font}; padding: 28px; color: #0b1f38; direction: ${dir};
      background: linear-gradient(180deg, #eef6f5 0%, #fff 45%);
    }
    .sheet {
      max-width: 920px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 18px; padding: 22px 24px 28px;
      box-shadow: 0 12px 36px rgba(15,39,68,.08);
    }
    .head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
      border-bottom: 2px solid #0b1f38; padding-bottom: 14px; margin-bottom: 14px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 54px; height: 54px; object-fit: contain; }
    h1 { font-size: 20px; margin-bottom: 2px; }
    .brand-ku { font-size: 15px; font-weight: 800; }
    .sub { font-size: 12px; color: #64748b; margin-bottom: 2px; }
    .contact { text-align: ${rtl ? 'left' : 'right'}; font-size: 11.5px; color: #475569; }
    .phones { margin-top: 4px; direction: ltr; unicode-bidi: isolate; display: flex; flex-wrap: wrap; gap: 6px; justify-content: ${rtl ? 'flex-start' : 'flex-end'}; font-weight: 700; color: #0b1f38; font-variant-numeric: tabular-nums; }
    .sep { color: #94a3b8; }
    .note {
      background: #ecfdf5; border: 1px solid #99f6e4; color: #115e59;
      border-radius: 12px; padding: 10px 12px; font-size: 12px; margin-bottom: 16px;
    }
    .period { font-size: 13px; color: #0b1f38; font-weight: 700; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card {
      border: 1px solid #d7e0ea; border-radius: 14px; padding: 14px 16px; background: #f8fafc;
    }
    .card.income { background: #ecfdf5; border-color: #99f6e4; }
    .card.expense { background: #fff1f2; border-color: #fecdd3; }
    .card.profit { background: #eff6ff; border-color: #bfdbfe; }
    .card label { font-size: 11px; color: #64748b; display: block; margin-bottom: 4px; }
    .card .value { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.45; }
    .section { margin-top: 20px; font-size: 13px; font-weight: 800; color: #0f766e; margin-bottom: 8px; }
    .generated { text-align: center; margin-top: 28px; font-size: 11px; color: #94a3b8; }
    @media print {
      body { padding: 0; background: #fff; }
      .sheet { box-shadow: none; border: 0; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">
        <img class="logo" src="${logo}" alt="${esc(BRAND_NAME)}" onerror="this.src='${mark}'" />
        <div>
          <p class="brand-ku">${esc(BRAND_NAME_KU)}</p>
          <p class="sub">${esc(BRAND_NAME)} · ${esc(BRAND_SLOGAN_KU)}</p>
          <h1>${esc(t.pdf.financialReport)}</h1>
        </div>
      </div>
      <div class="contact">
        <div>${esc(contact.address)}</div>
        <div class="phones">${phoneHtml || '—'}</div>
        <p class="sub" style="margin-top:6px">${esc(formatDate(new Date(), locale))}</p>
      </div>
    </div>

    <div class="note">دۆلار وەک دۆلار · دینار وەک دینار — هەر مامەڵەیەک بە دراوی خۆی</div>
    <p class="period">${esc(r.period ?? 'ماوە')}: ${esc(period)}</p>

    <div class="grid">
      ${card(r.totalIncome ?? t.dashboard.totalIncome, dual(locale, data.totalIncomeIqd, data.totalIncomeUsd), 'income')}
      ${card(r.totalExpenses ?? t.dashboard.totalExpenses, dual(locale, data.totalExpenseIqd, data.totalExpenseUsd), 'expense')}
      ${card(r.net ?? t.dashboard.netBalance, dual(locale, data.netIqd, data.netUsd), 'profit')}
      ${card(r.vendorDebt ?? 'قەرزی فرۆشیار', formatCurrency(data.vendorDebtsIqd, locale))}
    </div>

    <p class="section">${esc(r.incomeBreakdown ?? 'داهات')}</p>
    <div class="grid">
      ${card(r.salesIncome ?? 'داهاتی فرۆشتن', dual(locale, data.salesIncomeIqd, data.salesIncomeUsd))}
      ${card(r.rentalIncome ?? 'داهاتی کرێ', dual(locale, data.rentalIncomeIqd, data.rentalIncomeUsd))}
    </div>

    <p class="section">${esc(r.expenseBreakdown ?? 'خەرجی')}</p>
    <div class="grid">
      ${card(r.constructionExpense ?? 'خەرجی بیناسازی', dual(locale, data.constructionExpenseIqd, data.constructionExpenseUsd))}
      ${card(r.officeExpense ?? 'خەرجی ئۆفیس', dual(locale, data.officeExpenseIqd, data.officeExpenseUsd))}
      ${card(r.salaryExpense ?? 'مووچەی کارمەندان', dual(locale, data.salaryExpenseIqd, data.salaryExpenseUsd))}
      ${card(r.activeContracts ?? t.dashboard.activeContracts, String(data.activeContracts))}
    </div>

    <p class="generated">${esc(t.pdf.generatedAt)}: ${esc(formatDate(new Date(), locale))} · ${data.properties} ${esc(r.properties ?? 'موڵک')} · ${data.activeLeases} ${esc(r.activeLeases ?? 'کرێی چالاک')}</p>
  </div>
  <script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)});</script>
</body>
</html>`;
}
