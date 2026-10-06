'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePermissions } from '@/features/access/PermissionsProvider';

export type BranchOption = { id: string; name: string; code: string };

const STORAGE_KEY = 'accounting-branch-filter';

/** Super Admin / HQ: pick one branch or combined (all). Branch staff: hidden. */
export function useAccountingBranchFilter() {
  const { role, ready } = usePermissions();
  const canPick =
    ready && (role === 'SUPER_ADMIN' || role === 'ACCOUNTANT' || role === 'OWNER');
  const [branchId, setBranchIdState] = useState<string>('all');
  const [branches, setBranches] = useState<BranchOption[]>([]);

  useEffect(() => {
    if (!canPick) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setBranchIdState(saved);
    } catch {
      // ignore
    }
  }, [canPick]);

  const setBranchId = useCallback((id: string) => {
    setBranchIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const withBranchParam = useCallback(
    (url: string) => {
      if (!canPick || branchId === 'all') return url;
      const q = `branchId=${encodeURIComponent(branchId)}`;
      return url.includes('?') ? `${url}&${q}` : `${url}?${q}`;
    },
    [canPick, branchId],
  );

  /** body.branchId for writes — null means HQ/unassigned when SA picks "all" */
  const writeBranchId = useCallback((): string | null | undefined => {
    if (!canPick) return undefined;
    if (branchId === 'all') return null;
    return branchId;
  }, [canPick, branchId]);

  return {
    canPick,
    branchId,
    setBranchId,
    branches,
    setBranches,
    withBranchParam,
    writeBranchId,
  };
}

export function AccountingBranchFilterBar({
  canPick,
  branchId,
  setBranchId,
  branches,
}: {
  canPick: boolean;
  branchId: string;
  setBranchId: (id: string) => void;
  branches: BranchOption[];
}) {
  if (!canPick || branches.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
      <label className="text-xs text-muted-foreground shrink-0">حیساباتی لق:</label>
      <select
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary/50 min-w-[10rem]"
        value={branchId}
        onChange={(e) => setBranchId(e.target.value)}
      >
        <option value="all">کۆی گشتی (هەموو لقەکان)</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.code})
          </option>
        ))}
      </select>
    </div>
  );
}
