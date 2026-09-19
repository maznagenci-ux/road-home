import type { PermissionKey, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Ordered keys used by APIs and Super Admin UI. */
export const PERMISSION_KEYS: PermissionKey[] = [
  'VIEW_DASHBOARD',
  'VIEW_ACCOUNTING',
  'VIEW_PROJECTS',
  'VIEW_PROPERTIES',
  'VIEW_CONTRACTS',
  'VIEW_RENTALS',
  'VIEW_ANKET',
  'VIEW_REPORTS',
  'VIEW_USERS',
  'VIEW_CASH_VAULT',
  'VIEW_PAYABLES',
  'VIEW_CONSTRUCTION_COST',
  'VIEW_INVENTORY',
  'ADD_VOUCHERS',
  'EDIT_TRANSACTIONS',
  'REVERSE_VOUCHERS',
  'CHANGE_FX_RATE',
  'MANAGE_CONTRACTS',
  'MANAGE_RENTALS',
  'MANAGE_ANKET',
  'MANAGE_PROJECTS',
  'MANAGE_USERS',
  'EXPORT_FINANCE',
  'APPROVE_FINANCE',
  'MANAGE_PROJECT_BUDGET',
  'MANAGE_INVENTORY',
  'ISSUE_MATERIALS',
  'APPROVE_WASTE',
];

export const SEE_PERMISSIONS: PermissionKey[] = [
  'VIEW_DASHBOARD',
  'VIEW_ACCOUNTING',
  'VIEW_PROJECTS',
  'VIEW_PROPERTIES',
  'VIEW_CONTRACTS',
  'VIEW_RENTALS',
  'VIEW_ANKET',
  'VIEW_REPORTS',
  'VIEW_USERS',
  'VIEW_CASH_VAULT',
  'VIEW_PAYABLES',
  'VIEW_CONSTRUCTION_COST',
  'VIEW_INVENTORY',
];

export const DO_PERMISSIONS: PermissionKey[] = [
  'ADD_VOUCHERS',
  'EDIT_TRANSACTIONS',
  'REVERSE_VOUCHERS',
  'CHANGE_FX_RATE',
  'MANAGE_CONTRACTS',
  'MANAGE_RENTALS',
  'MANAGE_ANKET',
  'MANAGE_PROJECTS',
  'MANAGE_USERS',
  'EXPORT_FINANCE',
  'APPROVE_FINANCE',
  'MANAGE_PROJECT_BUDGET',
  'MANAGE_INVENTORY',
  'ISSUE_MATERIALS',
  'APPROVE_WASTE',
];

export const ASSIGNABLE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ACCOUNTANT',
  'SALESPERSON',
  'VIEW_ONLY',
];

export const VOUCHER_LOCK_HOURS = 12;

function fill(value: boolean): Record<PermissionKey, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, value])) as Record<
    PermissionKey,
    boolean
  >;
}

function withDefaults(
  overrides: Partial<Record<PermissionKey, boolean>>,
): Record<PermissionKey, boolean> {
  return { ...fill(false), ...overrides };
}

