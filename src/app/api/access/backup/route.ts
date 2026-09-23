import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-auth';
import { isSuperAdmin } from '@/lib/access/permissions';

export const dynamic = 'force-dynamic';

/**
 * File backup is disabled on hosted Postgres (Supabase / Netlify).
 * Use Supabase Dashboard → Database → Backups.
 */
export async function GET() {
  const auth = await requireApiPermission('VIEW_USERS');
  if ('error' in auth) return auth.error;
  if (!isSuperAdmin(auth.session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_ONLY' }, { status: 403 });
  }

  return NextResponse.json(
    {
      error: 'USE_SUPABASE_BACKUP',
      message:
        'Download backups from the Supabase dashboard (Database → Backups).',
    },
    { status: 501 },
  );
}

export async function POST() {
  const auth = await requireApiPermission('VIEW_USERS');
  if ('error' in auth) return auth.error;
  if (!isSuperAdmin(auth.session.role)) {
    return NextResponse.json({ error: 'SUPER_ADMIN_ONLY' }, { status: 403 });
  }
  return NextResponse.json({ items: [], provider: 'supabase' });
}
