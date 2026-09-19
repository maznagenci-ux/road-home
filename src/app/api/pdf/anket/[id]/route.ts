import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale, localeFromUser, type Locale } from '@/i18n/locale-config';
import { renderAnketHtml } from '@/lib/pdf/templates';
import { labelAnketDoc } from '@/lib/anket/documents';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const localeParam = url.searchParams.get('locale');
  const locale: Locale =
    localeParam && hasLocale(localeParam) ? localeParam : localeFromUser(session.locale);
  const autoPrint = url.searchParams.get('print') === '1';

  const item = await prisma.anket.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let documents: string[] = [];
  try {
    documents = (JSON.parse(item.documents || '[]') as string[]).map((k) =>
      labelAnketDoc(k, locale),
    );
  } catch {
    documents = [];
  }

  const t = await getDictionary(locale);
  const html = renderAnketHtml(locale, t, {
    anketNo: item.anketNo,
    kind: item.kind,
    issuedAt: item.issuedAt,
    securityStationName: item.securityStationName,
    projectName: item.projectName,
    propertyName: item.propertyName,
    propertyNo: item.propertyNo,
    propertyType: item.propertyType,
    buildingNo: item.buildingNo,
    floorNo: item.floorNo,
    unitNo: item.unitNo,
    propertyStatus: item.propertyStatus,
    party1Name: item.party1Name,
    party1Phone: item.party1Phone,
    party1Address: item.party1Address,
    party1Nationality: item.party1Nationality,
    party1Occupation: item.party1Occupation,
    party2Name: item.party2Name,
    party2Phone: item.party2Phone,
    party2Address: item.party2Address,
    party2Nationality: item.party2Nationality,
    party2Occupation: item.party2Occupation,
    party2Origin: item.party2Origin,
    documents,
    notes: item.notes,
    organizerName: item.organizerName,
    mukhtarName: item.mukhtarName,
    autoPrint,
    assetBase: url.origin,
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
