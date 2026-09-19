import { copyFile, mkdir, readdir, stat, access, readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import { isSuperAdmin, logActivity } from '@/lib/access/permissions';

export const dynamic = 'force-dynamic';

function dbCandidates() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const raw = url.replace(/^file:/, '').replace(/^\.\//, '');
  return [
    path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw),
    path.join(process.cwd(), 'prisma', path.basename(raw)),
    path.join(process.cwd(), 'prisma', 'dev.db'),
    path.join(process.cwd(), 'dev.db'),
  ];
}

async function resolveDbPath() {
  for (const p of dbCandidates()) {
    try {
      await access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error('DB_NOT_FOUND');
}

function backupsDir() {
  return path.join(process.cwd(), 'data', 'backups');
}

/** Super Admin: download SQLite backup copy */
export async function GET() {
  const auth = await requireApiPermission('VIEW_USERS');
  if ('error' in auth) return auth.error;
  if (!isSuperAdmin(auth.session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_ONLY' }, { status: 403 });
  }

  try {
    await mkdir(backupsDir(), { recursive: true });
    const src = await resolveDbPath();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const destName = `road-home-${stamp}.db`;
    const dest = path.join(backupsDir(), destName);
    await copyFile(src, dest);

    const buf = await readFile(dest);
    await logActivity({
      userId: auth.session.id,
      userName: auth.session.name,
      action: 'DB_BACKUP',
      projectCode: 'SYSTEM',
      amountIqd: 0,
      meta: destName,
    });

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${destName}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'backup_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** List recent backup files */
export async function POST() {
  const auth = await requireApiPermission('VIEW_USERS');
  if ('error' in auth) return auth.error;
  if (!isSuperAdmin(auth.session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_ONLY' }, { status: 403 });
  }
  try {
    await mkdir(backupsDir(), { recursive: true });
    const files = await readdir(backupsDir());
    const detailed = await Promise.all(
      files
        .filter((f) => f.endsWith('.db'))
        .map(async (name) => {
          const s = await stat(path.join(backupsDir(), name));
          return { name, size: s.size, mtime: s.mtime.toISOString() };
        }),
    );
    detailed.sort((a, b) => b.mtime.localeCompare(a.mtime));
    return NextResponse.json({ items: detailed.slice(0, 20) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
