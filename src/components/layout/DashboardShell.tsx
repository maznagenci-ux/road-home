'use client';

import { useState, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PermissionsProvider } from '@/features/access/PermissionsProvider';
import type { Dictionary } from '@/i18n/dictionaries';
import type { SessionUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

function SidebarSlot(props: {
  lang: string;
  t: Dictionary;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Suspense fallback={<aside className="w-[18rem] bg-sidebar" />}>
      <Sidebar {...props} />
    </Suspense>
  );
}

export function DashboardShell({
  lang,
  t,
  user,
  children,
}: {
  lang: string;
  t: Dictionary;
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PermissionsProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <div className={cn('hidden lg:flex shrink-0', collapsed && 'lg:w-[4.5rem]')}>
          <SidebarSlot lang={lang} t={t} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-sidebar/50 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
            <div className="absolute top-0 bottom-0 start-0 w-[17rem] z-10 shadow-2xl">
              <SidebarSlot lang={lang} t={t} collapsed={false} onToggle={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0 bg-background">
          <Header lang={lang} t={t} user={user} onMenuClick={() => setMobileOpen(true)} />
          <main className="rh-scroll flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[hsl(var(--background))]">{children}</main>
        </div>
      </div>
    </PermissionsProvider>
  );
}
