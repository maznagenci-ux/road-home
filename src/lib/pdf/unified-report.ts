import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';
import { isRTL } from '@/i18n/locale-config';
import { BRAND_NAME, BRAND_NAME_KU, BRAND_SLOGAN_KU } from '@/lib/brand';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { UnifiedFinancials } from '@/lib/finance/unified-report';
import { brandLogoPair } from '@/lib/pdf/assets';

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

  const card = (label: string, value: string) =>
    `<div class="card"><label>${label}</label><div class="value">${value}</div></div>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${t.pdf.financialReport}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${font}; padding: 36px; color: #0f2744; direction: ${dir}; background: #fff; }
    .head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; border-bottom: 2px solid #0f2744; padding-bottom: 12px; }
    .logo { width: 52px; height: 52px; object-fit: contain; }
    h1 { font-size: 20px; margin-bottom: 2px; }
    .brand-ku { font-size: 14px; font-weight: 700; }
    .sub { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .period { font-size: 12px; color: #0f2744; font-weight: 600; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { border: 1px solid #d7e0ea; border-radius: 12px; padding: 16px; background: #f8fafc; }
    .card label { font-size: 11px; color: #64748b; display: block; margin-bottom: 4px; }
    .card .value { font-size: 18px; font-weight: 700; }
    .section { margin-top: 22px; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; }
    .generated { text-align: center; margin-top: 36px; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="head">
    <img class="logo" src="${logo}" alt="${BRAND_NAME}" onerror="this.src='${mark}'" />
    <div>
      <p class="brand-ku">${BRAND_NAME_KU}</p>
      <p class="sub">${BRAND_NAME} · ${BRAND_SLOGAN_KU}</p>
      <h1>${t.pdf.financialReport}</h1>
    </div>
  </div>
  <p class="sub">${formatDate(new Date(), locale)}</p>
  <p class="period">${r.period ?? 'ماوە'}: ${period}</p>

  <div class="grid">
    ${card(r.totalIncome ?? t.dashboard.totalIncome, formatCurrency(data.totalIncomeIqd, locale))}
    ${card(r.totalExpenses ?? t.dashboard.totalExpenses, formatCurrency(data.totalExpenseIqd, locale))}
    ${card(r.net ?? t.dashboard.netBalance, formatCurrency(data.netIqd, locale))}
    ${card(r.vendorDebt ?? 'قەرزی فرۆشیار', formatCurrency(data.vendorDebtsIqd, locale))}
  </div>

  <p class="section">${r.incomeBreakdown ?? 'داهات'}</p>
  <div class="grid">
    ${card(r.salesIncome ?? 'داهاتی فرۆشتن', formatCurrency(data.salesIncomeIqd, locale))}
    ${card(r.rentalIncome ?? 'داهاتی کرێ', formatCurrency(data.rentalIncomeIqd, locale))}
  </div>

  <p class="section">${r.expenseBreakdown ?? 'خەرجی'}</p>
  <div class="grid">
    ${card(r.constructionExpense ?? 'خەرجی بیناسازی', formatCurrency(data.constructionExpenseIqd, locale))}
    ${card(r.officeExpense ?? 'خەرجی ئۆفیس', formatCurrency(data.officeExpenseIqd, locale))}
    ${card(r.salaryExpense ?? 'مووچەی کارمەندان', formatCurrency(data.salaryExpenseIqd, locale))}
    ${card(r.activeContracts ?? t.dashboard.activeContracts, String(data.activeContracts))}
  </div>

  <p class="generated">${t.pdf.generatedAt}: ${formatDate(new Date(), locale)} · ${data.properties} ${r.properties ?? 'موڵک'} · ${data.activeLeases} ${r.activeLeases ?? 'کرێی چالاک'}</p>
  <script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)});</script>
</body>
</html>`;
}
