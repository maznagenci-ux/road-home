import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/access/permissions';
import {
  loadCompanyContact,
  upsertCompanyContact,
} from '@/lib/company-contact';

const schema = z.object({
  address: z.string().min(1).max(500),
  address2: z.string().max(500).optional().default(''),
  phone1: z.string().min(1).max(40),
  phone2: z.string().max(40).optional().default(''),
  phone3: z.string().max(40).optional().default(''),
  phone4: z.string().max(40).optional().default(''),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const contact = await loadCompanyContact();
  return NextResponse.json({ item: contact });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED' }, { status: 403 });
  }
  try {
    const data = schema.parse(await req.json());
    const item = await upsertCompanyContact({
      address: data.address,
      address2: data.address2 ?? '',
      phone1: data.phone1,
      phone2: data.phone2 ?? '',
      phone3: data.phone3 ?? '',
      phone4: data.phone4 ?? '',
      updatedBy: session.id,
    });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
