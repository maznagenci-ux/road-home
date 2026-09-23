import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import path from 'path';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/access/permissions';
import { getSupabaseAdmin, RECEIPTS_BUCKET } from '@/lib/supabase';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function extFor(mime: string, original: string) {
  const fromName = path.extname(original).toLowerCase();
  if (fromName && fromName.length <= 6) return fromName;
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  return '.jpg';
}

async function ensureBucket() {
  const supabase = getSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === RECEIPTS_BUCKET)) return;

  await supabase.storage.createBucket(RECEIPTS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED],
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await hasPermission(session.id, session.role, 'ADD_VOUCHERS');
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'FILE_SIZE' }, { status: 400 });
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: 'FILE_TYPE' }, { status: 400 });
    }

    await ensureBucket();

    const buf = Buffer.from(await file.arrayBuffer());
    const stamp = Date.now().toString(36);
    const rand = randomBytes(4).toString('hex');
    const ext = extFor(mime, file.name);
    const objectPath = `receipts/${stamp}-${rand}${ext}`;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(objectPath, buf, { contentType: mime, upsert: false });

    if (error) {
      return NextResponse.json({ error: 'UPLOAD_FAILED', detail: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(objectPath);
    return NextResponse.json({
      url: data.publicUrl,
      name: file.name,
      size: file.size,
      mime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UPLOAD_FAILED';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
