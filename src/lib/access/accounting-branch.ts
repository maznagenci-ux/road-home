import type { Prisma } from '@prisma/client';
import type { SessionUser } from '@/lib/auth';
import { shouldScopeByBranch } from '@/lib/access/branch-scope';
import { prisma } from '@/lib/prisma';

/** Sentinel: scoped user with no branch — match nothing. */
const NONE = '__no_branch__';

/**
 * Resolve which branch books to show.
 * - Branch staff → always their branch
 * - Super Admin / HQ → `all` (null) or a specific branch id from query/body
 */
export function resolveAccountingBranchScope(
  session: SessionUser,
  requested: string | null | undefined,
): string | null {
  if (shouldScopeByBranch(session)) {
    return session.branchId || NONE;
  }
  if (!requested || requested === 'all') return null;
  return requested;
}

/** Prisma filter for LedgerTransaction.branchId (null = combined / all). */
export function ledgerBranchWhere(
  branchScope: string | null,
): Prisma.LedgerTransactionWhereInput {
  if (!branchScope) return {};
  return { branchId: branchScope };
}

/** Prisma filter for Voucher.branchId (null = combined / all). */
export function voucherBranchWhere(
  branchScope: string | null,
): Prisma.VoucherWhereInput {
  if (!branchScope) return {};
  return { branchId: branchScope };
}

/**
 * Stamp branch on new posts.
 * Explicit `branchId` wins (Super Admin picking a branch).
 * Else use creator's branch. Else null (HQ / combined books).
 */
export async function resolveWriteBranchId(opts: {
  session?: SessionUser | null;
  explicit?: string | null;
  createdById?: string | null;
}): Promise<string | null> {
  const { session, explicit, createdById } = opts;

  if (session && shouldScopeByBranch(session)) {
    return session.branchId || null;
  }

  if (explicit !== undefined && explicit !== null && explicit !== '' && explicit !== 'all') {
    return explicit;
  }
  if (explicit === null) return null;

  if (session?.branchId) return session.branchId;

  if (createdById) {
    const u = await prisma.user.findUnique({
      where: { id: createdById },
      select: { branchId: true },
    });
    return u?.branchId ?? null;
  }

  return null;
}
