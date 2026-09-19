import { prisma } from '@/lib/prisma';

export type DealEmployeeRef = {
  dealEmployeeId: string | null;
  dealEmployeeName: string | null;
};

/** Resolve active user for deal attribution. Returns null id when cleared. Throws on unknown id. */
export async function resolveDealEmployee(
  dealEmployeeId?: string | null,
): Promise<DealEmployeeRef | { error: 'NOT_FOUND' }> {
  if (!dealEmployeeId?.trim()) {
    return { dealEmployeeId: null, dealEmployeeName: null };
  }
  const user = await prisma.user.findFirst({
    where: { id: dealEmployeeId.trim(), isActive: true },
    select: { id: true, name: true },
  });
  if (!user) return { error: 'NOT_FOUND' };
  return { dealEmployeeId: user.id, dealEmployeeName: user.name };
}
