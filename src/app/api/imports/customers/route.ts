import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, logActivity } from '@/lib/access/permissions';

const rowSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
});

/**
 * Import customers from Excel (.xlsx).
 * Expected columns: name | phone | email | note (headers flexible / case-insensitive)
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await hasPermission(session.id, session.role, 'MANAGE_CONTRACTS');
  if (!allowed) {
    const alt = await hasPermission(session.id, session.role, 'VIEW_USERS');
    if (!alt) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const normalizeKey = (k: string) =>
      k
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < raw.length; i++) {
      const row = raw[i];
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        map[normalizeKey(k)] = String(v ?? '').trim();
      }
      const name =
        map.name || map.naw || map.customer || map.customername || map['ناو'] || '';
      const phone = map.phone || map.mobile || map.tel || map['مۆبایل'] || map['ژمارە'] || '';
      const email = map.email || map.mail || '';
      const note = map.note || map.notes || map['تێبینی'] || '';
      const nationalId =
        map.nationalid ||
        map.idno ||
        map.national_id ||
        map['ناسنامە'] ||
        map['ژمارەیناسنامە'] ||
        '';

      const parsed = rowSchema.safeParse({
        name,
        phone: phone || null,
        email: email || null,
        note: note || null,
        nationalId: nationalId || null,
      });
      if (!parsed.success) {
        skipped++;
        errors.push(`row ${i + 2}: invalid`);
        continue;
      }

      const existing = phone
        ? await prisma.customer.findFirst({ where: { phone } })
        : null;
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.customer.create({
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email,
          notes: parsed.data.note,
          nationalId: parsed.data.nationalId,
        },
      });
      created++;
    }

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'IMPORT_CUSTOMERS_XLSX',
      projectCode: 'SYSTEM',
      amountIqd: 0,
      meta: `created=${created},skipped=${skipped}`,
    });

    return NextResponse.json({ created, skipped, errors: errors.slice(0, 10) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'import_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
