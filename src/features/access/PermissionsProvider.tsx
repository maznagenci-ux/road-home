'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type PermMap = Record<string, boolean>;

type PermissionsContextValue = {
  ready: boolean;
  role: string | null;
  permissions: PermMap;
  can: (key: string) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue>({
  ready: false,
  role: null,
  permissions: {},
  can: () => false,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermMap>({});

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetch('/api/access/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setRole(data.role ?? null);
          setPermissions(data.permissions ?? {});
        })
        .finally(() => {
          if (!cancelled) setReady(true);
        });
    };
    load();
    // Keep lastSeenAt fresh for Super Admin online/offline panel
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const value = useMemo<PermissionsContextValue>(
    () => ({
      ready,
      role,
      permissions,
      can: (key: string) => {
        if (role === 'SUPER_ADMIN') return true;
        return !!permissions[key];
      },
    }),
    [ready, role, permissions],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
