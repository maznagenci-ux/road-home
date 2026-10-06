import type { SessionUser } from '@/lib/auth';

export type DealEmployeeRef = {
  dealEmployeeId: string | null;
  dealEmployeeName: string | null;
};

/**
 * Deal is always attributed to the signed-in user who creates the contract/lease.
 * No manual staff picker — system stamps the maker automatically.
 */
export function dealEmployeeFromSession(session: SessionUser): DealEmployeeRef {
  return {
    dealEmployeeId: session.id,
    dealEmployeeName: session.name,
  };
}

/**
 * @deprecated Prefer dealEmployeeFromSession — kept for call-site compatibility.
 * Ignores client-supplied id; always stamps the session user when creating.
 */
export async function resolveDealEmployee(
  _dealEmployeeId?: string | null,
  session?: SessionUser | null,
): Promise<DealEmployeeRef | { error: 'NOT_FOUND' | 'CROSS_BRANCH' }> {
  if (!session?.id) {
    return { dealEmployeeId: null, dealEmployeeName: null };
  }
  return dealEmployeeFromSession(session);
}
