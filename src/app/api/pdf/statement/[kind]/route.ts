import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import {
  getCustomerStatement,
  getPropertyFinancialProfile,
  getSupplierStatement,
} from '@/lib/accounting/statements';
import { BRAND_NAME_KU, BRAND_SLOGAN_KU } from '@/lib/brand';

function esc(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
function fmt(n: number) {
  return new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(Math.round(n));
}

function wrap(title: string, body: string) {
  return `<!DOCTYPE html><html lang="ckb" dir="rtl"><head><meta charset="utf-8"/><title>${esc(title)}</title>
  <style>body{font-family:'Noto Kufi Arabic',Tahoma,sans-serif;padding:24px;color:#1c1917}
  h1{font-size:1.25rem;margin:0} .sub{color:#78716c;margin:4px 0 16px}
  table{width:100%;border-collapse:collapse;font-size:.85rem} th,td{border-bottom:1px solid #e7e5e4;padding:6px;text-align:right}
  .num{font-variant-numeric:tabular-nums}</style></head><body>
  <h1>${esc(BRAND_NAME_KU)}</h1><div class="sub">${esc(BRAND_SLOGAN_KU)} · ${esc(title)}</div>
  ${body}</body></html>`;
}

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ACCOUNTING');
  if ('error' in auth) return auth.error;

  const url = new URL(req.url);
  const path = url.pathname;
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });

  try {
    if (path.includes('/customer')) {
      const s = await getCustomerStatement(id);
      const rows = s.rows
        .map(
          (r) =>
            `<tr><td>${esc(r.txnNo)}</td><td>${esc(r.date.slice(0, 10))}</td><td>${esc(r.type)}</td><td class="num">${fmt(r.arDeltaIqd)}</td><td class="num">${fmt(r.balanceIqd)}</td></tr>`,
        )
        .join('');
      const html = wrap(
        `بەیاننامەی کڕیار — ${s.customer.name}`,
        `<p>باڵانس: <strong>${fmt(s.balanceIqd)}</strong> د.ع</p>
         <table><thead><tr><th>#</th><th>بەروار</th><th>جۆر</th><th>جوڵە</th><th>باڵانس</th></tr></thead><tbody>${rows || '<tr><td colspan="5">—</td></tr>'}</tbody></table>`,
      );
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (path.includes('/supplier')) {
      const s = await getSupplierStatement(id);
      const rows = s.rows
        .map(
          (r) =>
            `<tr><td>${esc(r.txnNo)}</td><td>${esc(r.date.slice(0, 10))}</td><td>${esc(r.type)}</td><td class="num">${fmt(r.apDeltaIqd)}</td><td class="num">${fmt(r.balanceIqd)}</td></tr>`,
        )
        .join('');
      const html = wrap(
        `بەیاننامەی دابینکەر — ${s.supplier.name}`,
        `<p>باڵانس: <strong>${fmt(s.balanceIqd)}</strong> د.ع</p>
         <table><thead><tr><th>#</th><th>بەروار</th><th>جۆر</th><th>جوڵە</th><th>باڵانس</th></tr></thead><tbody>${rows || '<tr><td colspan="5">—</td></tr>'}</tbody></table>`,
      );
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (path.includes('/property')) {
      const s = await getPropertyFinancialProfile(id);
      const rows = s.txns
        .map(
          (t) =>
            `<tr><td>${esc(t.txnNo)}</td><td>${esc(t.date.slice(0, 10))}</td><td>${esc(t.type)}</td><td class="num">${fmt(t.amountBaseIqd)}</td></tr>`,
        )
        .join('');
      const html = wrap(
        `پرۆفایلی دارایی — ${s.property.name}`,
        `<p>تێچوو: ${fmt(s.costIqd)} · داهات: ${fmt(s.revenueIqd)} · قازانج: ${fmt(s.profitIqd)} · وەرگیراو: ${fmt(s.receivedIqd)} · ماوە: ${fmt(s.remainingIqd)}</p>
         <table><thead><tr><th>#</th><th>بەروار</th><th>جۆر</th><th>بڕ</th></tr></thead><tbody>${rows || '<tr><td colspan="4">—</td></tr>'}</tbody></table>`,
      );
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'SERVER_ERROR' },
      { status: 400 },
    );
  }
}
