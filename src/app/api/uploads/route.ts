import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/access/permissions';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // ~40 MB ≈ 1 min compressed
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const OTHER_TYPES = new Set(['application/pdf']);

function extFor(mime: string, original: string) {
  const fromName = path.extname(original).toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'video/webm') return '.webm';
  if (mime === 'video/quicktime') return '.mov';
  if (mime === 'video/mp4') return '.mp4';
  return '.jpg';
}

function uploadsRoot() {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (configured) return configured;
  return path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'uploads');
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed =
    (await hasPermission(session.id, session.role, 'ADD_VOUCHERS')) ||
    (await hasPermission(session.id, session.role, 'MANAGE_PROJECTS'));
  if (!allowed) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    }
    const mime = file.type || 'application/octet-stream';
    const isVideo = VIDEO_TYPES.has(mime);
    const isImage = IMAGE_TYPES.has(mime);
    const isOther = OTHER_TYPES.has(mime);
    if (!isVideo && !isImage && !isOther) {
      return NextResponse.json({ error: 'FILE_TYPE' }, { status: 400 });
    }
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json(
        { error: 'FILE_SIZE', maxMb: Math.round(maxBytes / (1024 * 1024)) },
        { status: 400 },
      );
    }

    const folderRaw = String(form.get('folder') || 'receipts').toLowerCase();
    const relDir =
      folderRaw === 'houses' || folderRaw === 'videos' ? 'houses' : 'receipts';

    const buf = Buffer.from(await file.arrayBuffer());
    const stamp = Date.now().toString(36);
    const rand = randomBytes(4).toString('hex');
    const ext = extFor(mime, file.name);
    const fileName = `${stamp}-${rand}${ext}`;
    const dir = path.join(uploadsRoot(), relDir);
    await mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
    const abs = path.join(dir, fileName);
    await writeFile(/* turbopackIgnore: true */ abs, buf);

    const publicPath = `/uploads/${relDir}/${fileName}`;
    return NextResponse.json({
      url: publicPath,
      name: file.name,
      size: file.size,
      mime,
      kind: isVideo ? 'video' : isImage ? 'image' : 'file',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UPLOAD_FAILED';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
