import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import type { PermissionKey } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { normalizeLoginPhone } from '@/lib/phone';
import {
  ASSIGNABLE_ROLES,
  getEffectivePermissions,
  getRoleDefaults,
  isBranchScopedRole,
  isSuperAdmin,
  logActivity,
  PERMISSION_KEYS,
  replaceUserPermissions,
  toStoredRole,
} from '@/lib/access/permissions';

const permRecord = z.record(z.string(), z.boolean()).optional();

const phoneField = z
  .string()
  .min(1)
  .transform((v, ctx) => {
    const n = normalizeLoginPhone(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'INVALID_PHONE' });
      return z.NEVER;
    }
    return n;
  });

const ROLE_ENUM = z.enum([
  'SUPER_ADMIN',
  'ACCOUNTANT',
  'SALESPERSON',
  'VIEW_ONLY',
  'SITE_SUPERVISOR',
  'BRANCH_MANAGER',
  'BRANCH_ACCOUNTANT',
  'BRANCH_SALES',
]);

const createSchema = z.object({
  name: z.string().min(2).max(120),
  phone: phoneField,
  password: z.string().min(6).max(100),
  role: ROLE_ENUM,
  isActive: z.boolean().optional().default(true),
  branchId: z.string().min(1).nullable().optional(),
  permissions: permRecord,
});

const updateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  phone: phoneField.optional(),
  password: z.string().min(6).max(100).optional(),
  role: ROLE_ENUM.optional(),
  isActive: z.boolean().optional(),
  branchId: z.string().min(1).nullable().optional(),
  permissions: permRecord,
});

function sanitizePermissions(input?: Record<string, boolean>) {
  if (!input) return null;
  const out = {} as Record<PermissionKey, boolean>;
  for (const key of PERMISSION_KEYS) {
    out[key] = !!input[key];
  }
  return out;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await hasManageUsers(session.id, session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true, isHq: true } },
    },
  });

  const items = await Promise.all(
    users.map(async (u) => ({
      ...u,
      role: toStoredRole(u.role),
      permissions: await getEffectivePermissions(u.id, u.role),
    })),
  );

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: [{ isHq: 'desc' }, { code: 'asc' }],
    select: { id: true, name: true, code: true, isHq: true },
    take: 500,
  });

  return NextResponse.json({
    items,
    branches,
    permissionKeys: PERMISSION_KEYS,
    roleDefaults: Object.fromEntries(
      ASSIGNABLE_ROLES.map((r) => [r, getRoleDefaults(r)]),
    ),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await hasManageUsers(session.id, session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await req.json());
    const role = toStoredRole(body.role);
    const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (existing) {
      return NextResponse.json({ error: 'PHONE_EXISTS' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const branchId =
      body.branchId === undefined ? undefined : body.branchId === null || body.branchId === '' ? null : body.branchId;
    if (isBranchScopedRole(role) && !branchId) {
      return NextResponse.json({ error: 'BRANCH_REQUIRED' }, { status: 400 });
    }
    if (branchId) {
      const br = await prisma.branch.findFirst({ where: { id: branchId, isActive: true } });
      if (!br) return NextResponse.json({ error: 'INVALID_BRANCH' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        phone: body.phone,
        passwordHash,
        role,
        isActive: body.isActive,
        ...(branchId !== undefined ? { branchId } : {}),
      },
      include: { branch: { select: { id: true, name: true, code: true, isHq: true } } },
    });

    const perms =
      sanitizePermissions(body.permissions) ??
      (isSuperAdmin(role) ? getRoleDefaults(role) : getRoleDefaults(role));

    if (isSuperAdmin(role)) {
      await replaceUserPermissions(user.id, getRoleDefaults(role));
    } else {
      await replaceUserPermissions(user.id, perms);
    }

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'USER_CREATE',
      meta: JSON.stringify({
        targetUserId: user.id,
        phone: user.phone,
        role,
        branchId: user.branchId,
      }),
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role,
        isActive: user.isActive,
        branchId: user.branchId,
        branch: user.branch,
        permissions: await getEffectivePermissions(user.id, role),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await hasManageUsers(session.id, session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const body = updateSchema.parse(await req.json());
    const target = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!target) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    if (body.phone && body.phone !== target.phone) {
      const clash = await prisma.user.findUnique({ where: { phone: body.phone } });
      if (clash) return NextResponse.json({ error: 'PHONE_EXISTS' }, { status: 409 });
    }

    const role = body.role ? toStoredRole(body.role) : undefined;
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;
    const branchId =
      body.branchId === undefined
        ? undefined
        : body.branchId === null || body.branchId === ''
          ? null
          : body.branchId;
    if (branchId) {
      const br = await prisma.branch.findFirst({ where: { id: branchId, isActive: true } });
      if (!br) return NextResponse.json({ error: 'INVALID_BRANCH' }, { status: 400 });
    }
    const nextRole = role ?? target.role;
    const nextBranch = branchId !== undefined ? branchId : target.branchId;
    if (isBranchScopedRole(nextRole) && !nextBranch) {
      return NextResponse.json({ error: 'BRANCH_REQUIRED' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: body.userId },
      data: {
        name: body.name?.trim(),
        phone: body.phone,
        role,
        isActive: body.isActive,
        passwordHash,
        ...(branchId !== undefined ? { branchId } : {}),
      },
      include: { branch: { select: { id: true, name: true, code: true, isHq: true } } },
    });

    if (body.permissions) {
      const perms = sanitizePermissions(body.permissions)!;
      if (isSuperAdmin(user.role)) {
        await replaceUserPermissions(user.id, getRoleDefaults(user.role));
      } else {
        await replaceUserPermissions(user.id, perms);
      }
    } else if (role) {
      await prisma.userPermission.deleteMany({ where: { userId: user.id } });
    }

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: 'USER_UPDATE',
      meta: JSON.stringify({
        targetUserId: user.id,
        phone: user.phone,
        role: user.role,
        branchId: user.branchId,
      }),
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: toStoredRole(user.role),
        isActive: user.isActive,
        branchId: user.branchId,
        branch: user.branch,
        permissions: await getEffectivePermissions(user.id, user.role),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

async function hasManageUsers(userId: string, role: string) {
  if (isSuperAdmin(role)) return true;
  const { hasPermission } = await import('@/lib/access/permissions');
  return hasPermission(userId, role, 'MANAGE_USERS');
}
