import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import { BRAND_NAME } from '@/lib/brand';

async function nextSupportNo() {
  const count = await prisma.supportLetter.count();
  const y = new Date().getFullYear();
  return `SP-${y}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(req: Request) {
  const auth = await requireApiPermission('VIEW_CONTRACTS');
  if ('error' in auth) return auth.error;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const kind = url.searchParams.get('kind')?.trim() || '';
  const purpose = url.searchParams.get('purpose')?.trim() || '';
  const from = url.searchParams.get('from')?.trim() || '';
  const to = url.searchParams.get('to')?.trim() || '';

  const where: Record<string, unknown> = {};
  if (kind) where.recipientKind = kind;
  if (
    purpose &&
    ['OWNERSHIP', 'RENTAL', 'RESIDENCY', 'TRANSACTION', 'OTHER'].includes(purpose)
  ) {
    where.purpose = purpose;
  }
  if (from || to) {
    where.issuedAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { supportNo: { contains: q } },
      { applicant: { contains: q } },
      { beneficiaryName: { contains: q } },
      { fromName: { contains: q } },
      { toName: { contains: q } },
      { subject: { contains: q } },
      { managerName: { contains: q } },
      { propertyRef: { contains: q } },
    ];
  }

  const items = await prisma.supportLetter.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    take: 300,
  });

  return NextResponse.json({ items });
}

const createSchema = z.object({
  recipientKind: z.enum(['GOVERNMENT', 'CONSULATE', 'OTHER']).default('GOVERNMENT'),
  purpose: z
    .enum(['OWNERSHIP', 'RENTAL', 'RESIDENCY', 'TRANSACTION', 'OTHER'])
    .default('OWNERSHIP'),
  applicant: z.string().min(1).default(BRAND_NAME),
  beneficiaryName: z.string().optional().nullable(),
  beneficiaryIdNo: z.string().optional().nullable(),
  beneficiaryPhone: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
  toName: z.string().min(1),
  recipientAddress: z.string().optional().nullable(),
  subject: z.string().min(1),
  content: z.string().min(1),
  propertyRef: z.string().optional().nullable(),
  managerName: z.string().min(1),
  managerTitle: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;

  try {
    const data = createSchema.parse(await req.json());
    const issuedAt = data.issuedAt
      ? new Date(data.issuedAt.includes('T') ? data.issuedAt : `${data.issuedAt}T12:00:00.000Z`)
      : new Date();

    const item = await prisma.supportLetter.create({
      data: {
        supportNo: await nextSupportNo(),
        recipientKind: data.recipientKind,
        purpose: data.purpose,
        applicant: data.applicant || BRAND_NAME,
        beneficiaryName: data.beneficiaryName?.trim() || null,
        beneficiaryIdNo: data.beneficiaryIdNo?.trim() || null,
        beneficiaryPhone: data.beneficiaryPhone?.trim() || null,
        fromName: data.fromName ?? null,
        toName: data.toName,
        recipientAddress: data.recipientAddress?.trim() || null,
        subject: data.subject,
        content: data.content,
        propertyRef: data.propertyRef?.trim() || null,
        managerName: data.managerName,
        managerTitle: data.managerTitle ?? null,
        branch: data.branch || 'بارەگای سەرەکی',
        issuedAt,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
