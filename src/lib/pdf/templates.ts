import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/locale-config';
import { isRTL } from '@/i18n/locale-config';
import {
  BRAND_COMPANY_KU,
  BRAND_EMAIL,
  BRAND_NAME,
  BRAND_NAME_AR,
  BRAND_NAME_EN,
  BRAND_NAME_KU,
  BRAND_SLOGAN_EN,
  BRAND_SLOGAN_KU,
} from '@/lib/brand';
import { companyAddressLine, companyContact } from '@/lib/company-contact';
import { rentalClausePrefix } from '@/lib/contracts/rental-clauses';
import { saleClausePrefix } from '@/lib/contracts/sale-clauses';
import { brandLogoPair } from '@/lib/pdf/assets';
import { formatCurrency, formatDate } from '@/lib/utils';

/** Wait for logos + webfonts then print — Kurdish/Arabic glyphs need fonts.ready. */
function printBootScript(autoPrint: boolean | undefined): string {
  return `<script>
(function(){
  function whenFonts(cb){
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ setTimeout(cb, 80); }).catch(function(){ setTimeout(cb, 320); });
    } else {
      setTimeout(cb, 450);
    }
  }
  function ready(cb){
    var imgs=[].slice.call(document.images||[]);
    var left=imgs.length;
    var next=function(){ whenFonts(cb); };
    if(!left){ next(); return; }
    imgs.forEach(function(img){
      if(img.complete){ if(--left===0) next(); return; }
      img.addEventListener('load', function(){ if(--left===0) next(); });
      img.addEventListener('error', function(){ if(--left===0) next(); });
    });
  }
  window.rhPrint=function(){ document.title=' '; window.print(); };
  function tickStamp(){
    var stamps=document.querySelectorAll('.gh-contact .stamp');
    if(!stamps.length) return;
    var time=new Date().toLocaleTimeString('en-US',{timeZone:'Asia/Baghdad',hour:'numeric',minute:'2-digit',hour12:true});
    stamps.forEach(function(el){
      var parts=(el.textContent||'').trim().split(/\\s+/);
      var date=parts[parts.length-1]||'';
      if(/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) el.textContent=time+' '+date;
    });
  }
  tickStamp();
  setInterval(tickStamp,1000);
  ${
    autoPrint
      ? `window.addEventListener('load', function(){ ready(function(){ window.rhPrint(); }); });`
      : ''
  }
})();
</script>`;
}

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function phonesInlineHtml(phones: string[]): string {
  const list = phones.filter((p) => p.trim());
  if (!list.length) return '';
  return list.map((p) => `<span>${esc(p)}</span>`).join('<span class="sep">·</span>');
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

/** Erbil / Iraq local zone (UTC+3, no DST). */
const ERBIL_TZ = 'Asia/Baghdad';

function erbilDateParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ERBIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: Number(get('hour') || '0'),
    minute: Number(get('minute') || '0'),
  };
}

