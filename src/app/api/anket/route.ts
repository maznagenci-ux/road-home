import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import { logActivity } from '@/lib/access/permissions';

async function nextAnketNo() {
  const count = await prisma.anket.count();
  const y = new Date().getFullYear().toString().slice(-2);
  return `A-H-${y}-${String(count + 1).padStart(4, '0')}`;
}

const docsSchema = z.array(z.string()).default([]);

const bodySchema = z.object({
  kind: z.enum(['SALE', 'RENT']).default('RENT'),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED']).optional(),
  branch: z.string().max(120).optional(),
  issuedAt: z.string().optional().nullable(),
  securityStationName: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  propertyType: z.enum(['HOUSE', 'APARTMENT', 'LAND', 'SHOP', 'BUILDING']).optional(),
  propertyNo: z.string().max(80).optional(),
  propertyName: z.string().max(200).optional(),
  projectName: z.string().max(200).optional(),
  buildingNo: z.string().max(40).optional(),
  floorNo: z.string().max(40).optional(),
  unitNo: z.string().max(40).optional(),
  propertyStatus: z.string().max(80).optional(),
  party1Name: z.string().max(200).optional(),
  party1Phone: z.string().max(40).optional(),
  party1Address: z.string().max(300).optional(),
  party1Nationality: z.string().max(80).optional(),
  party1Occupation: z.string().max(120).optional(),
  party1Code: z.string().max(80).optional(),
  party2Name: z.string().max(200).optional(),
  party2Phone: z.string().max(40).optional(),
  party2Address: z.string().max(300).optional(),
  party2Nationality: z.string().max(80).optional(),
  party2Occupation: z.string().max(120).optional(),
  party2Origin: z.string().max(200).optional(),
  documents: docsSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
  organizerName: z.string().max(200).optional(),
  mukhtarName: z.string().max(200).optional(),
});

