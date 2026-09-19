import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('VIEW_CONTRACTS');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const item = await prisma.supportLetter.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ item });
}

const patchSchema = z.object({
  recipientKind: z.enum(['GOVERNMENT', 'CONSULATE', 'OTHER']).optional(),
  purpose: z.enum(['OWNERSHIP', 'RENTAL', 'RESIDENCY', 'TRANSACTION', 'OTHER']).optional(),
  applicant: z.string().min(1).optional(),
  beneficiaryName: z.string().optional().nullable(),
  beneficiaryIdNo: z.string().optional().nullable(),
  beneficiaryPhone: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
  toName: z.string().min(1).optional(),
  recipientAddress: z.string().optional().nullable(),
  subject: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  propertyRef: z.string().optional().nullable(),
  managerName: z.string().min(1).optional(),
  managerTitle: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const existing = await prisma.supportLetter.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const data = patchSchema.parse(await req.json());
    const item = await prisma.supportLetter.update({
      where: { id },
      data: {
        recipientKind: data.recipientKind ?? existing.recipientKind,
        purpose: data.purpose ?? existing.purpose,
        applicant: data.applicant ?? existing.applicant,
        beneficiaryName:
          data.beneficiaryName !== undefined
            ? data.beneficiaryName?.trim() || null
            : existing.beneficiaryName,
        beneficiaryIdNo:
          data.beneficiaryIdNo !== undefined
            ? data.beneficiaryIdNo?.trim() || null
            : existing.beneficiaryIdNo,
        beneficiaryPhone:
          data.beneficiaryPhone !== undefined
            ? data.beneficiaryPhone?.trim() || null
            : existing.beneficiaryPhone,
        fromName: data.fromName !== undefined ? data.fromName : existing.fromName,
        toName: data.toName ?? existing.toName,
        recipientAddress:
          data.recipientAddress !== undefined
            ? data.recipientAddress?.trim() || null
            : existing.recipientAddress,
        subject: data.subject ?? existing.subject,
        content: data.content ?? existing.content,
        propertyRef:
          data.propertyRef !== undefined
            ? data.propertyRef?.trim() || null
            : existing.propertyRef,
        managerName: data.managerName ?? existing.managerName,
        managerTitle:
          data.managerTitle !== undefined ? data.managerTitle : existing.managerTitle,
        branch: data.branch !== undefined ? data.branch : existing.branch,
        issuedAt: data.issuedAt
          ? new Date(
              data.issuedAt.includes('T') ? data.issuedAt : `${data.issuedAt}T12:00:00.000Z`,
            )
          : existing.issuedAt,
      },
    });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission('MANAGE_CONTRACTS');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  await prisma.supportLetter.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