function isoDateErbil(d: Date) {
  const p = erbilDateParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Date from signing + live Asia/Baghdad clock (never freeze noon-UTC as 3:00 PM). */
function formatSigningStamp(d: Date) {
  try {
    const p = erbilDateParts(d);
    const dateStr = `${p.year}-${p.month}-${p.day}`;
    const timeStr = new Date().toLocaleTimeString('en-US', {
      timeZone: ERBIL_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${timeStr} ${dateStr}`;
  } catch {
    return isoDate(d);
  }
}

/** Shared GREBASTI-style letterhead CSS (sale + rent). */
function grebastiStyles(dir: string, font: string): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 0; }
    body { font-family: ${font}; color: #0b1f3a; background: #e8eef5; direction: ${dir}; }
    .toolbar { max-width: 210mm; margin: 12px auto; display: flex; justify-content: flex-end; padding: 0 8px; }
    .toolbar button { font-family: inherit; border: 0; background: #0b2a55; color: #fff; padding: 8px 16px; font-size: 13px; cursor: pointer; border-radius: 6px; }
    .sheet {
      width: 210mm; min-height: 297mm; height: 297mm; margin: 0 auto 16px; background: #fff;
      padding: 8mm 12mm 9mm; position: relative; overflow: hidden;
      box-shadow: 0 8px 28px rgb(15 39 68 / 0.12);
      display: flex; flex-direction: column;
      border: 1px solid #c5cdd8;
    }
    .wm {
      position: absolute; inset: 28% 18% 22%; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 6px;
      opacity: 0.06; pointer-events: none; z-index: 0;
    }
    .wm img { width: 48%; max-width: 220px; height: auto; }
    .wm-name { font-size: 22px; font-weight: 800; letter-spacing: 0.08em; color: #64748b; }
    .sheet.page2 .wm {
      inset: 42% 14% 18%; opacity: 0.07;
    }
    .content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .gh {
      display: grid; grid-template-columns: 70px 1fr auto; gap: 12px 14px;
      align-items: center; margin-bottom: 8px;
    }
    .gh-logo {
      width: 68px; height: 68px; object-fit: contain; display: block;
    }
    .gh-brand { line-height: 1.3; min-width: 0; }
    .gh-company { font-size: 16px; font-weight: 800; color: #0b2a55; }
    .gh-slogan {
      margin-top: 3px; font-size: 12.5px; font-weight: 700; color: #c48912;
      letter-spacing: 0.01em;
    }
    .gh-contact {
      text-align: end; font-size: 11.5px; font-weight: 700; color: #0b2a55;
      line-height: 1.55; white-space: nowrap;
    }
    .gh-contact .phones {
      direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums;
      font-size: 12px;
    }
    .gh-contact .addr { color: #475569; font-weight: 600; }
    .gh-contact .stamp {
      margin-top: 4px; font-size: 12px; font-weight: 800; color: #0b2a55;
      direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums;
    }
    .gh-rules {
      border: 0; border-top: 2.5px solid #0b2a55;
      height: 0; margin: 2px 0 10px;
    }
    .gh-title {
      display: block; text-align: center; background: #0b2a55; color: #fff;
      font-size: 16px; font-weight: 800; padding: 8px 14px; border-radius: 3px;
      margin: 0 0 12px; letter-spacing: 0.01em;
    }
    .ext-stamp {
      display: inline-block; margin: -4px auto 10px; padding: 3px 12px;
      border: 2px solid #b45309; color: #92400e; background: #fff7ed;
      font-size: 12px; font-weight: 800; border-radius: 6px;
    }
    .ext-banner {
      position: absolute; top: 48%; left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 46px; font-weight: 900; color: rgba(180, 83, 9, 0.1);
      white-space: nowrap; pointer-events: none; z-index: 0; letter-spacing: 0.04em;
    }
    .meta-row {
      display: grid; grid-template-columns: 0.95fr 1.15fr; gap: 14px;
      margin-bottom: 12px; align-items: start;
    }
    .meta-box {
      background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px;
      padding: 9px 11px; font-size: 12.5px;
    }
    .meta-box .mrow {
      display: flex; justify-content: space-between; gap: 8px; align-items: baseline;
      padding: 4px 0; border-bottom: 1px dotted #cbd5e1;
    }
    .meta-box .mrow:last-child { border-bottom: 0; }
    .meta-box .mlab { color: #334155; font-weight: 600; white-space: nowrap; }
    .meta-box .mval { font-weight: 800; color: #0b1f3a; font-variant-numeric: tabular-nums; text-align: end; }
    .party-fields { font-size: 13px; line-height: 1.6; }
    .party-fields .frow {
      display: flex; gap: 6px; align-items: baseline; padding: 3px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .party-fields .flab { color: #0b2a55; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
    .party-fields .fval { font-weight: 700; color: #0f172a; min-width: 0; word-break: break-word; }
    .party-fields .fval[dir="ltr"] { unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
    .intro {
      text-align: justify; font-size: 13.5px; line-height: 1.75; color: #0f172a;
      font-weight: 700; margin: 0 0 10px;
    }
    .clauses { flex: 0 1 auto; min-height: 0; }
    .sheet.page2 .clauses { margin-bottom: 8px; }
    .clause {
      font-size: 13px; line-height: 1.82; margin-bottom: 7px;
      text-align: justify; color: #1e293b;
    }
    .clause strong { color: #0b1f3a; font-weight: 800; }
    .notes {
      margin-top: 18px; margin-bottom: 28px; font-size: 13.5px; font-weight: 700; color: #0b1f3a;
      border-bottom: 1.5px solid #334155; padding-bottom: 16px; min-height: 28px;
    }
    .sigs-block {
      margin-top: auto; padding-top: 6px; flex: 0 0 auto;
    }
    .sheet:not(.page2) .sigs-block { margin-top: 0; }
    .sigs-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 28px 40px;
      margin: 8px 0 10px;
    }
    .sig-cell { min-height: 56px; }
    .sig-cell .sig-row {
      display: flex; align-items: flex-end; gap: 8px; width: 100%;
    }
    .sig-cell .role {
      flex: 0 0 auto; font-size: 13px; font-weight: 800; color: #0b1f3a;
      white-space: nowrap; padding-bottom: 2px;
    }
    .sig-cell .sig-line {
      flex: 1 1 auto; min-width: 48px; height: 0;
      border-bottom: 1.5px solid #1e293b; margin-bottom: 3px;
    }
    .sig-cell .sig-dash {
      display: block; text-align: center; margin-top: 6px;
      font-size: 14px; font-weight: 700; color: #334155; line-height: 1;
    }
    .org-block {
      text-align: center; margin-top: 28px; font-size: 13.5px;
    }
    .org-block .org-lab { font-weight: 800; color: #0b1f3a; margin-bottom: 14px; }
    .org-block .org-line {
      display: inline-block; width: min(52%, 240px); border-bottom: 1.5px solid #1e293b;
      padding-bottom: 4px; font-weight: 800; color: #0b1f3a; font-size: 13.5px;
    }
    .gh-foot {
      margin-top: auto; padding-top: 8px; border-top: 1.5px solid #0b1f3a;
      display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;
      font-size: 12px; color: #0b1f3a; font-weight: 700;
      flex: 0 0 auto;
    }
    .sheet.page2 .gh-foot { margin-top: 14px; }
    .gh-foot .foot-end { text-align: end; line-height: 1.55; }
    .gh-foot .phones { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet {
        width: 210mm; min-height: 297mm; height: 297mm; margin: 0; padding: 8mm 12mm 9mm;
        box-shadow: none; page-break-after: always; break-after: page;
        border-color: #94a3b8;
      }
      .sheet:last-of-type { page-break-after: auto; break-after: auto; }
    }
  `;
}

function grebastiHeader(opts: {
  logo: string;
  mark: string;
  title: string;
  stamp?: string;
  isExternal?: boolean;
  externalLabel?: string;
}): string {
  const ext =
    opts.isExternal && opts.externalLabel
      ? `<div style="text-align:center"><span class="ext-stamp">${esc(opts.externalLabel)}</span></div>`
      : '';
  const phones = companyContact().phones.join(' · ');
  const stamp = opts.stamp?.trim()
    ? `<div class="stamp">${esc(opts.stamp)}</div>`
    : '';
  return `
    <header class="gh">
      <img class="gh-logo" src="${esc(opts.logo)}" alt="" onerror="this.src='${esc(opts.mark)}'" />
      <div class="gh-brand">
        <div class="gh-company">${esc(BRAND_COMPANY_KU)}</div>
        <div class="gh-slogan">${esc(BRAND_SLOGAN_KU)}</div>
      </div>
      <div class="gh-contact">
        <div class="addr">${esc(companyAddressLine())}</div>
        <div class="phones">${esc(phones)}</div>
        ${stamp}
      </div>
    </header>
    <div class="gh-rules" aria-hidden="true"></div>
    <div class="gh-title">${esc(opts.title)}</div>
    ${ext}`;
}

function grebastiFooter(): string {
  const contact = companyContact();
  const phones = contact.phones.join('-');
  const email = BRAND_EMAIL.trim();
  return `
    <footer class="gh-foot">
      <div>${email ? esc(email) : esc(BRAND_NAME)}</div>
      <div class="foot-end">
        <div>${esc(companyAddressLine(contact))}</div>
        <div class="phones">${esc(phones)}</div>
      </div>
    </footer>`;
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
    data.remainingAmount != null ? formatCurrency(data.remainingAmount, locale, cur) : null;
  const totalStr = data.totalAmount != null ? formatCurrency(data.totalAmount, locale, cur) : null;
  const dateStr = isoDate(data.issuedAt);
  const { logo: logoFull, mark: logoMark } = brandLogoPair(data.assetBase);
  const phones = companyContact().phones;
  const showRemaining =
    data.remainingAmount != null && Number.isFinite(data.remainingAmount) && data.remainingAmount > 0;

  const copyLabel = (copy: 'original' | 'duplicate') =>
    copy === 'original' ? t.pdf.receiptCopyOriginal : t.pdf.receiptCopyDuplicate;

  const receiptBlock = (copy: 'original' | 'duplicate') => `
  <article class="voucher">
    <div class="wm" aria-hidden="true"><img src="${logoMark}" alt="" /></div>
    <header class="head">
      <div class="brand-col">
        <div class="logo-row">
          <img class="logo" src="${logoFull}" alt="ZMKH Road Home" />
          <div>
            <p class="n-brand">${BRAND_NAME}</p>
            <div class="copy-pill">${copyLabel(copy)}</div>
          </div>
        </div>
        <div class="phones">${phonesInlineHtml(phones)}</div>
      </div>
      <div class="names-col">
        <h1 class="doc-title">${titleKu} — ${titleAr}</h1>
        ${kindBadge ? `<p class="kind-badge">${kindBadge}</p>` : ''}
        <table class="meta-box">
          <tr><th>ژمارە / رقم</th><td>${safeNo}</td></tr>
          <tr><th>ڕێکەوت / التاريخ</th><td>${dateStr}</td></tr>
          ${isDeposit ? `<tr><th>جۆر / النوع</th><td>پارەی تأمینات</td></tr>` : ''}
        </table>
      </div>
    </header>
    <div class="lines">
      <p class="line"><span class="lab">${isDeposit ? 'لایەن / الطرف' : t.pdf.receivedFrom}</span><span class="val">${party}</span></p>
      <p class="line"><span class="lab">${isDeposit ? 'بڕی پارەی تأمینات / مبلغ التأمين' : t.pdf.amountLine}</span><span class="val">${amountStr}${
        totalStr && data.totalAmount != null && data.totalAmount !== data.amount
          ? ` · ${t.pdf.totalAmount}: ${totalStr}`
          : ''
      }</span></p>
      ${
        showRemaining && remainingStr
          ? `<p class="line line-remaining"><span class="lab">${t.pdf.remainingLine}</span><span class="val">${remainingStr}</span></p>`
          : ''
      }
      <p class="line"><span class="lab">${t.pdf.forLine}</span><span class="val">${safeDesc}</span></p>
    </div>
    <footer class="signs">
      <div class="sign"><div class="sign-label">${t.pdf.payerLine}</div><div class="sign-name">${BRAND_NAME}</div></div>
      <div class="sign"><div class="sign-label">${t.pdf.receiverLine}</div><div class="sign-name">${party}</div></div>
    </footer>
  </article>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${titleKu} — ${safeNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=block" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { font-family: ${font}; color: #0f2744; background: #e8eef5; direction: ${dir}; }
    .toolbar { max-width: 210mm; margin: 12px auto; display: flex; justify-content: flex-end; padding: 0 8px; }
    .toolbar button { font-family: inherit; border: 0; background: #0f2744; color: #fff; padding: 8px 16px; font-size: 13px; cursor: pointer; border-radius: 6px; }
    /* یەک A4 · دوو وەسڵ (ڕەسەن سەرەوە + کۆپی خوارەوە) */
    .page {
      width: 210mm; height: 297mm; margin: 0 auto 16px; background: #fff;
      padding: 8mm 10mm; display: flex; flex-direction: column; gap: 0;
      box-shadow: 0 8px 28px rgb(15 39 68 / 0.12);
    }
    .voucher {
      position: relative; flex: 1 1 0; min-height: 0;
      padding: 3mm 2mm 2mm; overflow: hidden; display: flex; flex-direction: column;
    }
    .cut {
      flex: 0 0 auto; margin: 3mm 0; border: 0;
      border-top: 1.5px dashed #94a3b8; height: 0;
      position: relative;
    }
    .cut::after {
      content: '✂'; position: absolute; inset-inline-start: 50%; top: -0.55em;
      transform: translateX(-50%); font-size: 11px; color: #94a3b8; background: #fff; padding: 0 6px;
    }
    .wm { position: absolute; inset: 12% 14% 16%; display: flex; align-items: center; justify-content: center; opacity: 0.06; pointer-events: none; z-index: 0; }
    .wm img { width: 44%; max-width: 160px; height: auto; }
    .head, .lines, .signs { position: relative; z-index: 1; }
    .head { display: grid; grid-template-columns: 1.15fr 1fr; gap: 8px; align-items: start; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 2px solid #0f2744; }
    .logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .logo {
      width: 52px; height: 52px; object-fit: contain; background: #fff;
      border: 1px solid #dbe3ef; border-radius: 8px; padding: 2px; flex-shrink: 0;
    }
    .copy-pill { display: inline-block; margin-top: 3px; font-size: 10px; font-weight: 700; color: #8b4513; border: 1px solid #c4a484; padding: 2px 8px; }
    .meta-box { width: 100%; max-width: 210px; margin-top: 6px; margin-inline-start: auto; border-collapse: collapse; font-size: 11px; border: 1px solid #0f2744; }
    .meta-box th, .meta-box td { border: 1px solid #0f2744; padding: 3px 6px; text-align: start; }
    .meta-box th { background: #f3f6fa; font-weight: 600; width: 42%; white-space: nowrap; }
    .meta-box td { font-weight: 700; font-variant-numeric: tabular-nums; }
    .names-col { text-align: end; }
    .n-brand { font-size: 14px; font-weight: 700; color: #000; line-height: 1.25; }
    .phones {
      margin-top: 4px; display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 700; color: #0f2744;
      font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate;
    }
    .phones .sep { color: #94a3b8; font-weight: 500; }
    .doc-title { font-size: 14px; font-weight: 700; color: #8b4513; line-height: 1.35; }
    .kind-badge {
      margin-top: 4px; display: inline-block; font-size: 11px; font-weight: 700;
      color: #0f2744; background: #e8eef5; border: 1px solid #0f2744; padding: 2px 8px;
    }
    .lines { flex: 1 1 auto; padding-top: 6px; }
    .line { display: flex; gap: 8px; align-items: baseline; padding: 7px 0 6px; border-bottom: 1px dotted #94a3b8; font-size: 13px; line-height: 1.5; }
    .lab { flex: 0 0 auto; color: #334155; font-weight: 600; white-space: nowrap; }
    .val { flex: 1; font-weight: 700; color: #0f172a; min-width: 0; word-break: break-word; }
    .line-remaining .lab, .line-remaining .val { color: #dc2626; }
    .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: auto; padding-top: 10px; flex: 0 0 auto; }
    .sign { text-align: center; }
    .sign-label { font-size: 11px; color: #475569; margin-bottom: 28px; }
    .sign-name { border-top: 1px solid #0f2744; padding-top: 6px; font-size: 12px; font-weight: 600; }
    @media print {
      html, body {
        width: 210mm; height: 297mm; margin: 0; padding: 0; background: #fff;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .toolbar { display: none !important; }
      .page {
        width: 210mm; height: 297mm; min-height: 297mm; max-height: 297mm;
        margin: 0 !important; padding: 8mm 10mm; box-shadow: none; overflow: hidden;
        page-break-after: avoid !important; break-after: avoid-page !important;
        page-break-inside: avoid !important; break-inside: avoid !important;
      }
      .voucher {
        overflow: hidden;
        page-break-inside: avoid !important; break-inside: avoid !important;
        page-break-after: avoid !important; break-after: avoid !important;
      }
      .cut { page-break-inside: avoid; break-inside: avoid; }
      .wm { opacity: 0.05; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="rhPrint()">${t.common.print}</button></div>
  <div class="page">
    ${receiptBlock('original')}
    <hr class="cut" />
    ${receiptBlock('duplicate')}
  </div>
  ${printBootScript(data.autoPrint)}
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
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=block" rel="stylesheet"/>
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
  areaSqm?: string | number | null;
  branchName?: string | null;
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
  organizerName?: string | null;
  showOrganizer?: boolean;
  notes?: string | null;
  signingDate?: Date | null;
  isExternal?: boolean;
  clauses: string[];
  autoPrint?: boolean;
  assetBase?: string;
}

/** Sale/purchase contract PDF — GREBASTI sample layout with ZMKH branding. */
export function renderContractHtml(locale: Locale, t: Dictionary, data: SaleContractPdfData): string {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const font = "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif";
  const { logo: logoFull, mark: logoMark } = brandLogoPair(data.assetBase);
  const g = t.pages.contractGen as Record<string, string>;
  const r = t.pages.rentals as Record<string, string>;
  const title =
    data.title?.trim() ||
    (data.kind === 'PURCHASE'
      ? g.titlePurchase ?? 'گرێبەستی کڕین و فرۆشتن'
      : g.contractTitleSaleRent ?? g.contractTitle ?? 'گرێبەستی کڕین و فرۆشتن');
  const sellerLabel = g.seller ?? 'فرۆشیار';
  const buyerLabel = g.buyer ?? 'کڕیار';
  const witness1Label = g.witness1 ?? r.witness1 ?? 'شایەدی یەکەم';
  const witness2Label = g.witness2 ?? r.witness2 ?? 'شایەدی دووەم';
  const party1Lab = g.party1Seller ?? `لایەنی یەکەم (${sellerLabel})`;
  const party2Lab = g.party2Buyer ?? `لایەنی دووەم (${buyerLabel})`;
  const mobileLab = g.mobileNo ?? r.phone ?? 'ژمارەی مۆبایل';
  const propTypeLab = g.propertyType ?? 'جۆری موڵک';
  const addressLab = g.address ?? 'ناونیشان';
  const propNoLab = g.propertyNo ?? 'ژمارەی موڵک';
  const areaLab = g.areaShort ?? 'ڕووبەر';
  const contractNoLab = g.contractNo ?? 'ژمارەی گرێبەست';
  const dateLab = g.contractDate ?? g.signingDate ?? 'ڕێکەوتی گرێبەست';
  const branchLab = g.companyBranch ?? 'لقی کۆمپانیا';
  const notesLab = g.notesLabel ?? 'تێبینی';
  const organizerLab = g.organizer ?? 'ڕێکخەری گرێبەست';
  const externalLabel = g.scopeExternalStamp ?? g.scopeExternal ?? 'گرێبەستی دەرەکی';
  const isExternal = Boolean(data.isExternal);
  const typeMap: Record<string, string> = {
    HOUSE: g.typeHouse ?? 'خانوو',
    APARTMENT: g.typeApartment ?? 'شوقە',
    LAND: g.typeLand ?? 'زەوی',
    SHOP: g.typeShop ?? 'دوکان',
    BUILDING: g.typeBuilding ?? 'بینا',
  };

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
  const signing = data.signingDate ?? new Date();
  const propType = display(
    typeMap[data.propertyType ?? ''] ?? data.propertyType,
  );
  const location = display(data.location);
  const propCode = display(data.propertyCode);
  const area =
    data.areaSqm != null && String(data.areaSqm).trim() !== ''
      ? `${esc(String(data.areaSqm))} م٢`
      : '—';
  const branch = display(data.branchName || data.location || companyAddressLine());
  const showOrganizer = data.showOrganizer !== false;
  const organizer = display(data.organizerName || BRAND_NAME);
  const clauseStrip = saleClausePrefix(locale);

  const clauseItems = data.clauses.map((c, i) => ({
    n: i + 1,
    text: esc(c.replace(clauseStrip, '')),
  }));
  const splitAt = Math.min(8, Math.max(1, clauseItems.length - 4));
  const page1Clauses = clauseItems.slice(0, splitAt);
  const page2Clauses = clauseItems.slice(splitAt);

  const renderClauses = (items: { n: number; text: string }[]) =>
    items
      .map((c) => `<p class="clause"><strong>بەندی ${c.n} :</strong> ${c.text}</p>`)
      .join('');

  const field = (lab: string, val: string, ltr = false) =>
    `<div class="frow"><span class="flab">${esc(lab)} :</span><span class="fval"${ltr ? ' dir="ltr"' : ''}>${val}</span></div>`;

  const stamp = formatSigningStamp(signing);

  const metaAndParties = `
    <section class="meta-row">
      <div class="meta-box">
        <div class="mrow"><span class="mlab">${esc(contractNoLab)}</span><span class="mval" dir="ltr">${esc(data.contractNo)}</span></div>
        <div class="mrow"><span class="mlab">${esc(dateLab)}</span><span class="mval" dir="ltr">${esc(isoDateErbil(signing))}</span></div>
        <div class="mrow"><span class="mlab">${esc(branchLab)}</span><span class="mval">${branch}</span></div>
      </div>
      <div class="party-fields">
        ${field(party1Lab, seller)}
        ${field(mobileLab, sellerPhone, true)}
        ${field(party2Lab, buyer)}
        ${field(mobileLab, buyerPhone, true)}
        ${field(propTypeLab, propType)}
        ${field(addressLab, location)}
        ${field(propNoLab, propCode, true)}
        ${field(areaLab, area)}
      </div>
    </section>`;

  const sigCell = (role: string, name: string) =>
    `<div class="sig-cell"><div class="sig-row"><span class="role">${esc(role)} :</span><span class="sig-line"></span></div><span class="sig-dash">${name}</span></div>`;

  const sigsBlock = `
    <div class="sigs-block">
      <div class="sigs-grid">
        ${sigCell(party1Lab, seller)}
        ${sigCell(party2Lab, buyer)}
        ${sigCell(witness1Label, w1)}
        ${sigCell(witness2Label, w2)}
      </div>
      ${
        showOrganizer
          ? `<div class="org-block"><div class="org-lab">${esc(organizerLab)} :</div><div class="org-line">${organizer}</div></div>`
          : ''
      }
    </div>`;

  const intro1 =
    g.pdfIntroShort ??
    'هەردوو لایەن ڕێکەوتن لەسەر ئەم خاڵانەی خوارەوە:';

  const notesVal = data.notes?.trim() || '';

  const head = grebastiHeader({
    logo: logoFull,
    mark: logoMark,
    title,
    stamp,
    isExternal,
    externalLabel,
  });
  const foot = grebastiFooter();

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title> </title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700;800&display=block" rel="stylesheet"/>
  <style>${grebastiStyles(dir, font)}</style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="rhPrint()">${t.common.print}</button></div>

  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /><div class="wm-name">${esc(BRAND_NAME)}</div></div>
    ${isExternal ? `<div class="ext-banner" aria-hidden="true">${esc(externalLabel)}</div>` : ''}
    <div class="content">
      ${head}
      ${metaAndParties}
      <p class="intro">${esc(intro1)}</p>
      <div class="clauses">${renderClauses(page1Clauses)}</div>
      ${foot}
    </div>
  </div>

  <div class="sheet page2">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /><div class="wm-name">${esc(BRAND_NAME)}</div></div>
    ${isExternal ? `<div class="ext-banner" aria-hidden="true">${esc(externalLabel)}</div>` : ''}
    <div class="content">
      ${head}
      <div class="clauses">${renderClauses(page2Clauses)}</div>
      <div class="notes">${esc(notesLab)} : ${notesVal ? esc(notesVal) : ''}</div>
      ${sigsBlock}
      ${foot}
    </div>
  </div>

  ${printBootScript(data.autoPrint)}
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
  const { logo, mark: logoMark } = brandLogoPair(data.assetBase);
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
  const phones = companyContact().phones;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title></title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Cormorant+Garamond:wght@700&display=block" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    /* Zero margins hide browser URL / date / page-number headers & footers when printing */
    @page { size: A4 portrait; margin: 0; }
    body { font-family: ${font}; color: #0f2744; background: #e8eef5; direction: ${dir}; }
    .toolbar { max-width: 210mm; margin: 12px auto; display: flex; justify-content: flex-end; padding: 0 8px; }
    .toolbar button { font-family: inherit; border: 0; background: #0f2744; color: #fff; padding: 8px 16px; font-size: 13px; cursor: pointer; border-radius: 6px; }
    .page {
      position: relative;
      width: 210mm; margin: 0 auto 16px; background: #fff;
      padding: 10mm 12mm 8mm; box-shadow: 0 8px 28px rgb(15 39 68 / 0.12);
      display: flex; flex-direction: column;
    }
    .wm { position: absolute; inset: 22% 20%; display: flex; align-items: center; justify-content: center; opacity: 0.07; pointer-events: none; z-index: 0; }
    .wm img { width: 42%; max-width: 210px; height: auto; }
    .content {
      position: relative; z-index: 1; flex: 1;
      display: flex; flex-direction: column; min-height: 0;
    }
    .head { display: grid; grid-template-columns: 1.05fr 1.15fr; gap: 12px; align-items: start; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid #0f2744; }
    .logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .logo { width: 72px; height: 72px; object-fit: contain; background: #fff; border: 1px solid #dbe3ef; border-radius: 10px; padding: 4px; }
    .brand-en { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 15px; font-weight: 700; color: #0f2744; }
    .kind-pill { display: none; }
    .deal-banner {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      margin: 8px 0 10px; padding: 8px 12px;
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
    .to { margin: 6px 0 4px; font-size: 13px; font-weight: 700; color: #0f2744; }
    .subject { margin-bottom: 8px; padding: 4px 0 6px; border-bottom: 1px solid #dbe3ef; font-size: 11.5px; line-height: 1.55; color: #1e293b; }
    .subject strong { color: #8b4513; margin-inline-end: 6px; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin-bottom: 6px; }
    .block-title { font-size: 11px; font-weight: 700; color: #0f2744; margin: 2px 0 0; padding-bottom: 3px; border-bottom: 1px solid #0f2744; }
    .line { display: flex; gap: 8px; align-items: baseline; padding: 4px 0 3px; border-bottom: 1px dotted #94a3b8; font-size: 11px; line-height: 1.4; }
    .lab { flex: 0 0 auto; color: #475569; font-weight: 600; white-space: nowrap; min-width: 5.5rem; }
    .val { flex: 1; font-weight: 700; color: #0f172a; min-width: 0; text-align: end; }
    .docs-section { margin-top: 4px; page-break-inside: avoid; break-inside: avoid; }
    .docs { display: flex; flex-wrap: wrap; gap: 5px 6px; margin-top: 5px; }
    .doc { display: inline-block; font-size: 10px; font-weight: 600; color: #0f2744; border: 1px solid #c4a484; background: #fbf7f2; padding: 3px 8px; line-height: 1.3; }
    .note { margin-top: 6px; font-size: 10.5px; color: #334155; line-height: 1.45; }
    .signs {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
      margin-top: auto; padding-top: 10px;
      page-break-inside: avoid; break-inside: avoid;
    }
    .sign { text-align: center; }
    .sign-space { height: 28px; }
    .sign-line { border-top: 1px solid #0f2744; padding-top: 8px; }
    .sign-role { font-size: 11px; color: #475569; font-weight: 600; margin-bottom: 4px; }
    .sign-name { font-size: 12px; font-weight: 700; color: #0f2744; min-height: 1.3em; }
    @media print {
      html, body {
        background: #fff !important; margin: 0 !important; padding: 0 !important;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .toolbar { display: none !important; }
      .page {
        box-shadow: none !important;
        margin: 0 !important;
        width: 210mm !important;
        min-height: 0 !important;
        height: 297mm !important;
        max-height: 297mm !important;
        padding: 9mm 11mm 7mm !important;
        overflow: hidden;
        page-break-after: avoid !important;
        break-after: avoid-page !important;
      }
      .content { page-break-inside: avoid; break-inside: avoid; }
      .cols { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="rhPrint()">${t.common.print}</button></div>
  <div class="page">
    <div class="wm" aria-hidden="true"><img src="${logoMark}" alt="" /></div>
    <div class="content">
      <header class="head">
        <div>
          <div class="logo-row">
            <img class="logo" src="${logo}" alt="ZMKH Road Home" />
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
          <p class="n-ku">${esc(BRAND_NAME_KU)}</p>
          ${BRAND_NAME_AR ? `<p class="n-ar">${esc(BRAND_NAME_AR)}</p>` : ''}
          <p class="n-en">${esc(BRAND_NAME_EN)}</p>
          <div class="phones">${phonesInlineHtml(phones)}</div>
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
      </div>

      <section class="docs-section">
        <div class="block-title">${esc(t.pages.anket.docsRequired)}</div>
        <div class="docs">${docs}</div>
        ${data.notes ? `<p class="note"><strong>${esc(t.form.notes)}:</strong> ${esc(data.notes)}</p>` : ''}
      </section>

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
  ${printBootScript(data.autoPrint)}
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

/** Lease/rent contract PDF — same GREBASTI layout as sale, with ZMKH branding. */
export function renderLeaseHtml(locale: Locale, t: Dictionary, data: LeasePdfData): string {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const font = "'Noto Kufi Arabic', 'Segoe UI', Tahoma, sans-serif";
  const { logo: logoFull, mark: logoMark } = brandLogoPair(data.assetBase);
  const r = t.pages.rentals as Record<string, string>;
  const g = t.pages.contractGen as Record<string, string>;
  const title = r.contractTitle ?? 'گرێبەستی کرێ';
  const landlordLabel = r.landlord ?? 'بەکرێدەر';
  const tenantLabel = r.tenant ?? 'کرێچی';
  const witness1Label = r.witness1 ?? 'شایەدی یەکەم';
  const witness2Label = r.witness2 ?? 'شایەدی دووەم';
  const party1Lab = r.party1Landlord ?? `لایەنی یەکەم (${landlordLabel})`;
  const party2Lab = r.party2Tenant ?? `لایەنی دووەم (${tenantLabel})`;
  const mobileLab = g.mobileNo ?? r.phone ?? 'ژمارەی مۆبایل';
  const propTypeLab = g.propertyType ?? 'جۆری موڵک';
  const addressLab = g.address ?? 'ناونیشان';
  const propNoLab = g.propertyNo ?? 'ژمارەی موڵک';
  const areaLab = g.areaShort ?? 'ڕووبەر';
  const leaseNoLab = r.leaseNo ?? 'ژمارەی گرێبەست';
  const dateLab = r.contractDate ?? r.signingDate ?? 'ڕێکەوتی گرێبەست';
  const branchLab = g.companyBranch ?? 'لقی کۆمپانیا';
  const notesLab = g.notesLabel ?? 'تێبینی';
  const organizerLab = r.organizer ?? 'ڕێکخەری گرێبەست';
  const typeMap: Record<string, string> = {
    HOUSE: g.typeHouse ?? 'خانوو',
    APARTMENT: g.typeApartment ?? 'شوقە',
    LAND: g.typeLand ?? 'زەوی',
    SHOP: g.typeShop ?? 'دوکان',
    BUILDING: g.typeBuilding ?? 'بینا',
  };

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
  const signing = data.signingDate ?? data.startDate;
  const propType = display(typeMap[data.propertyType ?? ''] ?? data.propertyType);
  const location = display(data.propertyName || data.propertyCode);
  const propCode = display(data.propertyCode);
  const area =
    data.areaSqm != null && String(data.areaSqm).trim() !== ''
      ? `${esc(String(data.areaSqm))} م٢`
      : '—';
  const showOrganizer = data.showOrganizer !== false;
  const organizer = display(data.organizerName || BRAND_NAME);
  const clauseStrip = rentalClausePrefix(locale);

  const clauseItems = data.clauses.map((c, i) => ({
    n: i + 1,
    text: esc(c.replace(clauseStrip, '')),
  }));
  const splitAt = Math.min(8, Math.max(1, clauseItems.length - 4));
  const page1Clauses = clauseItems.slice(0, splitAt);
  const page2Clauses = clauseItems.slice(splitAt);

  const renderClauses = (items: { n: number; text: string }[]) =>
    items
      .map((c) => `<p class="clause"><strong>بەندی ${c.n} :</strong> ${c.text}</p>`)
      .join('');

  const field = (lab: string, val: string, ltr = false) =>
    `<div class="frow"><span class="flab">${esc(lab)} :</span><span class="fval"${ltr ? ' dir="ltr"' : ''}>${val}</span></div>`;

  const stamp = formatSigningStamp(signing);

  const metaAndParties = `
    <section class="meta-row">
      <div class="meta-box">
        <div class="mrow"><span class="mlab">${esc(leaseNoLab)}</span><span class="mval" dir="ltr">${esc(data.leaseNo)}</span></div>
        <div class="mrow"><span class="mlab">${esc(dateLab)}</span><span class="mval" dir="ltr">${esc(isoDateErbil(signing))}</span></div>
        <div class="mrow"><span class="mlab">${esc(branchLab)}</span><span class="mval">${esc(companyAddressLine())}</span></div>
      </div>
      <div class="party-fields">
        ${field(party1Lab, landlord)}
        ${field(mobileLab, landlordPhone, true)}
        ${field(party2Lab, tenant)}
        ${field(mobileLab, tenantPhone, true)}
        ${field(propTypeLab, propType)}
        ${field(addressLab, location)}
        ${field(propNoLab, propCode, true)}
        ${field(areaLab, area)}
      </div>
    </section>`;

  const sigCell = (role: string) =>
    `<div class="sig-cell"><div class="sig-row"><span class="role">${esc(role)} :</span><span class="sig-line"></span></div><span class="sig-dash">-</span></div>`;

  const sigsBlock = `
    <div class="sigs-block">
      <div class="sigs-grid">
        ${sigCell(party1Lab)}
        ${sigCell(party2Lab)}
        ${sigCell(witness1Label)}
        ${sigCell(witness2Label)}
      </div>
      ${
        showOrganizer
          ? `<div class="org-block"><div class="org-lab">${esc(organizerLab)} :</div><div class="org-line">${organizer}</div></div>`
          : ''
      }
    </div>`;

  const intro1 =
    r.pdfIntroShort ??
    'هەردوو لایەن ڕێکەوتن لەسەر ئەم خاڵانەی خوارەوە:';

  const head = grebastiHeader({ logo: logoFull, mark: logoMark, title, stamp });
  const foot = grebastiFooter();

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title> </title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700;800&display=block" rel="stylesheet"/>
  <style>${grebastiStyles(dir, font)}</style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="rhPrint()">${t.common.print}</button></div>

  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /><div class="wm-name">${esc(BRAND_NAME)}</div></div>
    <div class="content">
      ${head}
      ${metaAndParties}
      <p class="intro">${esc(intro1)}</p>
      <div class="clauses">${renderClauses(page1Clauses)}</div>
      ${foot}
    </div>
  </div>

  <div class="sheet page2">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /><div class="wm-name">${esc(BRAND_NAME)}</div></div>
    <div class="content">
      ${head}
      <div class="clauses">${renderClauses(page2Clauses)}</div>
      <div class="notes">${esc(notesLab)} :</div>
      ${sigsBlock}
      ${foot}
    </div>
  </div>

  ${printBootScript(data.autoPrint)}
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
  autoDownload?: boolean;
  assetBase?: string;
}

/** Official support letter — government-style formal letterhead (A4). */
export function renderSupportHtml(locale: Locale, t: Dictionary, data: SupportPdfData): string {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const font = "'Noto Naskh Arabic', 'Noto Kufi Arabic', 'Traditional Arabic', Tahoma, serif";
  const { logo: logoFull, mark: logoMark } = brandLogoPair(data.assetBase);
  const contact = companyContact();
  const phones = contact.phones.filter(Boolean);
  const s = t.pages.support as Record<string, string>;
  const dateStr = isoDate(data.issuedAt);
  const branch = data.branch?.trim() || contact.address || 'بارەگای سەرەکی';

  const withRespect =
    locale === 'en'
      ? 'With respect…'
      : locale === 'ar'
        ? 'مع فائق الاحترام…'
        : (s.withRespect ?? 'لەگەڵ ڕێزدا…');

  const toLabel =
    locale === 'en'
      ? (s.toRespected ?? 'To the respected')
      : locale === 'ar'
        ? (s.toRespected ?? 'إلى السادة')
        : (s.toRespected ?? 'بۆ بەرێزان');

  const managerTitle =
    (data.managerTitle ?? '').trim() ||
    (s.manager ?? (locale === 'en' ? 'Administrative Manager' : locale === 'ar' ? 'المدير الإداري' : 'بەڕێوەبەری کارگێڕی'));

  // Formal letterhead: Arabic (left) | emblem | Kurdish (right) — like gov letters
  const headKu = ['کۆمپانیای ZMKH ڕۆد هۆم', 'عەقارات و بیناسازی', branch];
  const headAr = ['شركة ZMKH رود هوم', 'للعقارات والمقاولات', branch];

  /** Drop body lines that are only a closing — PDF prints one centered closing. */
  const bodyRaw = (() => {
    const lines = (data.content || '').split(/\r?\n/);
    const closingOnly =
      /^(لەگەڵ\s*[ڕر]?ێزدا|مع فائق الاحترام|With respect|Respectfully|بە\s*[ڕر]?ێزەوە|وتفضلوا بقبول فائق الاحترام)[.٫…·\s]*$/iu;
    while (lines.length) {
      const last = (lines[lines.length - 1] ?? '').trim();
      if (!last || closingOnly.test(last)) {
        lines.pop();
        continue;
      }
      break;
    }
    return lines
      .filter((line) => !closingOnly.test(line.trim()))
      .join('\n')
      .trim();
  })();

  const bodyHtml = esc(bodyRaw)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replaceAll('\n', '<br/>')}</p>`)
    .join('');

  const pdfFileTitle = (data.supportNo || 'support').replace(/[^\w.-]+/g, '_');
  const downloadPdfLabel =
    locale === 'en'
      ? 'Download PDF'
      : locale === 'ar'
        ? 'تحميل PDF'
        : (s.downloadPdf ?? 'داگرتنی PDF');
  const printLabel =
    locale === 'en'
      ? (s.print ?? 'Print')
      : locale === 'ar'
        ? (s.print ?? 'طباعة')
        : (s.print ?? 'چاپکردن');

  const phonesHtml = phonesInlineHtml(phones);
  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(pdfFileTitle)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&family=Noto+Kufi+Arabic:wght@600;700&display=block" rel="stylesheet"/>
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
      max-width: 794px; margin: 10px auto 0; display: flex; justify-content: flex-end; gap: 8px; padding: 0 4px;
    }
    .toolbar button {
      font-family: inherit; border: 0; background: #0f2744; color: #fff;
      padding: 8px 18px; font-size: 13px; font-weight: 700; cursor: pointer; border-radius: 6px;
    }
    .toolbar button.secondary {
      background: #fff; color: #0f2744; border: 1px solid #0f2744;
    }
    /* Exact A4 px — one page only; footer pinned to bottom */
    .sheet {
      width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px;
      margin: 8px auto 16px; background: #fff;
      padding: 48px 56px 0; position: relative; overflow: hidden;
      box-shadow: 0 8px 28px rgb(15 39 68 / 0.12);
    }
    .wm {
      position: absolute; left: 22%; right: 22%; top: 38%; bottom: 30%;
      text-align: center; opacity: 0.04; pointer-events: none; z-index: 0;
    }
    .wm img { width: 42%; max-width: 190px; height: auto; }
    .page {
      position: relative; z-index: 1;
      padding-bottom: 170px; /* leave room for pinned footer */
    }

    /* Table letterhead — reliable in html2canvas (AR | logo | KU) */
    table.head {
      width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed;
      margin: 0 0 8px; padding: 0;
    }
    table.head td { vertical-align: middle; padding: 0 6px; border: 0; }
    table.head td.emblem-cell { width: 88px; text-align: center; padding: 0; }
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
    .head-side .org { font-size: 13.5px; font-weight: 700; }
    .head-side .dept { font-size: 11.5px; font-weight: 600; margin-top: 2px; color: #1a3358; }
    .head-side .place { font-size: 10.5px; font-weight: 600; margin-top: 3px; color: #475569; }
    .emblem {
      width: 72px; height: 72px; object-fit: contain; display: inline-block;
      background: #fff; vertical-align: middle;
    }
    .rules {
      margin: 0 0 14px;
      border: 0;
      border-top: 2.5px solid #0f2744;
      border-bottom: 0.6px solid #0f2744;
      height: 5px;
      background: transparent;
    }
    .rule-thick {
      border: 0; border-top: 2.4px solid #0f2744; margin: 14px 0 0; padding-top: 0;
    }

    table.meta {
      width: 100%; border-collapse: collapse; direction: inherit;
      font-size: 12.5px; font-weight: 700; margin-bottom: 18px; color: #0f2744;
    }
    table.meta td { border: 0; padding: 0; vertical-align: top; white-space: nowrap; }
    table.meta td.date-cell { text-align: end; }
    .meta .val {
      display: inline-block; min-width: 7rem; border-bottom: 1px solid #0f2744;
      padding: 0 6px 1px; margin-inline-start: 4px;
      font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate;
      font-weight: 700;
    }

    .to-block, .subject-block {
      text-align: center; margin: 0 0 10px; font-weight: 700; font-size: 14px;
      unicode-bidi: isolate; color: #0b1220; line-height: 1.7;
    }
    .to-block .k, .subject-block .k { margin-inline-end: 6px; font-weight: 700; }
    .to-block .v, .subject-block .v { font-weight: 700; }

    .body {
      margin-top: 14px; text-align: justify; font-size: 13.5px; line-height: 2.05;
      color: #111; unicode-bidi: isolate;
    }
    .body p { margin: 0 0 0.9em; text-indent: 1.2em; }
    .body p:first-child { text-indent: 0; }
    .body p:last-child { margin-bottom: 0; }

    .closing {
      margin: 18px 0 0;
      text-align: center;
      font-weight: 700;
      font-size: 15px;
      unicode-bidi: isolate;
      color: #111;
    }

    /* Signature + contact locked to bottom of the A4 sheet */
    .foot {
      position: absolute;
      left: 56px;
      right: 56px;
      bottom: 32px;
      margin: 0;
      padding: 0;
      z-index: 2;
    }
    .bottom { text-align: end; margin-top: 0; direction: inherit; }
    .sign-block {
      display: inline-block;
      text-align: center;
      unicode-bidi: isolate;
      min-width: 12rem;
    }
    .sign-block .space { height: 36px; }
    .sign-block .name { font-weight: 700; font-size: 15px; color: #111; }
    .sign-block .role { font-size: 13px; font-weight: 700; margin-top: 4px; color: #111; }

    .contact-bar {
      margin-top: 12px; text-align: center; font-size: 11.5px; font-weight: 700;
      color: #0f2744; direction: ltr; unicode-bidi: isolate;
    }
    .contact-bar .addr { direction: rtl; unicode-bidi: isolate; margin-bottom: 4px; font-weight: 600; color: #475569; }
    .contact-bar .phones { font-variant-numeric: tabular-nums; }
    .contact-bar .phones .sep { color: #94a3b8; font-weight: 500; margin: 0 4px; }

    @media print {
      html, body {
        width: 210mm; height: 297mm; margin: 0; padding: 0; background: #fff;
        overflow: hidden;
      }
      .toolbar { display: none !important; }
      .sheet {
        width: 210mm; height: 297mm; min-height: 297mm; max-height: 297mm;
        margin: 0; padding: 12mm 14mm 0; box-shadow: none;
        overflow: hidden; page-break-after: avoid; break-after: avoid;
      }
      .page { padding-bottom: 42mm; }
      .foot {
        left: 14mm; right: 14mm; bottom: 10mm;
        page-break-inside: avoid; break-inside: avoid;
      }
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" crossorigin="anonymous"></script>
  <script>
    function rhSupportPrint() {
      window.print();
    }
    function rhWaitAssets(root) {
      var imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
      var imgReady = Promise.all(imgs.map(function (img) {
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise(function (resolve) {
          var done = function () { resolve(); };
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 2500);
        });
      }));
      var fontsReady = (document.fonts && document.fonts.ready)
        ? document.fonts.ready.catch(function () {})
        : Promise.resolve();
      return Promise.all([fontsReady, imgReady]);
    }
    function rhSupportDownloadPdf() {
      var sheet = document.querySelector('.sheet');
      var toolbar = document.querySelector('.toolbar');
      var btn = document.getElementById('rh-pdf-btn');
      if (!sheet) return;
      var label = ${JSON.stringify(downloadPdfLabel)};
      var filename = ${JSON.stringify(pdfFileTitle + '.pdf')};
      if (typeof html2pdf === 'undefined') {
        window.print();
        return;
      }
      if (btn) { btn.disabled = true; btn.textContent = '…'; }
      if (toolbar) toolbar.style.display = 'none';
      rhWaitAssets(sheet).then(function () {
        sheet.style.width = '794px';
        sheet.style.height = '1123px';
        sheet.style.maxHeight = '1123px';
        sheet.style.overflow = 'hidden';
        return html2pdf()
          .set({
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              logging: false,
              scrollX: 0,
              scrollY: 0,
              x: 0,
              y: 0,
              width: 794,
              height: 1123,
              windowWidth: 794,
              windowHeight: 1123,
              onclone: function (clonedDoc) {
                var body = clonedDoc.body;
                var clonedSheet = clonedDoc.querySelector('.sheet');
                var clonedToolbar = clonedDoc.querySelector('.toolbar');
                if (clonedToolbar) clonedToolbar.style.display = 'none';
                body.style.background = '#ffffff';
                body.style.margin = '0';
                body.style.padding = '0';
                if (clonedSheet) {
                  clonedSheet.style.width = '794px';
                  clonedSheet.style.height = '1123px';
                  clonedSheet.style.minHeight = '1123px';
                  clonedSheet.style.maxHeight = '1123px';
                  clonedSheet.style.margin = '0';
                  clonedSheet.style.boxShadow = 'none';
                  clonedSheet.style.transform = 'none';
                  clonedSheet.style.overflow = 'hidden';
                }
              }
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: [] }
          })
          .from(sheet)
          .toPdf()
          .get('pdf')
          .then(function (pdf) {
            // Force exactly one A4 page
            var n = pdf.internal.getNumberOfPages();
            for (var i = n; i > 1; i--) pdf.deletePage(i);
          })
          .save();
      }).then(function () {
        if (toolbar) toolbar.style.display = '';
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }).catch(function () {
        if (toolbar) toolbar.style.display = '';
        if (btn) { btn.disabled = false; btn.textContent = label; }
        window.print();
      });
    }
  </script>
</head>
<body>
  <div class="toolbar">
    <button type="button" class="secondary" onclick="rhSupportPrint()">${esc(printLabel)}</button>
    <button type="button" id="rh-pdf-btn" onclick="rhSupportDownloadPdf()">${esc(downloadPdfLabel)}</button>
  </div>
  <div class="sheet">
    <div class="wm" aria-hidden="true"><img src="${esc(logoMark)}" alt="" /></div>
    <div class="page">
      <table class="head" dir="ltr" role="presentation">
        <tr>
          <td class="head-side ar" dir="rtl" lang="ar">
            <span class="line org">${esc(headAr[0])}</span>
            <span class="line dept">${esc(headAr[1])}</span>
            <span class="line place">${esc(headAr[2])}</span>
          </td>
          <td class="emblem-cell">
            <img class="emblem" src="${esc(logoMark)}" alt="" onerror="this.src='${esc(logoFull)}'" />
          </td>
          <td class="head-side ku" dir="rtl" lang="ckb">
            <span class="line org">${esc(headKu[0])}</span>
            <span class="line dept">${esc(headKu[1])}</span>
            <span class="line place">${esc(headKu[2])}</span>
          </td>
        </tr>
      </table>

      <div class="rules" aria-hidden="true"></div>

      <table class="meta" role="presentation">
        <tr>
          <td>
            <span class="lbl">${esc(s.number ?? 'ژمارە')}:</span>
            <span class="val" dir="ltr">${esc(data.supportNo)}</span>
          </td>
          <td class="date-cell">
            <span class="lbl">${esc(s.date ?? 'ڕێکەوت')}:</span>
            <span class="val" dir="ltr">${esc(dateStr)}</span>
          </td>
        </tr>
      </table>

      <p class="to-block">
        <span class="k">${esc(toLabel)}/</span>
        <span class="v">${esc(data.toName)}</span>
      </p>
      <p class="subject-block">
        <span class="k">${esc(s.subject ?? 'بابەت')} /</span>
        <span class="v">${esc(data.subject)}</span>
      </p>

      <div class="body">${bodyHtml || `<p>${esc(s.emptyBody ?? '—')}</p>`}</div>

      <p class="closing">${esc(withRespect)}</p>
    </div>

      <footer class="foot">
        <div class="bottom">
          <div class="sign-block">
            <div class="space" aria-hidden="true"></div>
            <div class="name">${esc(data.managerName)}</div>
            <div class="role">${esc(managerTitle)}</div>
          </div>
        </div>
        <hr class="rule-thick" />
        <div class="contact-bar">
          <div class="addr">${esc(companyAddressLine(contact))}</div>
          <div class="phones">${phonesHtml || '—'}</div>
        </div>
      </footer>
  </div>
  ${
    data.autoDownload
      ? `<script>
    window.addEventListener("load", function () {
      function go() {
        if (typeof rhSupportDownloadPdf === "function") rhSupportDownloadPdf();
      }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { setTimeout(go, 500); });
      } else {
        setTimeout(go, 900);
      }
    });
  </script>`
      : data.autoPrint
        ? `<script>window.addEventListener("load",function(){setTimeout(function(){if(typeof rhSupportPrint==="function")rhSupportPrint()},400)});</script>`
        : ''
  }
</body>
</html>`;
}