function serialize(item: {
  documents: string;
  [key: string]: unknown;
}) {
  let documents: string[] = [];
  try {
    documents = JSON.parse(item.documents || '[]') as string[];
  } catch {
    documents = [];
  }
  return { ...item, documents };
}

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_ANKET');
  if ('error' in auth) return auth.error;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const kind = url.searchParams.get('kind')?.trim() || '';
  const status = url.searchParams.get('status')?.trim() || '';
  const from = url.searchParams.get('from')?.trim() || '';
  const to = url.searchParams.get('to')?.trim() || '';

  const where: Record<string, unknown> = {};
  if (kind && ['SALE', 'RENT'].includes(kind)) where.kind = kind;
  if (status && ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(status)) where.status = status;
  if (from || to) {
    where.issuedAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { anketNo: { contains: q } },
      { party1Name: { contains: q } },
      { party2Name: { contains: q } },
      { propertyNo: { contains: q } },
      { propertyName: { contains: q } },
      { projectName: { contains: q } },
      { securityStationName: { contains: q } },
    ];
  }

  const items = await prisma.anket.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    take: 300,
  });
  return NextResponse.json({ items: items.map(serialize) });
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('MANAGE_ANKET');
  if ('error' in auth) return auth.error;
  try {
    const data = bodySchema.parse(await req.json());
    const anketNo = await nextAnketNo();
    const item = await prisma.anket.create({
      data: {
        anketNo,
        kind: data.kind,
        status: data.status ?? 'DRAFT',
        branch: data.branch?.trim() || 'بارەگای سەرەکی',
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
        securityStationName: data.securityStationName?.trim() || '',
        location: data.location?.trim() || '',
        propertyType: data.propertyType ?? 'APARTMENT',
        propertyNo: data.propertyNo?.trim() || '',
        propertyName: data.propertyName?.trim() || '',
        projectName: data.projectName?.trim() || '',
        buildingNo: data.buildingNo?.trim() || '',
        floorNo: data.floorNo?.trim() || '',
        unitNo: data.unitNo?.trim() || '',
        propertyStatus: data.propertyStatus?.trim() || '',
        party1Name: data.party1Name?.trim() || '',
        party1Phone: data.party1Phone?.trim() || '',
        party1Address: data.party1Address?.trim() || '',
        party1Nationality: data.party1Nationality?.trim() || '',
        party1Occupation: data.party1Occupation?.trim() || '',
        party1Code: data.party1Code?.trim() || '',
        party2Name: data.party2Name?.trim() || '',
        party2Phone: data.party2Phone?.trim() || '',
        party2Address: data.party2Address?.trim() || '',
        party2Nationality: data.party2Nationality?.trim() || '',
        party2Occupation: data.party2Occupation?.trim() || '',
        party2Origin: data.party2Origin?.trim() || '',
        documents: JSON.stringify(data.documents ?? []),
        notes: data.notes?.trim() || null,
        organizerName: data.organizerName?.trim() || 'Road Home ZMKH Real Estate',
        mukhtarName: data.mukhtarName?.trim() || '',
      },
    });
    await logActivity({
      userId: auth.session.id,
      userName: auth.session.name,
      action: 'CREATE_ANKET',
      meta: anketNo,
    });
    return NextResponse.json({ item: serialize(item) }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireApiPermission('MANAGE_ANKET');
  if ('error' in auth) return auth.error;
  try {
    const raw = await req.json();
    const id = z.string().min(1).parse(raw.id);
    const data = bodySchema.parse(raw);
    const item = await prisma.anket.update({
      where: { id },
      data: {
        ...(data.kind !== undefined ? { kind: data.kind } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.branch !== undefined ? { branch: data.branch.trim() } : {}),
        ...(data.issuedAt ? { issuedAt: new Date(data.issuedAt) } : {}),
        ...(data.securityStationName !== undefined
          ? { securityStationName: data.securityStationName.trim() }
          : {}),
        ...(data.location !== undefined ? { location: data.location.trim() } : {}),
        ...(data.propertyType !== undefined ? { propertyType: data.propertyType } : {}),
        ...(data.propertyNo !== undefined ? { propertyNo: data.propertyNo.trim() } : {}),
        ...(data.propertyName !== undefined ? { propertyName: data.propertyName.trim() } : {}),
        ...(data.projectName !== undefined ? { projectName: data.projectName.trim() } : {}),
        ...(data.buildingNo !== undefined ? { buildingNo: data.buildingNo.trim() } : {}),
        ...(data.floorNo !== undefined ? { floorNo: data.floorNo.trim() } : {}),
        ...(data.unitNo !== undefined ? { unitNo: data.unitNo.trim() } : {}),
        ...(data.propertyStatus !== undefined ? { propertyStatus: data.propertyStatus.trim() } : {}),
        ...(data.party1Name !== undefined ? { party1Name: data.party1Name.trim() } : {}),
        ...(data.party1Phone !== undefined ? { party1Phone: data.party1Phone.trim() } : {}),
        ...(data.party1Address !== undefined ? { party1Address: data.party1Address.trim() } : {}),
        ...(data.party1Nationality !== undefined
          ? { party1Nationality: data.party1Nationality.trim() }
          : {}),
        ...(data.party1Occupation !== undefined
          ? { party1Occupation: data.party1Occupation.trim() }
          : {}),
        ...(data.party1Code !== undefined ? { party1Code: data.party1Code.trim() } : {}),
        ...(data.party2Name !== undefined ? { party2Name: data.party2Name.trim() } : {}),
        ...(data.party2Phone !== undefined ? { party2Phone: data.party2Phone.trim() } : {}),
        ...(data.party2Address !== undefined ? { party2Address: data.party2Address.trim() } : {}),
        ...(data.party2Nationality !== undefined
          ? { party2Nationality: data.party2Nationality.trim() }
          : {}),
        ...(data.party2Occupation !== undefined
          ? { party2Occupation: data.party2Occupation.trim() }
          : {}),
        ...(data.party2Origin !== undefined ? { party2Origin: data.party2Origin.trim() } : {}),
        ...(data.documents !== undefined ? { documents: JSON.stringify(data.documents) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.organizerName !== undefined ? { organizerName: data.organizerName.trim() } : {}),
        ...(data.mukhtarName !== undefined ? { mukhtarName: data.mukhtarName.trim() } : {}),
      },
    });
    return NextResponse.json({ item: serialize(item) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiPermission('MANAGE_ANKET');
  if ('error' in auth) return auth.error;

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get('id')?.trim() || '';
    if (!id) {
      const body = (await req.json().catch(() => null)) as { id?: string } | null;
      id = body?.id?.trim() || '';
    }
    if (!id) {
      return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 });
    }

    const existing = await prisma.anket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    await prisma.anket.delete({ where: { id } });
    await logActivity({
      userId: auth.session.id,
      userName: auth.session.name,
      action: 'DELETE_ANKET',
      meta: existing.anketNo,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
