'use client';

import { useCallback, useEffect, useState } from 'react';
import { Circle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type PresenceItem = {
  id: string;
  name: string;
  phone: string;
  role: string;
  branchName: string | null;
  branchCode: string | null;
  lastSeenAt: string | null;
  online: boolean;
};

export function SettingsStaffPresencePanel({ t }: { t: Dictionary }) {
  const s = t.pages.settings;
  const [items, setItems] = useState<PresenceItem[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const res = await fetch('/api/access/presence');
    if (res.status === 403) {
      setError(s.presenceForbidden ?? 'Super Admin only');
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(t.common.error);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(data.items ?? []);
    setOnlineCount(data.onlineCount ?? 0);
    setOfflineCount(data.offlineCount ?? 0);
    setLoading(false);
  }, [s.presenceForbidden, t.common.error]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  const roleLabel = (role: string) =>
    t.roles[role as keyof typeof t.roles] ?? role;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {s.presenceTitle ?? 'Staff online status'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {s.presenceDesc ?? 'See which staff are currently online or offline'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {s.presenceRefresh ?? 'Refresh'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mt-4 mb-5 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1">
          <Wifi className="h-3.5 w-3.5" />
          {s.presenceOnline ?? 'Online'}: {onlineCount}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-3 py-1">
          <WifiOff className="h-3.5 w-3.5" />
          {s.presenceOffline ?? 'Offline'}: {offlineCount}
        </span>
      </div>

      {error ? <p className="text-sm text-rose-600 mb-3">{error}</p> : null}

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.common.loading}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{s.presenceEmpty ?? 'No staff found'}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {items.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-card hover:bg-muted/30"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground dir-ltr" dir="ltr">
                  {u.phone}
                  {u.branchName ? ` · ${u.branchName}` : ''}
                  {' · '}
                  {roleLabel(u.role)}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0',
                  u.online
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Circle
                  className={cn('h-2 w-2 fill-current', u.online ? 'text-emerald-500' : 'text-muted-foreground')}
                />
                {u.online ? s.presenceOnline ?? 'Online' : s.presenceOffline ?? 'Offline'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
