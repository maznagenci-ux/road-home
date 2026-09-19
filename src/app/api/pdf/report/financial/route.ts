import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/access/permissions';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, localeFromUser, type Locale } from '@/i18n/locale-config';
import { getUnifiedFinancials } from '@/lib/finance/unified-report';
import { renderUnifiedFinancialReportHtml } from '@/lib/pdf/unified-report';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canReport = await hasPermission(session.id, session.role, 'VIEW_REPORTS');
  const canAccounting = await hasPermission(session.id, session.role, 'VIEW_ACCOUNTING');
  if (!canReport && !canAccounting) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const url = new URL(req.url);
  const localeParam = url.searchParams.get('locale');
  const locale: Locale =
    localeParam && hasLocale(localeParam) ? localeParam : localeFromUser(session.locale);

  const fromRaw = url.searchParams.get('from');
  const toRaw = url.searchParams.get('to');
  const from = fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : null;
  const to = toRaw ? new Date(`${toRaw}T23:59:59.999Z`) : null;

  const data = await getUnifiedFinancials({ from, to });
  const t = await getDictionary(locale);
  const html = renderUnifiedFinancialReportHtml(locale, t, data);

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