/** Default grants by role before per-user overrides. */
export const ROLE_DEFAULTS: Record<UserRole, Record<PermissionKey, boolean>> = {
  SUPER_ADMIN: fill(true),
  ACCOUNTANT: withDefaults({
    VIEW_DASHBOARD: true,
    VIEW_ACCOUNTING: true,
    VIEW_PROJECTS: true,
    VIEW_PROPERTIES: true,
    VIEW_CONTRACTS: true,
    VIEW_RENTALS: true,
    VIEW_ANKET: true,
    VIEW_REPORTS: true,
    VIEW_USERS: false,
    VIEW_CASH_VAULT: true,
    VIEW_PAYABLES: true,
    VIEW_CONSTRUCTION_COST: true,
    VIEW_INVENTORY: true,
    ADD_VOUCHERS: true,
    EDIT_TRANSACTIONS: true,
    REVERSE_VOUCHERS: false,
    CHANGE_FX_RATE: false,
    MANAGE_CONTRACTS: false,
    MANAGE_RENTALS: true,
    MANAGE_ANKET: true,
    MANAGE_PROJECTS: false,
    MANAGE_USERS: false,
    EXPORT_FINANCE: true,
    APPROVE_FINANCE: false,
    MANAGE_PROJECT_BUDGET: true,
    MANAGE_INVENTORY: true,
    ISSUE_MATERIALS: true,
    APPROVE_WASTE: true,
  }),
  SALESPERSON: withDefaults({
    VIEW_DASHBOARD: true,
    VIEW_ACCOUNTING: false,
    VIEW_PROJECTS: true,
    VIEW_PROPERTIES: true,
    VIEW_CONTRACTS: true,
    VIEW_RENTALS: true,
    VIEW_ANKET: true,
    VIEW_REPORTS: false,
    VIEW_USERS: false,
    VIEW_CASH_VAULT: false,
    VIEW_PAYABLES: true,
    VIEW_CONSTRUCTION_COST: true,
    VIEW_INVENTORY: false,
    ADD_VOUCHERS: false,
    EDIT_TRANSACTIONS: false,
    REVERSE_VOUCHERS: false,
    CHANGE_FX_RATE: false,
    MANAGE_CONTRACTS: true,
    MANAGE_RENTALS: true,
    MANAGE_ANKET: true,
    MANAGE_PROJECTS: false,
    MANAGE_USERS: false,
  }),
  SITE_SUPERVISOR: withDefaults({
    VIEW_DASHBOARD: true,
    VIEW_ACCOUNTING: false,
    VIEW_PROJECTS: true,
    VIEW_PROPERTIES: true,
    VIEW_CONTRACTS: true,
    VIEW_RENTALS: true,
    VIEW_ANKET: true,
    VIEW_REPORTS: false,
    VIEW_USERS: false,
    VIEW_CASH_VAULT: false,
    VIEW_PAYABLES: true,
    VIEW_CONSTRUCTION_COST: true,
    VIEW_INVENTORY: true,
    ADD_VOUCHERS: true,
    EDIT_TRANSACTIONS: false,
    REVERSE_VOUCHERS: false,
    CHANGE_FX_RATE: false,
    MANAGE_CONTRACTS: false,
    MANAGE_RENTALS: false,
    MANAGE_ANKET: false,
    MANAGE_PROJECTS: true,
    MANAGE_USERS: false,
    MANAGE_PROJECT_BUDGET: false,
    MANAGE_INVENTORY: false,
    ISSUE_MATERIALS: true,
    APPROVE_WASTE: false,
  }),
  VIEW_ONLY: withDefaults({
    VIEW_DASHBOARD: true,
    VIEW_ACCOUNTING: true,
    VIEW_PROJECTS: true,
    VIEW_PROPERTIES: true,
    VIEW_CONTRACTS: true,
    VIEW_RENTALS: true,
    VIEW_ANKET: true,
    VIEW_REPORTS: true,
    VIEW_USERS: false,
    VIEW_CASH_VAULT: false,
    VIEW_PAYABLES: true,
    VIEW_CONSTRUCTION_COST: true,
    VIEW_INVENTORY: true,
    ADD_VOUCHERS: false,
    EDIT_TRANSACTIONS: false,
    REVERSE_VOUCHERS: false,
    CHANGE_FX_RATE: false,
    MANAGE_CONTRACTS: false,
    MANAGE_RENTALS: false,
    MANAGE_ANKET: false,
    MANAGE_PROJECTS: false,
    MANAGE_USERS: false,
  }),
};

export function normalizeRole(role: string): UserRole {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return 'SUPER_ADMIN';
    case 'ACCOUNTANT':
      return 'ACCOUNTANT';
    case 'SALESPERSON':
    case 'SITE_SUPERVISOR':
    case 'MANAGER':
      return 'SALESPERSON';
    case 'VIEW_ONLY':
    case 'USER':
    default:
      return 'VIEW_ONLY';
  }
}

