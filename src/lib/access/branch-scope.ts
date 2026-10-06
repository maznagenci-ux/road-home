import type { SessionUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/access/permissions';
import { prisma } from '@/lib/prisma';

/**
 * Super Admin sees all.
 * HQ Accountant (no branch) sees all.
 * Anyone with a branch — including branch accountant/manager/sales — is scoped.
 */
export function shouldScopeByBranch(session: SessionUser): boolean {
  if (isSuperAdmin(session.role)) return false;
  if (session.role === 'ACCOUNTANT' && !session.branchId) return false;
  return true;
}

/** Impossible id match when scoped user has no branch assigned. */
function noneWhere(): Record<string, unknown> {
  return { id: '__no_branch__' };
}

/** Prisma filter for Contract / Lease via dealEmployee.branchId */
export function dealEmployeeBranchWhere(session: SessionUser): Record<string, unknown> | undefined {
  if (!shouldScopeByBranch(session)) return undefined;
  if (!session.branchId) return noneWhere();
  return { dealEmployee: { branchId: session.branchId } };
}

/**
 * Receipts linked to contract or lease belonging to the user's branch.
 * Unlinked (manual) receipts are visible to branch staff so they can manage cash docs they create.
 */
export function receiptBranchWhere(session: SessionUser): Record<string, unknown> | undefined {
  if (!shouldScopeByBranch(session)) return undefined;
  if (!session.branchId) return noneWhere();
  const bid = session.branchId;
  return {
    OR: [
      { contract: { dealEmployee: { branchId: bid } } },
      { lease: { dealEmployee: { branchId: bid } } },
      { AND: [{ contractId: null }, { leaseId: null }] },
    ],
  };
}

export async function assertContractInBranch(
  session: SessionUser,
  contractId: string,
): Promise<boolean> {
  if (!shouldScopeByBranch(session)) return true;
  if (!session.branchId) return false;
  const row = await prisma.contract.findFirst({
    where: {
      id: contractId,
      dealEmployee: { branchId: session.branchId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function assertLeaseInBranch(
  session: SessionUser,
  leaseId: string,
): Promise<boolean> {
  if (!shouldScopeByBranch(session)) return true;
  if (!session.branchId) return false;
  const row = await prisma.lease.findFirst({
    where: {
      id: leaseId,
      dealEmployee: { branchId: session.branchId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function assertReceiptInBranch(
  session: SessionUser,
  receiptId: string,
): Promise<boolean> {
  if (!shouldScopeByBranch(session)) return true;
  if (!session.branchId) return false;
  const bid = session.branchId;
  const row = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      OR: [
        { contract: { dealEmployee: { branchId: bid } } },
        { lease: { dealEmployee: { branchId: bid } } },
        { AND: [{ contractId: null }, { leaseId: null }] },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function assertInstallmentInBranch(
  session: SessionUser,
  installmentId: string,
): Promise<boolean> {
  if (!shouldScopeByBranch(session)) return true;
  if (!session.branchId) return false;
  const row = await prisma.installment.findFirst({
    where: {
      id: installmentId,
      contract: { dealEmployee: { branchId: session.branchId } },
    },
    select: { id: true },
  });
  return Boolean(row);
}
