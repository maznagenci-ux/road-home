import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import { isSuperAdmin } from '@/lib/access/permissions';

export const dynamic = 'force-dynamic';

function isPostgres() {
  const url = process.env.DATABASE_URL ?? '';
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

/**
 * Super-admin DB backup.
 * - Local Postgres on Hostinger: streams `pg_dump`
 * - Legacy SQLite file: copies prisma/dev.db
 */
export async function GET() {
  const auth = await requireApiPermission('VIEW_USERS');
  if ('error' in auth) return auth.error;
  if (!isSuperAdmin(auth.session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_ONLY' }, { status: 403 });
  }

  if (isPostgres()) {
    try {
      const { spawn } = await import('child_process');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const destName = `road-home-${stamp}.sql`;
      const child = spawn(
        'pg_dump',
        ['--no-owner', '--no-acl', process.env.DATABASE_URL as string],
        { env: process.env },
      );
      const chunks: Buffer[] = [];
      let errText = '';
      await new Promise<void>((resolve, reject) => {
        child.stdout.on('data', (c: Buffer) => chunks.push(c));
        child.stderr.on('data', (c: Buffer) => {
          errText += c.toString();
        });
        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(errText || `pg_dump_exit_${code}`));
        });
      });
      const buf = Buffer.concat(chunks);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': `attachment; filename="${destName}"`,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'backup_failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  try {
    const { copyFile, mkdir, access, readFile } = await import('fs/promises');
    const path = await import('path');
    const cwd = /* turbopackIgnore: true */ process.cwd();
    const dbPath = path.join(cwd, 'prisma', 'dev.db');
    await access(dbPath);
    const backupDir = path.join(cwd, 'data', 'backups');
    await mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const destName = `road-home-${stamp}.db`;
    const dest = path.join(backupDir, destName);
    await copyFile(dbPath, dest);
    const buf = await readFile(dest);
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

export async function POST() {
  const auth = await requireApiPermission('VIEW_USERS');
  if ('error' in auth) return auth.error;
  if (!isSuperAdmin(auth.session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_ONLY' }, { status: 403 });
  }

  if (isPostgres()) {
    return NextResponse.json({ items: [], provider: 'hostinger-postgres' });
  }

  try {
    const { mkdir, readdir, stat } = await import('fs/promises');
    const path = await import('path');
    const cwd = /* turbopackIgnore: true */ process.cwd();
    const backupDir = path.join(cwd, 'data', 'backups');
    await mkdir(backupDir, { recursive: true });
    const files = await readdir(backupDir);
    const detailed = await Promise.all(
      files
        .filter((f) => f.endsWith('.db'))
        .map(async (name) => {
          const s = await stat(path.join(backupDir, name));
          return { name, size: s.size, mtime: s.mtime.toISOString() };
        }),
    );
    detailed.sort((a, b) => b.mtime.localeCompare(a.mtime));
    return NextResponse.json({ items: detailed.slice(0, 20) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