/** Role written to DB from Super Admin UI (legacy SITE_SUPERVISOR → SALESPERSON). */
export function toStoredRole(role: string): UserRole {
  const n = normalizeRole(role);
  if (n === 'SALESPERSON') return 'SALESPERSON';
  return n;
}

export function isSuperAdmin(role: string) {
  return normalizeRole(role) === 'SUPER_ADMIN';
}

export function getRoleDefaults(role: string): Record<PermissionKey, boolean> {
  return { ...ROLE_DEFAULTS[normalizeRole(role)] };
}

export async function getEffectivePermissions(userId: string, role: string) {
  const base = getRoleDefaults(role);
  const overrides = await prisma.userPermission.findMany({ where: { userId } });
  for (const o of overrides) {
    base[o.key] = o.granted;
  }
  if (isSuperAdmin(role)) {
    for (const key of PERMISSION_KEYS) base[key] = true;
  }
  return base;
}

export async function hasPermission(userId: string, role: string, key: PermissionKey) {
  if (isSuperAdmin(role)) return true;
  const perms = await getEffectivePermissions(userId, role);
  return !!perms[key];
}

/** Replace all per-user overrides with an explicit map (Super Admin choices). */
export async function replaceUserPermissions(
  userId: string,
  permissions: Partial<Record<PermissionKey, boolean>>,
) {
  await prisma.userPermission.deleteMany({ where: { userId } });
  const rows = PERMISSION_KEYS.map((key) => ({
    userId,
    key,
    granted: !!permissions[key],
  }));
  if (rows.length) {
    await prisma.userPermission.createMany({ data: rows });
  }
}

export function isVoucherTimeLocked(createdAt: Date, unlockApprovedAt?: Date | null) {
  if (unlockApprovedAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > VOUCHER_LOCK_HOURS * 60 * 60 * 1000;
}

export async function logActivity(input: {
  userId?: string | null;
  userName: string;
  action: string;
  projectCode?: string | null;
  amountIqd?: number | null;
  meta?: string | null;
}) {
  await prisma.activityLog.create({
    data: {
      userId: input.userId ?? null,
      userName: input.userName,
      action: input.action,
      projectCode: input.projectCode ?? null,
      amountIqd: input.amountIqd ?? null,
      meta: input.meta ?? null,
    },
  });
}

/** Map sidebar / route prefixes to required SEE permission. */
export function navPermissionForPath(pathname: string, lang: string): PermissionKey | null {
  const base = `/${lang}`;
  const rest = pathname === base || pathname === `${base}/` ? '' : pathname.slice(base.length);
  if (!rest || rest === '/') return 'VIEW_DASHBOARD';
  if (rest.startsWith('/accounting')) return 'VIEW_ACCOUNTING';
  if (rest.startsWith('/inventory')) return 'VIEW_INVENTORY';
  if (rest.startsWith('/projects')) return 'VIEW_PROJECTS';
  if (
    rest.startsWith('/properties') ||
    rest.startsWith('/houses') ||
    rest.startsWith('/owners')
  ) {
    return 'VIEW_PROPERTIES';
  }
  if (
    rest.startsWith('/customers') ||
    rest.startsWith('/suppliers') ||
    rest.startsWith('/contracts') ||
    rest.startsWith('/installments') ||
    rest.startsWith('/receipts')
  ) {
    return 'VIEW_CONTRACTS';
  }
  if (rest.startsWith('/rentals')) return 'VIEW_RENTALS';
  if (rest.startsWith('/anket')) return 'VIEW_ANKET';
  if (rest.startsWith('/support')) return 'VIEW_CONTRACTS';
  if (rest.startsWith('/places')) return 'VIEW_PROPERTIES';
  if (rest.startsWith('/reports')) return 'VIEW_REPORTS';
  if (rest.startsWith('/users') || rest.startsWith('/access')) return 'VIEW_USERS';
  if (rest.startsWith('/office')) return 'VIEW_ACCOUNTING';
  return null;
}
