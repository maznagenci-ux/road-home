import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PermissionKey } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ASSIGNABLE_ROLES,
  DO_PERMISSIONS,
  getEffectivePermissions,
  getRoleDefaults,
  isSuperAdmin,
  logActivity,
  PERMISSION_KEYS,
  replaceUserPermissions,
  SEE_PERMISSIONS,
  toStoredRole,
} from '@/lib/access/permissions';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(session.role) && !(await canManage(session.id, session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  const matrix = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: toStoredRole(u.role),
      isActive: u.isActive,
      permissions: await getEffectivePermissions(u.id, u.role),
    })),
  );

  return NextResponse.json({
    permissionKeys: PERMISSION_KEYS,
    seeKeys: SEE_PERMISSIONS,
    doKeys: DO_PERMISSIONS,
    roleDefaults: Object.fromEntries(ASSIGNABLE_ROLES.map((r) => [r, getRoleDefaults(r)])),
    users: matrix,
  });
}

const patchSchema = z.object({
  userId: z.string().min(1),
  key: z.string(),
  granted: z.boolean(),
});

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'VIEW_ONLY', 'SITE_SUPERVISOR']),
});

const bulkSchema = z.object({
  userId: z.string().min(1),
  permissions: z.record(z.string(), z.boolean()),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(session.role) && !(await canManage(session.id, session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action as string | undefined;

  try {
    if (action === 'setRole') {
      const data = roleSchema.parse(body);
      const role = toStoredRole(data.role);
      const user = await prisma.user.update({
        where: { id: data.userId },
        data: { role },
      });
      await prisma.userPermission.deleteMany({ where: { userId: user.id } });
      await logActivity({
        userId: session.id,
        userName: session.name,
        action: `ROLE_CHANGE → ${role}`,
        meta: JSON.stringify({ targetUserId: user.id, email: user.email }),
      });
      return NextResponse.json({
        user: {
          id: user.id,
          role,
          permissions: await getEffectivePermissions(user.id, role),
        },
      });
    }

    if (action === 'setPermissions') {
      const data = bulkSchema.parse(body);
      const target = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!target) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      if (isSuperAdmin(target.role)) {
        return NextResponse.json({
          permissions: await getEffectivePermissions(target.id, target.role),
        });
      }
      const map = {} as Record<PermissionKey, boolean>;
      for (const key of PERMISSION_KEYS) map[key] = !!data.permissions[key];
      await replaceUserPermissions(data.userId, map);
      await logActivity({
        userId: session.id,
        userName: session.name,
        action: 'PERMS_BULK_SET',
        meta: JSON.stringify({ targetUserId: data.userId }),
      });
      return NextResponse.json({
        permissions: await getEffectivePermissions(data.userId, target.role),
      });
    }

    const data = patchSchema.parse(body);
    if (!PERMISSION_KEYS.includes(data.key as PermissionKey)) {
      return NextResponse.json({ error: 'INVALID_KEY' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!target) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (isSuperAdmin(target.role)) {
      return NextResponse.json({ error: 'SUPER_ADMIN_LOCKED' }, { status: 400 });
    }

    const row = await prisma.userPermission.upsert({
      where: { userId_key: { userId: data.userId, key: data.key as PermissionKey } },
      create: { userId: data.userId, key: data.key as PermissionKey, granted: data.granted },
      update: { granted: data.granted },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: data.granted ? `GRANT_${data.key}` : `REVOKE_${data.key}`,
      meta: JSON.stringify({ targetUserId: data.userId }),
    });

    return NextResponse.json({ permission: row });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

async function canManage(userId: string, role: string) {
  const { hasPermission } = await import('@/lib/access/permissions');
  return hasPermission(userId, role, 'MANAGE_USERS');
}
