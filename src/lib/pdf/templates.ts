import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';
import { isRTL } from '@/i18n/locale-config';
import { BRAND_NAME, BRAND_NAME_AR, BRAND_NAME_EN } from '@/lib/brand';
import { rentalClausePrefix } from '@/lib/contracts/rental-clauses';
import { saleClausePrefix } from '@/lib/contracts/sale-clauses';
import { formatCurrency, formatDate } from '@/lib/utils';

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

interface ReceiptData {
  receiptNo: string;
  type: 'PAYMENT' | 'INCOME' | 'EXPENSE';
  currency?: 'IQD' | 'USD';
  amount: number;
  totalAmount?: number | null;
  remainingAmount?: number | null;
  partyName?: string | null;
  issuedAt: Date;
  description?: string | null;
  customerName?: string | null;
  propertyName?: string | null;
  houseName?: string | null;
  /** SECURITY_DEPOSIT → show deposit title on voucher */
  purpose?: 'GENERAL' | 'RENT' | 'SECURITY_DEPOSIT' | null;
  autoPrint?: boolean;
  /** Absolute origin for logo assets, e.g. http://localhost:3001 */
  assetBase?: string;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function renderReceiptHtml(locale: Locale, t: Dictionary, data: ReceiptData): string {
  const rtl = isRTL(locale);
  const dir = rtl ? 'rtl' : 'ltr';
  const font = rtl
    ? "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Segoe UI', system-ui, sans-serif";
  const isDeposit = data.purpose === 'SECURITY_DEPOSIT';
  const isIncome = data.type === 'INCOME';
  const titleKu = isDeposit
    ? 'وەسڵی پارەی تأمینات'
    : isIncome
      ? 'پسووڵەی پارەوەرگرتن'
      : 'وەسڵی پارەدان';
  const titleAr = isDeposit ? 'وصل مبلغ التأمين' : isIncome ? 'وصل قبض' : 'وصل دفع';
  const kindBadge = isDeposit ? 'پارەی تأمینات · مبلغ التأمين' : '';
  const party = esc(data.partyName || data.customerName || '—');
  const safeDesc = data.description
    ? esc(data.description)
    : [data.houseName, data.propertyName].filter(Boolean).map((s) => esc(String(s))).join(' · ') || '—';
  const safeNo = esc(data.receiptNo);
  const cur = data.currency === 'USD' ? 'USD' : 'IQD';
  const amountStr = formatCurrency(data.amount, locale, cur);
  const remainingStr =
    data.remainingAmount != null ? formatCurrency(data.remainingAmount, locale, cur) : '—';
  const totalStr = data.totalAmount != null ? formatCurrency(data.totalAmount, locale, cur) : null;
  const dateStr = isoDate(data.issuedAt);
  const base = (data.assetBase ?? '').replace(/\/$/, '');
  const logoFull = `${base}/brand/logo.png`;
  const logoMark = `${base}/brand/logo-mark.png`;
  const phones = ['0750 207 0008', '0750 490 0302'];

  const copyLabel = (copy: 'original' | 'duplicate') =>
    copy === 'original' ? t.pdf.receiptCopyOriginal : t.pdf.receiptCopyDuplicate;

  const receiptBlock = (copy: 'original' | 'duplicate') => `
  <article class="voucher">
    <div class="wm" aria-hidden="true"><img src="${logoMark}" alt="" /></div>
    <header class="head">
      <div class="brand-col">
        <div class="logo-row">
          <img class="logo" src="${logoFull}" alt="Road Home" />
          <div>
            <div class="copy-pill">${copyLabel(copy)}</div>
          </div>
        </div>
        <table class="meta-box">
          <tr><th>ژمارە / رقم</th><td>${safeNo}</td></tr>
          <tr><th>ڕێکەوت / التاريخ</th><td>${dateStr}</td></tr>
          ${isDeposit ? `<tr><th>جۆر / النوع</th><td>پارەی تأمینات</td></tr>` : ''}
        </table>
      </div>
      <div class="names-col">
        <p class="n-brand">${BRAND_NAME}</p>
        <div class="phones">
          <span>${phones[0]}</span>
          <span class="sep">·</span>
          <span>${phones[1]}</span>
        </div>
        <h1 class="doc-title">${titleKu} — ${titleAr}</h1>
        ${kindBadge ? `<p class="kind-badge">${kindBadge}</p>` : ''}
      </div>
    </header>
    <div class="lines">
      <p class="line"><span class="lab">${isDeposit ? 'لایەن / الطرف' : t.pdf.receivedFrom}</span><span class="val">${party}</span></p>
      <p class="line"><span class="lab">${isDeposit ? 'بڕی پارەی تأمینات / مبلغ التأمين' : t.pdf.amountLine}</span><span class="val">${amountStr}${totalStr ? ` · ${t.pdf.totalAmount}: ${totalStr}` : ''}</span></p>
      <p class="line line-remaining"><span class="lab">${t.pdf.remainingLine}</span><span class="val">${remainingStr}</span></p>
      <p class="line"><span class="lab">${t.pdf.forLine}</span><span class="val">${safeDesc}</span></p>
    </div>
    <footer class="signs">
      <div class="sign"><div class="sign-label">${t.pdf.payerLine}</div><div class="sign-name">${party}</div></div>
      <div class="sign"><div class="sign-label">${t.pdf.receiverLine}</div><div class="sign-name">${BRAND_NAME}</div></div>
    </footer>
  </article>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${titleKu} — ${safeNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 8mm; }
    body { font-family: ${font}; color: #0f2744; background: #e8eef5; direction: ${dir}; }
    .toolbar { max-width: 210mm; margin: 12px auto; display: flex; justify-content: flex-end; padding: 0 8px; }
    .toolbar button { font-family: inherit; border: 0; background: #0f2744; color: #fff; padding: 8px 16px; font-size: 13px; cursor: pointer; border-radius: 6px; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto 16px; background: #fff; padding: 8mm 10mm; display: flex; flex-direction: column; box-shadow: 0 8px 28px rgb(15 39 68 / 0.12); }
    .voucher { position: relative; flex: 1 1 0; min-height: 0; padding: 4mm 2mm 3mm; overflow: hidden; display: flex; flex-direction: column; }
    .wm { position: absolute; inset: 16% 18% 20%; display: flex; align-items: center; justify-content: center; opacity: 0.09; pointer-events: none; z-index: 0; }
    .wm img { width: 48%; max-width: 200px; height: auto; }
    .head, .lines, .signs { position: relative; z-index: 1; }
    .head { display: grid; grid-template-columns: 1.05fr 1.2fr; gap: 10px; align-items: start; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid #0f2744; }
    .logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .logo {
      width: 78px;
      height: 78px;
      object-fit: contain;
      background: #fff;
      border: 1px solid #dbe3ef;
      border-radius: 10px;
      padding: 4px;
    }
    .brand-en { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 14px; font-weight: 700; color: #0f2744; letter-spacing: 0.02em; }
    .copy-pill { display: inline-block; margin-top: 4px; font-size: 9px; font-weight: 600; color: #8b4513; border: 1px solid #c4a484; padding: 1px 6px; }
    .meta-box { width: 100%; max-width: 210px; border-collapse: collapse; font-size: 11px; border: 1px solid #0f2744; }
    .meta-box th, .meta-box td { border: 1px solid #0f2744; padding: 4px 7px; text-align: start; }
    .meta-box th { background: #f3f6fa; font-weight: 600; width: 42%; white-space: nowrap; }
    .meta-box td { font-weight: 700; font-variant-numeric: tabular-nums; }
    .names-col { text-align: end; }
    .n-brand { font-size: 15px; font-weight: 700; color: #000000; }
    .phones {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #0f2744;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      direction: ltr;
      unicode-bidi: isolate;
    }
    .phones .sep { color: #94a3b8; font-weight: 500; }
    .doc-title { margin-top: 8px; font-size: 15px; font-weight: 700; color: #8b4513; }
    .kind-badge {
      margin-top: 6px; display: inline-block; font-size: 12px; font-weight: 700;
      color: #0f2744; background: #e8eef5; border: 1px solid #0f2744;
      padding: 3px 10px; letter-spacing: 0.01em;
    }
    .lines { flex: 1; padding-top: 6px; }
    .line { display: flex; gap: 8px; align-items: baseline; padding: 7px 0 6px; border-bottom: 1px dotted #94a3b8; font-size: 13px; line-height: 1.55; }
    .lab { flex: 0 0 auto; color: #334155; font-weight: 600; white-space: nowrap; }
    .val { flex: 1; font-weight: 700; color: #0f172a; min-width: 0; }
    .line-remaining .lab,
    .line-remaining .val { color: #dc2626; }
    .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 14px; }
    .sign { text-align: center; }
    .sign-label { font-size: 11px; color: #475569; margin-bottom: 28px; }
    .sign-name { border-top: 1px solid #0f2744; padding-top: 6px; font-size: 12px; font-weight: 600; }
    .cut {
      flex: 0 0 auto;
      margin: 3mm 0;
      border: 0;
      border-top: 1px dashed #94a3b8;
      height: 0;
    }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .page { width: auto; min-height: auto; height: 100vh; margin: 0; padding: 6mm 8mm; box-shadow: none; }
      .voucher { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="window.print()">${t.common.print}</button></div>
  <div class="page">
    ${receiptBlock('original')}
    <hr class="cut" />
    ${receiptBlock('duplicate')}
  </div>
  ${data.autoPrint ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)});</script>' : ''}
</body>
</html>`;
}

export function renderFinancialReportHtml(
  locale: Locale,
  t: Dictionary,
  data: { totalIncome: number; totalExpenses: number; properties: number; contracts: number },
): string {
  const rtl = isRTL(locale);
  const dir = rtl ? 'rtl' : 'ltr';
  const font = rtl
    ? "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Segoe UI', system-ui, sans-serif";

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${t.pdf.financialReport}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${font}; padding: 40px; color: #1e293b; direction: ${dir}; }
    h1 { font-size: 24px; color: #2563eb; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #64748b; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .card label { font-size: 12px; color: #64748b; display: block; margin-bottom: 4px; }
    .card .value { font-size: 22px; font-weight: 700; color: #0f172a; }
    .generated { text-align: center; margin-top: 40px; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${t.pdf.financialReport}</h1>
  <p class="subtitle">${t.app.name} — ${formatDate(new Date(), locale)}</p>
  <div class="grid">
    <div class="card"><label>${t.dashboard.totalIncome}</label><div class="value">${formatCurrency(data.totalIncome, locale)}</div></div>
    <div class="card"><label>${t.dashboard.totalExpenses}</label><div class="value">${formatCurrency(data.totalExpenses, locale)}</div></div>
    <div class="card"><label>${t.dashboard.netBalance}</label><div class="value">${formatCurrency(data.totalIncome - data.totalExpenses, locale)}</div></div>
    <div class="card"><label>${t.dashboard.totalProperties}</label><div class="value">${data.properties}</div></div>
    <div class="card"><label>${t.dashboard.activeContracts}</label><div class="value">${data.contracts}</div></div>
  </div>
  <p class="generated">${t.pdf.generatedAt}: ${formatDate(new Date(), locale)}</p>
</body>
</html>`;
}

export interface SaleContractPdfData {
  contractNo: string;
  title?: string | null;
  kind?: 'SALE' | 'PURCHASE';
  propertyType?: string | null;
  propertyCode?: string | null;
  location?: string | null;
  sellerName?: string | null;
  sellerPhone?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  witness1Name?: string | null;
  witness1Phone?: string | null;
  witness2Name?: string | null;
  witness2Phone?: string | null;
  guarantorName?: string | null;
  guarantorPhone?: string | null;
  lawyerName?: string | null;
  lawyerPhone?: string | null;
  signingDate?: Date | null;
  isExternal?: boolean;
  clauses: string[];
  autoPrint?: boolean;
  assetBase?: string;
}

/** Sale/purchase contract PDF — same visual system as lease PDF. */
export function renderContractHtml(locale: Locale, t: Dictionary, data: SaleContractPdfData): string {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const font = "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif";
  const base = (data.assetBase ?? '').replace(/\/$/, '');
  const logoFull = `${base}/brand/logo.png`;
  const logoMark = `${base}/brand/logo-mark.png`;
  const g = t.pages.contractGen as Record<string, string>;
  const r = t.pages.rentals as Record<string, string>;
  const title =
    data.title?.trim() ||
    (data.kind === 'PURCHASE'
      ? g.titlePurchase ?? 'گرێبەستی کڕین'
      : g.contractTitle ?? g.title ?? 'گرێبەستی فرۆشتن');
  const phones = ['0750 207 0008', '0750 490 0302'];
  const sellerLabel = g.seller ?? 'فرۆشیار';
  const buyerLabel = g.buyer ?? 'کڕیار';
  const witness1Label = g.witness1 ?? r.witness1 ?? 'شایەدی یەکەم';
  const witness2Label = g.witness2 ?? r.witness2 ?? 'شایەدی دووەم';

  const display = (s?: string | null, fallback = '—') => {
    const t0 = s?.trim();
    return esc(t0 && t0.length ? t0 : fallback);
  };
  const phoneLine = (s?: string | null) => {
    const t0 = s?.trim();
    return t0 && t0.length ? esc(t0) : '—';
  };

  const seller = display(data.sellerName);
  const buyer = display(data.buyerName);
  const w1 = display(data.witness1Name);
  const w2 = display(data.witness2Name);
  const sellerPhone = phoneLine(data.sellerPhone);
  const buyerPhone = phoneLine(data.buyerPhone);
  const w1Phone = phoneLine(data.witness1Phone);
  const w2Phone = phoneLine(data.witness2Phone);
  const hasGuarantor = Boolean(data.guarantorName?.trim());
  const hasLawyer = Boolean(data.lawyerName?.trim());
  const guarantor = hasGuarantor ? display(data.guarantorName) : '';
  const lawyer = hasLawyer ? display(data.lawyerName) : '';
  const guarantorPhone = hasGuarantor ? phoneLine(data.guarantorPhone) : '';
  const lawyerPhone = hasLawyer ? phoneLine(data.lawyerPhone) : '';
  const guarantorLabel = g.guarantor ?? 'کەفیل';
  const lawyerLabel = g.lawyer ?? 'پارێزەر';
  const phoneLabel = r.phone ?? 'ژمارە';
  const page1Label = g.pdfPage1 ?? r.pdfPage1 ?? 'پەڕەی ١ / ٢';
  const page2Label = g.pdfPage2 ?? r.pdfPage2 ?? 'پەڕەی ٢ / ٢';
  const externalLabel = g.scopeExternalStamp ?? g.scopeExternal ?? 'گرێبەستی دەرەکی';
  const isExternal = Boolean(data.isExternal);
  const clauseStrip = saleClausePrefix(locale);

  const clauseItems = data.clauses.map((c, i) => ({
    n: i + 1,
    text: esc(c.replace(clauseStrip, '')),
  }));
  const splitAt = Math.min(9, Math.max(1, clauseItems.length - 6));
  const page1Clauses = clauseItems.slice(0, splitAt);
  const page2Clauses = clauseItems.slice(splitAt);

  const partyCard = (role: string, name: string, phone: string) => `
    <div class="party-card">
      <div class="party-role">${role}</div>
      <div class="party-name">${name}</div>
      <div class="party-phone"><span>${esc(phoneLabel)}</span> <b dir="ltr">${phone}</b></div>
    </div>`;

  const partiesBlock = `
    <section class="parties">
      ${partyCard(esc(sellerLabel), seller, sellerPhone)}
      ${partyCard(esc(buyerLabel), buyer, buyerPhone)}
      ${partyCard(esc(witness1Label), w1, w1Phone)}
      ${partyCard(esc(witness2Label), w2, w2Phone)}
      ${hasGuarantor ? partyCard(esc(guarantorLabel), guarantor, guarantorPhone) : ''}
      ${hasLawyer ? partyCard(esc(lawyerLabel), lawyer, lawyerPhone) : ''}
    </section>`;

  const sigsBlock = `
    <div class="sigs">
      <div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(sellerLabel)}</div>
        <div class="sig-name">${seller}</div>
      </div>
      <div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(buyerLabel)}</div>
        <div class="sig-name">${buyer}</div>
      </div>
      <div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(witness1Label)}</div>
        <div class="sig-name">${w1}</div>
      </div>
      <div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(witness2Label)}</div>
        <div class="sig-name">${w2}</div>
      </div>
      ${
        hasGuarantor
          ? `<div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(guarantorLabel)}</div>
        <div class="sig-name">${guarantor}</div>
      </div>`
          : ''
      }
      ${
        hasLawyer
          ? `<div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(lawyerLabel)}</div>
        <div class="sig-name">${lawyer}</div>
      </div>`
          : ''
      }
    </div>`;

  const letterhead = (pageLabel: string) => `
    <header class="head">
      <div>
        <div class="logo-row">
          <img class="logo" src="${esc(logoFull)}" alt="Road Home" onerror="this.src='${esc(logoMark)}'" />
          <div>
            <div class="brand-mark">${esc(BRAND_NAME)}</div>
            <div class="page-tag">${esc(pageLabel)}</div>
          </div>
        </div>
        <table class="meta-box">
          <tr><th>${esc(g.contractNo ?? 'ژمارە')}</th><td>${esc(data.contractNo)}</td></tr>
          <tr><th>${esc(g.signingDate ?? r.signingDate ?? 'ڕێکەوت')}</th><td>${isoDate(data.signingDate ?? new Date())}</td></tr>
        </table>
      </div>
      <div class="names">
        <p class="n-ku">${esc(BRAND_NAME)}</p>
        <p class="n-ar">${esc(BRAND_NAME_AR)}</p>
        <p class="n-en">${esc(BRAND_NAME_EN)}</p>
        <div class="phones">
          <span>${phones[0]}</span><span class="sep">·</span><span>${phones[1]}</span>
        </div>
        <h1 class="doc-title">${esc(title)}</h1>
        ${isExternal ? `<div class="ext-stamp">${esc(externalLabel)}</div>` : ''}
      </div>
    </header>
    ${partiesBlock}`;

  const renderClauses = (items: { n: number; text: string }[]) =>
    items.map((c) => `<p class="clause"><strong>${c.n}.</strong> ${c.text}</p>`).join('');

  const intro1 =
    (g.pdfIntro ??
      'ئەم گرێبەستە لە نێوان لایەنی یەکەم ({seller} — {sellerRole}) و لایەنی دووەم ({buyer} — {buyerRole}) ڕێککەوتووە، بە شایەدی ({w1}) و ({w2}). بەندەکانی خوارەوە بەشێکن لەم گرێبەستە و هەردوو لا پابەندن پێیانەوە.')
      .replaceAll('{seller}', seller)
      .replaceAll('{buyer}', buyer)
      .replaceAll('{w1}', w1)
      .replaceAll('{w2}', w2)
      .replaceAll('{sellerRole}', esc(sellerLabel))
      .replaceAll('{buyerRole}', esc(buyerLabel));

  const intro2 =
    (g.pdfIntroContinued ??
      'بەردەوامی گرێبەستی فرۆشتن ژمارە <strong>{contractNo}</strong> لە نێوان {seller} و {buyer}، بە شایەدی {w1} و {w2}.')
      .replaceAll('{contractNo}', esc(data.contractNo))
      .replaceAll('{seller}', seller)
      .replaceAll('{buyer}', buyer)
      .replaceAll('{w1}', w1)
      .replaceAll('{w2}', w2);

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title> </title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 0; }
    body { font-family: ${font}; color: #0f2744; background: #e8eef5; direction: ${dir}; }
    .toolbar { max-width: 210mm; margin: 12px auto; display: flex; justify-content: flex-end; padding: 0 8px; }
    .toolbar button { font-family: inherit; border: 0; background: #0f2744; color: #fff; padding: 8px 16px; font-size: 13px; cursor: pointer; border-radius: 6px; }
    .sheet {
      width: 210mm; min-height: 297mm; margin: 0 auto 16px; background: #fff;
      padding: 9mm 11mm 10mm; position: relative; overflow: hidden;
      box-shadow: 0 8px 28px rgb(15 39 68 / 0.12);
      display: flex; flex-direction: column;
    }
    .wm {
      position: absolute; inset: 24% 16% 20%; display: flex; align-items: center; justify-content: center;
      opacity: 0.05; pointer-events: none; z-index: 0;
    }
    .wm img { width: 40%; max-width: 190px; height: auto; }
    .content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; }
    .head {
      display: grid; grid-template-columns: 1.05fr 1.15fr; gap: 12px; align-items: start;
      padding-bottom: 8px; margin-bottom: 8px; border-bottom: 2.5px solid #0f2744;
    }
    .logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .logo {
      width: 64px; height: 64px; object-fit: contain; background: #fff;
      border: 1px solid #dbe3ef; border-radius: 10px; padding: 3px;
    }
    .brand-mark { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 13px; font-weight: 700; color: #0f2744; }
    .page-tag { margin-top: 2px; font-size: 10px; font-weight: 600; color: #8b4513; }
    .meta-box { width: 100%; max-width: 210px; border-collapse: collapse; font-size: 10.5px; border: 1px solid #0f2744; }
    .meta-box th, .meta-box td { border: 1px solid #0f2744; padding: 4px 7px; text-align: start; }
    .meta-box th { background: #f3f6fa; font-weight: 600; width: 44%; white-space: nowrap; }
    .meta-box td { font-weight: 700; font-variant-numeric: tabular-nums; }
    .names { text-align: end; }
    .n-ku { font-size: 14px; font-weight: 700; color: #0f2744; }
    .n-ar { font-size: 11px; color: #334155; margin-top: 2px; }
    .n-en { font-size: 10px; color: #64748b; margin-top: 2px; }
    .phones {
      margin-top: 6px; display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; color: #0f2744; font-variant-numeric: tabular-nums;
      direction: ltr; unicode-bidi: isolate;
    }
    .phones .sep { color: #94a3b8; font-weight: 500; }
    .doc-title { margin-top: 8px; font-size: 15px; font-weight: 700; color: #8b4513; }
    .ext-stamp {
      display: inline-block; margin-top: 8px; padding: 4px 12px;
      border: 2px solid #b45309; color: #92400e; background: #fff7ed;
      font-size: 12px; font-weight: 800; border-radius: 8px;
    }
    .ext-banner {
      position: absolute; top: 46%; left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 48px; font-weight: 900; color: rgba(180, 83, 9, 0.11);
      white-space: nowrap; pointer-events: none; z-index: 0; letter-spacing: 0.04em;
    }
    .parties {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
      margin: 0 0 10px; padding-bottom: 8px; border-bottom: 1px dotted #94a3b8;
    }
    .party-card {
      border: 1px solid #cfd8e6; border-radius: 8px; padding: 7px 8px; background: #f8fafc;
      min-height: 64px;
    }
    .party-role { font-size: 9.5px; font-weight: 700; color: #8b4513; margin-bottom: 3px; }
    .party-name { font-size: 11.5px; font-weight: 700; color: #0f2744; line-height: 1.35; word-break: break-word; }
    .party-phone { margin-top: 4px; font-size: 10px; color: #475569; font-variant-numeric: tabular-nums; }
    .party-phone span { color: #64748b; }
    .party-phone b { font-weight: 700; color: #0f2744; unicode-bidi: isolate; }
    .intro { text-align: justify; font-size: 12px; line-height: 1.7; color: #334155; margin: 0 0 10px; }
    .clauses { flex: 1; }
    .clause { font-size: 11.5px; line-height: 1.78; margin-bottom: 6px; text-align: justify; color: #1e293b; }
    .sigs {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: auto;
      padding-top: 14px;
    }
    .sig { text-align: center; }
    .sig-space { height: 40px; }
    .sig-role { border-top: 1px solid #0f2744; padding-top: 5px; font-size: 10px; color: #475569; }
    .sig-name { margin-top: 3px; font-size: 11px; font-weight: 700; color: #0f2744; word-break: break-word; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet {
        width: auto; min-height: 100vh; height: 100vh; margin: 0; padding: 9mm 11mm;
        box-shadow: none; page-break-after: always; break-after: page;
      }
      .sheet:last-of-type { page-break-after: auto; break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="document.title=' ';window.print()">${t.common.print}</button></div>

  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /></div>
    ${isExternal ? `<div class="ext-banner" aria-hidden="true">${esc(externalLabel)}</div>` : ''}
    <div class="content">
      ${letterhead(page1Label)}
      <p class="intro">${intro1}</p>
      <div class="clauses">${renderClauses(page1Clauses)}</div>
      ${sigsBlock}
    </div>
  </div>

  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /></div>
    ${isExternal ? `<div class="ext-banner" aria-hidden="true">${esc(externalLabel)}</div>` : ''}
    <div class="content">
      ${letterhead(page2Label)}
      <p class="intro">${intro2}</p>
      <div class="clauses">${renderClauses(page2Clauses)}</div>
      ${sigsBlock}
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

export interface AnketPdfData {
  anketNo: string;
  kind: 'SALE' | 'RENT';
  issuedAt: Date;
  securityStationName?: string | null;
  projectName?: string | null;
  propertyName?: string | null;
  propertyNo?: string | null;
  propertyType?: string | null;
  buildingNo?: string | null;
  floorNo?: string | null;
  unitNo?: string | null;
  propertyStatus?: string | null;
  party1Name?: string | null;
  party1Phone?: string | null;
  party1Address?: string | null;
  party1Nationality?: string | null;
  party1Occupation?: string | null;
  party2Name?: string | null;
  party2Phone?: string | null;
  party2Address?: string | null;
  party2Nationality?: string | null;
  party2Occupation?: string | null;
  party2Origin?: string | null;
  documents?: string[];
  notes?: string | null;
  organizerName?: string | null;
  mukhtarName?: string | null;
  autoPrint?: boolean;
  assetBase?: string;
}

export function renderAnketHtml(locale: Locale, t: Dictionary, data: AnketPdfData): string {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const font = "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif";
  const base = (data.assetBase ?? '').replace(/\/$/, '');
  const logo = `${base}/brand/logo.png`;
  const logoMark = `${base}/brand/logo-mark.png`;
  const dateStr = data.issuedAt.toISOString().slice(0, 10);
  const kindLabel = data.kind === 'SALE' ? t.pages.anket.kindSale : t.pages.anket.kindRent;
  const dealBanner = data.kind === 'SALE' ? t.pages.anket.dealSale : t.pages.anket.dealRent;
  const party1Label = data.kind === 'SALE' ? t.pages.anket.party1Sale : t.pages.anket.party1Rent;
  const party2Label = data.kind === 'SALE' ? t.pages.anket.party2Sale : t.pages.anket.party2Rent;
  const typeMap: Record<string, string> = {
    HOUSE: t.pages.contractGen.typeHouse,
    APARTMENT: t.pages.contractGen.typeApartment,
    LAND: t.pages.contractGen.typeLand,
    SHOP: t.pages.contractGen.typeShop,
    BUILDING: t.pages.contractGen.typeBuilding,
  };
  const propertyTypeLabel = typeMap[data.propertyType ?? ''] ?? data.propertyType ?? '—';
  const propertyStatusLabel = (() => {
    const raw = (data.propertyStatus ?? '').trim();
    if (!raw || raw.toLowerCase() === 'empty') return t.pages.anket.statusEmpty;
    return raw;
  })();
  const v = (x?: string | null) => esc((x ?? '').trim() || '—');
  const line = (lab: string, val?: string | null) =>
    `<p class="line"><span class="lab">${esc(lab)}</span><span class="val">${v(val)}</span></p>`;
  const building = [
    data.buildingNo && `Building ${data.buildingNo}`,
    data.floorNo && `Floor ${data.floorNo}`,
    data.unitNo && `No. ${data.unitNo}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const docs =
    (data.documents ?? []).map((d) => `<span class="doc">${esc(d)}</span>`).join('') ||
    '<span class="doc">—</span>';
  const phones = ['0750 207 0008', '0750 490 0302'];

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title></title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    /* Zero margins hide browser URL / date / page-number headers & footers when printing */
    @page { size: A4 portrait; margin: 0; }
    body { font-family: ${font}; color: #0f2744; background: #e8eef5; direction: ${dir}; }
    .toolbar { max-width: 210mm; margin: 12px auto; display: flex; justify-content: flex-end; padding: 0 8px; }
    .toolbar button { font-family: inherit; border: 0; background: #0f2744; color: #fff; padding: 8px 16px; font-size: 13px; cursor: pointer; border-radius: 6px; }
    .page {
      position: relative;
      width: 210mm; min-height: 297mm; margin: 0 auto 16px; background: #fff;
      padding: 12mm 14mm; box-shadow: 0 8px 28px rgb(15 39 68 / 0.12);
    }
    .wm { position: absolute; inset: 22% 20%; display: flex; align-items: center; justify-content: center; opacity: 0.07; pointer-events: none; z-index: 0; }
    .wm img { width: 42%; max-width: 210px; height: auto; }
    .content { position: relative; z-index: 1; }
    .head { display: grid; grid-template-columns: 1.05fr 1.15fr; gap: 14px; align-items: start; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #0f2744; }
    .logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .logo { width: 72px; height: 72px; object-fit: contain; background: #fff; border: 1px solid #dbe3ef; border-radius: 10px; padding: 4px; }
    .brand-en { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 15px; font-weight: 700; color: #0f2744; }
    .kind-pill { display: none; }
    .deal-banner {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      margin: 12px 0 14px; padding: 10px 14px;
      background: #0f2744; color: #fff;
      border: 1px solid #0f2744;
    }
    .deal-banner .dl { font-size: 11px; opacity: 0.8; font-weight: 600; }
    .deal-banner .dv { font-size: 16px; font-weight: 700; letter-spacing: 0.02em; }
    .deal-banner.sale { background: #8b4513; border-color: #8b4513; }
    .meta-box { width: 100%; max-width: 220px; border-collapse: collapse; font-size: 11px; border: 1px solid #0f2744; }
    .meta-box th, .meta-box td { border: 1px solid #0f2744; padding: 5px 8px; text-align: start; }
    .meta-box th { background: #f3f6fa; font-weight: 600; width: 40%; white-space: nowrap; }
    .meta-box td { font-weight: 700; font-variant-numeric: tabular-nums; }
    .names-col { text-align: end; }
    .n-ku { font-size: 15px; font-weight: 700; color: #0f2744; }
    .n-ar { font-size: 12px; color: #334155; margin-top: 3px; }
    .n-en { font-size: 11px; color: #64748b; margin-top: 2px; }
    .phones { margin-top: 8px; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #0f2744; font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
    .phones .sep { color: #94a3b8; font-weight: 500; }
    .doc-title { margin-top: 10px; font-size: 16px; font-weight: 700; color: #8b4513; }
    .to { margin: 12px 0 8px; font-size: 14px; font-weight: 700; color: #0f2744; }
    .subject { margin-bottom: 14px; padding: 8px 0 10px; border-bottom: 1px solid #dbe3ef; font-size: 12.5px; line-height: 1.7; color: #1e293b; }
    .subject strong { color: #8b4513; margin-inline-end: 6px; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 22px; margin-bottom: 8px; }
    .block-title { font-size: 12px; font-weight: 700; color: #0f2744; margin: 4px 0 2px; padding-bottom: 4px; border-bottom: 1px solid #0f2744; }
    .line { display: flex; gap: 10px; align-items: baseline; padding: 7px 0 6px; border-bottom: 1px dotted #94a3b8; font-size: 12.5px; line-height: 1.5; }
    .lab { flex: 0 0 auto; color: #475569; font-weight: 600; white-space: nowrap; min-width: 5.5rem; }
    .val { flex: 1; font-weight: 700; color: #0f172a; min-width: 0; text-align: end; }
    .full { margin-top: 6px; }
    .docs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .doc { display: inline-block; font-size: 11.5px; font-weight: 600; color: #0f2744; border: 1px solid #c4a484; background: #fbf7f2; padding: 4px 10px; }
    .note { margin-top: 10px; font-size: 12px; color: #334155; }
    .signs { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px; margin-top: 36px; padding-top: 8px; }
    .sign { text-align: center; }
    .sign-space { height: 42px; }
    .sign-line { border-top: 1px solid #0f2744; padding-top: 8px; }
    .sign-role { font-size: 11px; color: #475569; font-weight: 600; margin-bottom: 4px; }
    .sign-name { font-size: 12px; font-weight: 700; color: #0f2744; min-height: 1.3em; }
    @media print {
      html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .toolbar { display: none !important; }
      .page {
        box-shadow: none !important;
        margin: 0 !important;
        width: 210mm !important;
        min-height: 297mm !important;
        padding: 12mm 14mm !important;
      }
    }
  </style>
  <script>
    function rhPrint() {
      document.title = ' ';
      window.print();
    }
  </script>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="rhPrint()">${t.common.print}</button></div>
  <div class="page">
    <div class="wm" aria-hidden="true"><img src="${logoMark}" alt="" /></div>
    <div class="content">
      <header class="head">
        <div>
          <div class="logo-row">
            <img class="logo" src="${logo}" alt="Road Home" />
            <div>
              <div class="brand-en">${BRAND_NAME}</div>
            </div>
          </div>
          <table class="meta-box">
            <tr><th>${esc(t.pages.anket.number)}</th><td>${esc(data.anketNo)}</td></tr>
            <tr><th>${esc(t.pages.anket.date)}</th><td>${dateStr}</td></tr>
            <tr><th>${esc(t.pages.anket.dealType)}</th><td>${esc(kindLabel)}</td></tr>
          </table>
        </div>
        <div class="names-col">
          <p class="n-ku">${BRAND_NAME}</p>
          <p class="n-ar">${BRAND_NAME_AR}</p>
          <p class="n-en">${BRAND_NAME_EN}</p>
          <div class="phones"><span>${phones[0]}</span><span class="sep">·</span><span>${phones[1]}</span></div>
          <h1 class="doc-title">${esc(t.pages.anket.title)}</h1>
        </div>
      </header>

      <div class="deal-banner${data.kind === 'SALE' ? ' sale' : ''}">
        <span class="dl">${esc(t.pages.anket.dealType)}</span>
        <span class="dv">${esc(dealBanner)}</span>
      </div>

      <p class="to">${esc(t.pages.anket.toSecurity)}${data.securityStationName?.trim() ? ' / ' + v(data.securityStationName) : ''}</p>
      <div class="subject"><strong>${esc(t.pages.anket.subject)}:</strong> ${esc(t.pages.anket.subjectBody)}</div>

      <div class="cols">
        <div>
          <div class="block-title">${esc(party1Label)}</div>
          ${line(t.table.name, data.party1Name)}
          ${line(t.table.phone, data.party1Phone)}
          ${line(t.pages.anket.nationality, data.party1Nationality)}
          ${line(t.pages.anket.address, data.party1Address)}
          ${line(t.pages.anket.occupation, data.party1Occupation)}
        </div>
        <div>
          <div class="block-title">${esc(party2Label)}</div>
          ${line(t.table.name, data.party2Name)}
          ${line(t.table.phone, data.party2Phone)}
          ${line(t.pages.anket.nationality, data.party2Nationality)}
          ${line(t.pages.anket.address, data.party2Address)}
          ${line(t.pages.anket.occupation, data.party2Occupation)}
          ${line(t.pages.anket.origin, data.party2Origin)}
        </div>
        <div>
          <div class="block-title">${esc(t.pages.anket.propertyInfo)}</div>
          ${line(t.pages.anket.project, data.projectName || data.propertyName)}
          ${line(t.pages.anket.propertyName, data.propertyName)}
          ${line(t.pages.contractGen.propertyType, propertyTypeLabel)}
          ${line(t.pages.anket.building, building || null)}
          ${line(t.pages.anket.propertyNo, data.propertyNo)}
          ${line(t.pages.anket.propertyStatus, propertyStatusLabel)}
        </div>
        <div>
          <div class="block-title">${esc(t.pages.anket.organizer)} / ${esc(t.pages.anket.mukhtar)}</div>
          ${line(t.pages.anket.organizer, data.organizerName)}
          ${line(t.pages.anket.mukhtar, data.mukhtarName)}
          <div class="full">
            <div class="block-title" style="margin-top:14px">${esc(t.pages.anket.docsRequired)}</div>
            <div class="docs">${docs}</div>
            ${data.notes ? `<p class="note"><strong>${esc(t.form.notes)}:</strong> ${esc(data.notes)}</p>` : ''}
          </div>
        </div>
      </div>

      <footer class="signs">
        <div class="sign">
          <div class="sign-space"></div>
          <div class="sign-line">
            <div class="sign-role">${esc(t.pages.anket.organizer)}</div>
            <div class="sign-name">${v(data.organizerName)}</div>
          </div>
        </div>
        <div class="sign">
          <div class="sign-space"></div>
          <div class="sign-line">
            <div class="sign-role">${esc(t.pages.anket.mukhtar)}</div>
            <div class="sign-name">${v(data.mukhtarName)}</div>
          </div>
        </div>
      </footer>
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

export interface LeasePdfData {
  leaseNo: string;
  propertyCode: string;
  propertyName?: string | null;
  propertyType?: string | null;
  areaSqm?: number | null;
  landlordName?: string | null;
  landlordPhone?: string | null;
  tenantName: string;
  tenantPhone?: string | null;
  witness1Name?: string | null;
  witness1Phone?: string | null;
  witness2Name?: string | null;
  witness2Phone?: string | null;
  guarantorName?: string | null;
  guarantorPhone?: string | null;
  startDate: Date;
  endDate: Date;
  signingDate?: Date | null;
  durationMonths?: number | null;
  currency: 'IQD' | 'USD';
  exchangeRate: number;
  monthlyRentIqd: number;
  advancePaymentIqd: number;
  securityDepositIqd: number;
  dailyPenaltyIqd: number;
  cancelFeeIqd: number;
  commissionTenantIqd: number;
  commissionLandlordIqd: number;
  organizerName?: string | null;
  showOrganizer?: boolean;
  clauses: string[];
  autoPrint?: boolean;
  assetBase?: string;
}

export function renderLeaseHtml(locale: Locale, t: Dictionary, data: LeasePdfData): string {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const font = "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif";
  const base = (data.assetBase ?? '').replace(/\/$/, '');
  const logoFull = `${base}/brand/logo.png`;
  const logoMark = `${base}/brand/logo-mark.png`;
  const r = t.pages.rentals as Record<string, string>;
  const title = r.contractTitle ?? 'گرێبەستی کرێ';
  const phones = ['0750 207 0008', '0750 490 0302'];
  const witness1Label = r.witness1 ?? 'شایەدی یەکەم';
  const witness2Label = r.witness2 ?? 'شایەدی دووەم';

  const display = (s?: string | null, fallback = '—') => {
    const t0 = s?.trim();
    return esc(t0 && t0.length ? t0 : fallback);
  };
  const phoneLine = (s?: string | null) => {
    const t0 = s?.trim();
    return t0 && t0.length ? esc(t0) : '—';
  };
  const landlord = display(data.landlordName);
  const tenant = display(data.tenantName);
  const w1 = display(data.witness1Name);
  const w2 = display(data.witness2Name);
  const landlordPhone = phoneLine(data.landlordPhone);
  const tenantPhone = phoneLine(data.tenantPhone);
  const w1Phone = phoneLine(data.witness1Phone);
  const w2Phone = phoneLine(data.witness2Phone);
  const phoneLabel = r.phone ?? 'ژمارە';
  const page1Label = r.pdfPage1 ?? 'پەڕەی ١ / ٢';
  const page2Label = r.pdfPage2 ?? 'پەڕەی ٢ / ٢';
  const clauseStrip = rentalClausePrefix(locale);

  const clauseItems = data.clauses.map((c, i) => ({
    n: i + 1,
    text: esc(c.replace(clauseStrip, '')),
  }));
  // Room for parties + signatures on both pages
  const splitAt = Math.min(9, Math.max(1, clauseItems.length - 6));
  const page1Clauses = clauseItems.slice(0, splitAt);
  const page2Clauses = clauseItems.slice(splitAt);

  const partyCard = (role: string, name: string, phone: string) => `
    <div class="party-card">
      <div class="party-role">${role}</div>
      <div class="party-name">${name}</div>
      <div class="party-phone"><span>${esc(phoneLabel)}</span> <b dir="ltr">${phone}</b></div>
    </div>`;

  const partiesBlock = `
    <section class="parties">
      ${partyCard(esc(r.landlord ?? 'خاوەن موڵک'), landlord, landlordPhone)}
      ${partyCard(esc(r.tenant ?? 'کرێچی'), tenant, tenantPhone)}
      ${partyCard(esc(witness1Label), w1, w1Phone)}
      ${partyCard(esc(witness2Label), w2, w2Phone)}
    </section>`;

  const sigsBlock = `
    <div class="sigs">
      <div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(r.landlord ?? 'خاوەن موڵک')}</div>
        <div class="sig-name">${landlord}</div>
      </div>
      <div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(r.tenant ?? 'کرێچی')}</div>
        <div class="sig-name">${tenant}</div>
      </div>
      <div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(witness1Label)}</div>
        <div class="sig-name">${w1}</div>
      </div>
      <div class="sig">
        <div class="sig-space"></div>
        <div class="sig-role">${esc(witness2Label)}</div>
        <div class="sig-name">${w2}</div>
      </div>
    </div>`;

  const letterhead = (pageLabel: string) => `
    <header class="head">
      <div>
        <div class="logo-row">
          <img class="logo" src="${esc(logoFull)}" alt="Road Home" onerror="this.src='${esc(logoMark)}'" />
          <div>
            <div class="brand-mark">${esc(BRAND_NAME)}</div>
            <div class="page-tag">${esc(pageLabel)}</div>
          </div>
        </div>
        <table class="meta-box">
          <tr><th>${esc(r.leaseNo ?? 'ژمارە')}</th><td>${esc(data.leaseNo)}</td></tr>
          <tr><th>${esc(r.signingDate ?? 'ڕێکەوت')}</th><td>${isoDate(data.signingDate ?? data.startDate)}</td></tr>
        </table>
      </div>
      <div class="names">
        <p class="n-ku">${esc(BRAND_NAME)}</p>
        <p class="n-ar">${esc(BRAND_NAME_AR)}</p>
        <p class="n-en">${esc(BRAND_NAME_EN)}</p>
        <div class="phones">
          <span>${phones[0]}</span><span class="sep">·</span><span>${phones[1]}</span>
        </div>
        <h1 class="doc-title">${esc(title)}</h1>
      </div>
    </header>
    ${partiesBlock}`;

  const renderClauses = (items: { n: number; text: string }[]) =>
    items.map((c) => `<p class="clause"><strong>${c.n}.</strong> ${c.text}</p>`).join('');

  const intro1 =
    (r.pdfIntro ??
      'ئەم گرێبەستە لە نێوان لایەنی یەکەم ({landlord} — {landlordRole}) و لایەنی دووەم ({tenant} — {tenantRole}) ڕێککەوتووە، بە شایەدی ({w1}) و ({w2}). بەندەکانی خوارەوە بەشێکن لەم گرێبەستە و هەردوو لا پابەندن پێیانەوە.')
      .replaceAll('{landlord}', landlord)
      .replaceAll('{tenant}', tenant)
      .replaceAll('{w1}', w1)
      .replaceAll('{w2}', w2)
      .replaceAll('{landlordRole}', esc(r.landlord ?? 'خاوەن موڵک'))
      .replaceAll('{tenantRole}', esc(r.tenant ?? 'کرێچی'));

  const intro2 =
    (r.pdfIntroContinued ??
      'بەردەوامی گرێبەستی کرێ ژمارە {leaseNo} لە نێوان {landlord} و {tenant}، بە شایەدی {w1} و {w2}.')
      .replaceAll('{leaseNo}', esc(data.leaseNo))
      .replaceAll('{landlord}', landlord)
      .replaceAll('{tenant}', tenant)
      .replaceAll('{w1}', w1)
      .replaceAll('{w2}', w2);

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title> </title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 0; }
    body { font-family: ${font}; color: #0f2744; background: #e8eef5; direction: ${dir}; }
    .toolbar { max-width: 210mm; margin: 12px auto; display: flex; justify-content: flex-end; padding: 0 8px; }
    .toolbar button { font-family: inherit; border: 0; background: #0f2744; color: #fff; padding: 8px 16px; font-size: 13px; cursor: pointer; border-radius: 6px; }
    .sheet {
      width: 210mm; min-height: 297mm; margin: 0 auto 16px; background: #fff;
      padding: 9mm 11mm 10mm; position: relative; overflow: hidden;
      box-shadow: 0 8px 28px rgb(15 39 68 / 0.12);
      display: flex; flex-direction: column;
    }
    .wm {
      position: absolute; inset: 24% 16% 20%; display: flex; align-items: center; justify-content: center;
      opacity: 0.05; pointer-events: none; z-index: 0;
    }
    .wm img { width: 40%; max-width: 190px; height: auto; }
    .content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; }
    .head {
      display: grid; grid-template-columns: 1.05fr 1.15fr; gap: 12px; align-items: start;
      padding-bottom: 8px; margin-bottom: 8px; border-bottom: 2.5px solid #0f2744;
    }
    .logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .logo {
      width: 64px; height: 64px; object-fit: contain; background: #fff;
      border: 1px solid #dbe3ef; border-radius: 10px; padding: 3px;
    }
    .brand-mark { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 14px; font-weight: 700; color: #0f2744; }
    .page-tag { margin-top: 2px; font-size: 10px; font-weight: 600; color: #8b4513; }
    .meta-box { width: 100%; max-width: 210px; border-collapse: collapse; font-size: 10.5px; border: 1px solid #0f2744; }
    .meta-box th, .meta-box td { border: 1px solid #0f2744; padding: 4px 7px; text-align: start; }
    .meta-box th { background: #f3f6fa; font-weight: 600; width: 44%; white-space: nowrap; }
    .meta-box td { font-weight: 700; font-variant-numeric: tabular-nums; }
    .names { text-align: end; }
    .n-ku { font-size: 15px; font-weight: 700; color: #0f2744; }
    .n-ar { font-size: 11px; color: #334155; margin-top: 2px; }
    .n-en { font-size: 10px; color: #64748b; margin-top: 2px; }
    .phones {
      margin-top: 6px; display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; color: #0f2744; font-variant-numeric: tabular-nums;
      direction: ltr; unicode-bidi: isolate;
    }
    .phones .sep { color: #94a3b8; font-weight: 500; }
    .doc-title { margin-top: 8px; font-size: 15px; font-weight: 700; color: #8b4513; }
    .parties {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
      margin: 0 0 10px; padding-bottom: 8px; border-bottom: 1px dotted #94a3b8;
    }
    .party-card {
      border: 1px solid #cfd8e6; border-radius: 8px; padding: 7px 8px; background: #f8fafc;
      min-height: 64px;
    }
    .party-role { font-size: 9.5px; font-weight: 700; color: #8b4513; margin-bottom: 3px; }
    .party-name { font-size: 11.5px; font-weight: 700; color: #0f2744; line-height: 1.35; word-break: break-word; }
    .party-phone {
      margin-top: 4px; font-size: 10px; color: #475569; font-variant-numeric: tabular-nums;
    }
    .party-phone span { color: #64748b; }
    .party-phone b { font-weight: 700; color: #0f2744; unicode-bidi: isolate; }
    .intro {
      text-align: justify; font-size: 12px; line-height: 1.7; color: #334155; margin: 0 0 10px;
    }
    .clauses { flex: 1; }
    .clause {
      font-size: 11.5px; line-height: 1.78; margin-bottom: 6px; text-align: justify; color: #1e293b;
    }
    .sigs {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: auto;
      padding-top: 14px;
    }
    .sig { text-align: center; }
    .sig-space { height: 40px; }
    .sig-role { border-top: 1px solid #0f2744; padding-top: 5px; font-size: 10px; color: #475569; }
    .sig-name { margin-top: 3px; font-size: 11px; font-weight: 700; color: #0f2744; word-break: break-word; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet {
        width: auto; min-height: 100vh; height: 100vh; margin: 0; padding: 9mm 11mm;
        box-shadow: none; page-break-after: always; break-after: page;
      }
      .sheet:last-of-type { page-break-after: auto; break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="document.title=' ';window.print()">${t.common.print}</button></div>

  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /></div>
    <div class="content">
      ${letterhead(page1Label)}
      <p class="intro">${intro1}</p>
      <div class="clauses">${renderClauses(page1Clauses)}</div>
      ${sigsBlock}
    </div>
  </div>

  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /></div>
    <div class="content">
      ${letterhead(page2Label)}
      <p class="intro">${intro2}</p>
      <div class="clauses">${renderClauses(page2Clauses)}</div>
      ${sigsBlock}
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

export interface SupportPdfData {
  supportNo: string;
  recipientKind?: string | null;
  purpose?: string | null;
  applicant: string;
  beneficiaryName?: string | null;
  beneficiaryIdNo?: string | null;
  beneficiaryPhone?: string | null;
  fromName?: string | null;
  toName: string;
  recipientAddress?: string | null;
  subject: string;
  content: string;
  propertyRef?: string | null;
  managerName: string;
  managerTitle?: string | null;
  branch?: string | null;
  issuedAt: Date;
  autoPrint?: boolean;
  assetBase?: string;
}

/** Official support letter — government-style formal letterhead (A4). */
export function renderSupportHtml(locale: Locale, t: Dictionary, data: SupportPdfData): string {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const font = "'Noto Naskh Arabic', 'Noto Kufi Arabic', 'Traditional Arabic', Tahoma, serif";
  const base = (data.assetBase ?? '').replace(/\/$/, '');
  const logoFull = `${base}/brand/logo.png`;
  const logoMark = `${base}/brand/logo-mark.png`;
  const s = t.pages.support as Record<string, string>;
  const dateStr = isoDate(data.issuedAt);
  const branch = data.branch?.trim() || 'بارەگای سەرەکی';

  const withRespect =
    locale === 'en'
      ? 'With respect…'
      : locale === 'ar'
        ? 'مع فائق الاحترام…'
        : (s.withRespect ?? 'لەگەڵ ڕێزدا…');

  const copyToLabel =
    locale === 'en'
      ? 'Copy to:'
      : locale === 'ar'
        ? 'نسخة إلى:'
        : (s.copyTo ?? 'وێنەیەک بۆ:');

  // Formal letterhead: Arabic (left) | emblem | Kurdish (right) — like gov letters
  const headKu = ['کۆمپانیای ڕۆد هۆم', 'عەقارات و بیناسازی', branch];
  const headAr = ['شركة رود هوم', 'للعقارات والمقاولات', branch];

  const bodyHtml = esc(data.content || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replaceAll('\n', '<br/>')}</p>`)
    .join('');

  const copies =
    locale === 'en'
      ? ['Archive', 'Company records']
      : locale === 'ar'
        ? ['الأرشيف', 'سجل الشركة']
        : ['ئەرشیف', 'تۆماری کۆمپانیا'];

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title> </title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&family=Noto+Kufi+Arabic:wght@600;700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 0; }
    body {
      font-family: ${font};
      color: #111;
      background: #e8eef4;
      direction: ${dir};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 13.5px;
      line-height: 1.85;
    }
    .toolbar {
      max-width: 210mm; margin: 10px auto 0; display: flex; justify-content: flex-end; padding: 0 4px;
    }
    .toolbar button {
      font-family: inherit; border: 0; background: #111; color: #fff;
      padding: 7px 16px; font-size: 12px; cursor: pointer; border-radius: 3px;
    }
    .sheet {
      width: 210mm; min-height: 297mm; margin: 8px auto 16px; background: #fff;
      padding: 16mm 18mm 14mm; position: relative;
      box-shadow: 0 8px 28px rgb(15 39 68 / 0.12);
      display: flex; flex-direction: column;
    }
    .wm {
      position: absolute; inset: 38% 22% 30%; display: flex; align-items: center; justify-content: center;
      opacity: 0.04; pointer-events: none; z-index: 0;
    }
    .wm img { width: 42%; max-width: 190px; height: auto; }
    .page {
      position: relative; z-index: 1; flex: 1;
      min-height: calc(297mm - 30mm);
      display: flex; flex-direction: column;
    }

    /* Formal letterhead — fixed physical order: AR | logo | KU */
    .head {
      display: grid;
      grid-template-columns: 1fr 88px 1fr;
      gap: 14px;
      align-items: center;
      direction: ltr;
      margin-bottom: 0;
      padding-bottom: 10px;
    }
    .head-side {
      color: #0f2744;
      direction: rtl;
      unicode-bidi: isolate;
      line-height: 1.55;
    }
    .head-side.ar { text-align: left; font-family: 'Noto Naskh Arabic', serif; }
    .head-side.ku {
      text-align: right;
      font-family: 'Noto Kufi Arabic', 'Noto Naskh Arabic', sans-serif;
    }
    .head-side .line { display: block; unicode-bidi: isolate; }
    .head-side .org {
      font-size: 13.5px; font-weight: 700; letter-spacing: 0;
    }
    .head-side .dept {
      font-size: 11.5px; font-weight: 600; margin-top: 2px; color: #1a3358;
    }
    .head-side .place {
      font-size: 10.5px; font-weight: 600; margin-top: 3px; color: #475569;
    }
    .emblem-wrap {
      display: flex; align-items: center; justify-content: center;
      direction: ltr;
    }
    .emblem {
      width: 72px; height: 72px; object-fit: contain; display: block;
      background: #fff;
    }
    .rules {
      margin: 0 0 12px;
      border: 0;
      border-top: 2.5px solid #0f2744;
      border-bottom: 0.6px solid #0f2744;
      height: 5px;
      background: transparent;
    }
    .rule-thick {
      border: 0; border-top: 2.4px solid #0f2744; margin: 14px 0 0; padding-top: 0;
    }

    .meta {
      display: flex; justify-content: space-between; gap: 16px; align-items: flex-start;
      font-size: 12.5px; font-weight: 700; margin-bottom: 20px; color: #0f2744;
    }
    .meta .pair { white-space: nowrap; unicode-bidi: isolate; }
    .meta .lbl { font-weight: 700; }
    .meta .val {
      display: inline-block; min-width: 7rem; border-bottom: 1px solid #0f2744;
      padding: 0 6px 1px; margin-inline-start: 4px;
      font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate;
      font-weight: 700;
    }

    .to-block, .subject-block {
      text-align: center; margin: 0 0 8px; font-weight: 700; font-size: 14px;
      unicode-bidi: isolate; color: #0f2744;
    }
    .to-block .k, .subject-block .k { margin-inline-end: 4px; }
    .to-block .v, .subject-block .v { font-weight: 700; }

    .body {
      margin-top: 14px; text-align: justify; font-size: 13.5px; line-height: 2.05;
      color: #111; unicode-bidi: isolate;
    }
    .body p { margin: 0 0 0.9em; text-indent: 1.2em; }
    .body p:first-child { text-indent: 0; }
    .body p:last-child { margin-bottom: 0; }

    .closing {
      margin: 10px 0 0;
      text-align: center;
      font-weight: 700;
      font-size: 13.5px;
      unicode-bidi: isolate;
      color: #0f2744;
    }

    .foot {
      margin-top: auto;
      padding-top: 20px;
      flex-shrink: 0;
    }

    .bottom {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: end;
      direction: ltr;
    }
    .copies {
      font-size: 12px; line-height: 1.7; unicode-bidi: isolate;
      text-align: right; direction: rtl; justify-self: end;
    }
    .copies .title { font-weight: 700; margin-bottom: 4px; }
    .copies ul { list-style: disc; padding-inline-start: 1.2em; margin: 0; }
    .copies li { margin: 1px 0; }

    .sign-block {
      text-align: center;
      unicode-bidi: isolate;
      justify-self: start;
    }
    .sign-block .space { height: 40px; }
    .sign-block .name {
      font-weight: 700; font-size: 14px; border-top: 1px solid #0f2744;
      display: inline-block; min-width: 11rem; padding-top: 6px; margin-top: 4px;
      color: #0f2744;
    }
    .sign-block .role { font-size: 12px; font-weight: 700; margin-top: 2px; color: #0f2744; }

    @media print {
      html, body {
        width: 210mm; height: 297mm; margin: 0; padding: 0; background: #fff;
        overflow: hidden;
      }
      .toolbar { display: none !important; }
      .sheet {
        width: 210mm; height: 297mm; min-height: 297mm; max-height: 297mm;
        margin: 0; padding: 14mm 16mm 12mm; box-shadow: none;
        overflow: hidden; page-break-after: avoid; break-after: avoid;
      }
      .page {
        min-height: 0; height: 100%;
        page-break-inside: avoid; break-inside: avoid;
      }
      .foot { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
  <script>
    function rhSupportPrint() {
      document.title = '\\u00a0';
      var prev = location.href;
      try { history.replaceState(null, '', '/'); } catch (e) {}
      function restore() {
        window.removeEventListener('afterprint', restore);
        try { history.replaceState(null, '', prev); } catch (e) {}
      }
      window.addEventListener('afterprint', restore);
      window.print();
      setTimeout(restore, 2000);
    }
  </script>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="rhSupportPrint()">${t.common.print}</button></div>
  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /></div>
    <div class="page">
      <header class="head">
        <div class="head-side ar" dir="rtl" lang="ar">
          <span class="line org">${esc(headAr[0])}</span>
          <span class="line dept">${esc(headAr[1])}</span>
          <span class="line place">${esc(headAr[2])}</span>
        </div>
        <div class="emblem-wrap">
          <img class="emblem" src="${esc(logoMark)}" alt="" onerror="this.src='${esc(logoFull)}'" />
        </div>
        <div class="head-side ku" dir="rtl" lang="ckb">
          <span class="line org">${esc(headKu[0])}</span>
          <span class="line dept">${esc(headKu[1])}</span>
          <span class="line place">${esc(headKu[2])}</span>
        </div>
      </header>

      <div class="rules" aria-hidden="true"></div>

      <div class="meta">
        <div class="pair">
          <span class="lbl">${esc(s.number ?? 'ژمارە')}:</span>
          <span class="val" dir="ltr">${esc(data.supportNo)}</span>
        </div>
        <div class="pair">
          <span class="lbl">${esc(s.date ?? 'ڕێکەوت')}:</span>
          <span class="val" dir="ltr">${esc(dateStr)}</span>
        </div>
      </div>

      <p class="to-block">
        <span class="k">${esc(s.to ?? 'بۆ')}/</span>
        <span class="v">${esc(data.toName)}</span>
      </p>
      <p class="subject-block">
        <span class="k">${esc(s.subject ?? 'بابەت')}/</span>
        <span class="v">${esc(data.subject)}</span>
      </p>

      <div class="body">${bodyHtml || `<p>${esc(s.emptyBody ?? '—')}</p>`}</div>

      <p class="closing">${esc(withRespect)}</p>

      <footer class="foot">
        <div class="bottom">
          <div class="sign-block">
            <div class="space" aria-hidden="true"></div>
            <div class="name">${esc(data.managerName)}</div>
            <div class="role">${esc(s.manager ?? 'بەڕێوەبەری کارگێڕی')}</div>
          </div>
          <div class="copies">
            <div class="title">${esc(copyToLabel)}</div>
            <ul>
              ${copies.map((c) => `<li>${esc(c)}</li>`).join('')}
            </ul>
          </div>
        </div>
        <hr class="rule-thick" />
      </footer>
    </div>
  </div>
  ${
    data.autoPrint
      ? `<script>window.addEventListener("load",function(){setTimeout(function(){if(typeof rhSupportPrint==="function")rhSupportPrint()},300)});</script>`
      : ''
  }
</body>
</html>`;
}
