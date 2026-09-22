'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  Activity,
  Lock,
  Check,
  Loader2,
  UserPlus,
  Users,
  Pencil,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { UserFormModal, type EditableUser, type PermMap } from './UserFormModal';
import type { Dictionary } from '@/i18n/dictionaries';

type MatrixUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  permissions: Record<string, boolean>;
};

type ActivityRow = {
  id: string;
  userName: string;
  action: string;
  projectCode: string | null;
  amountIqd: number | null;
  createdAt: string;
};

const ROLES = ['SUPER_ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'VIEW_ONLY'] as const;

export function AccessControlView({ t, lang }: { t: Dictionary; lang: string }) {
  const [tab, setTab] = useState<'users' | 'matrix' | 'activity' | 'locks'>('users');
  const [users, setUsers] = useState<MatrixUser[]>([]);
  const [seeKeys, setSeeKeys] = useState<string[]>([]);
  const [doKeys, setDoKeys] = useState<string[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<Record<string, PermMap>>({});
  const [logs, setLogs] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<EditableUser | null>(null);

  const loadMatrix = useCallback(async () => {
    setError('');
    const res = await fetch('/api/access/matrix');
    if (res.status === 403) {
      setError(t.pages.access.forbidden);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(t.common.error);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUsers(data.users ?? []);
    setKeys(data.permissionKeys ?? []);
    setSeeKeys(data.seeKeys ?? []);
    setDoKeys(data.doKeys ?? []);
    setRoleDefaults(data.roleDefaults ?? {});
    setLoading(false);
  }, [t.common.error, t.pages.access.forbidden]);

  const loadActivity = useCallback(async () => {
    const res = await fetch('/api/access/activity?limit=150');
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
    }
  }, []);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  useEffect(() => {
    if (tab === 'activity') void loadActivity();
  }, [tab, loadActivity]);

  const toggle = async (userId: string, key: string, granted: boolean) => {
    setSaving(`${userId}:${key}`);
    const res = await fetch('/api/access/matrix', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, key, granted }),
    });
    setSaving(null);
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, permissions: { ...u.permissions, [key]: granted } } : u,
        ),
      );
    }
  };

  const setRole = async (userId: string, role: string) => {
    setSaving(`${userId}:role`);
    const res = await fetch('/api/access/matrix', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setRole', userId, role }),
    });
    setSaving(null);
    if (res.ok) await loadMatrix();
  };

  const toggleActive = async (user: MatrixUser) => {
    setSaving(`${user.id}:active`);
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, isActive: !user.isActive }),
    });
    setSaving(null);
    if (res.ok) await loadMatrix();
  };

  const openCreate = () => {
    setModalMode('create');
    setEditing({
      name: '',
      phone: '',
      role: 'SALESPERSON',
      isActive: true,
      permissions: { ...(roleDefaults.SALESPERSON ?? {}) },
    });
    setModalOpen(true);
  };

  const openEdit = (u: MatrixUser) => {
    setModalMode('edit');
    setEditing({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      permissions: { ...u.permissions },
    });
    setModalOpen(true);
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: t.roles.SUPER_ADMIN,
      ACCOUNTANT: t.roles.ACCOUNTANT,
      SALESPERSON: t.roles.SALESPERSON,
      SITE_SUPERVISOR: t.roles.SALESPERSON,
      VIEW_ONLY: t.roles.VIEW_ONLY,
    };
    return map[role] ?? role;
  };

  const permLabel = (key: string) => {
    const map = t.pages.access.perms as Record<string, string>;
    return map[key] ?? key;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {t.pages.access.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.pages.access.subtitle}</p>
        </div>
        {!error && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            {t.pages.access.createUser}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'users' as const, label: t.pages.access.tabUsers, icon: Users },
            { id: 'matrix' as const, label: t.pages.access.tabMatrix, icon: Check },
            { id: 'activity' as const, label: t.pages.access.tabActivity, icon: Activity },
            { id: 'locks' as const, label: t.pages.access.tabLocks, icon: Lock },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm border transition-colors',
              tab === id
                ? 'bg-primary/15 text-primary border-primary/25'
                : 'border-border text-muted-foreground hover:text-foreground/90',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {loading && !error && <p className="text-sm text-muted-foreground">{t.common.loading}</p>}

      {!loading && !error && tab === 'users' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">{t.pages.access.usersTitle}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t.pages.access.usersHint}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm text-start">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium text-start">{t.table.name}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.pages.users.role}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.pages.access.seeGroup}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.pages.access.doGroup}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.pages.users.active}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {t.pages.users.empty}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const seeCount = seeKeys.filter((k) => u.permissions[k]).length;
                    const doCount = doKeys.filter((k) => u.permissions[k]).length;
                    return (
                      <tr key={u.id} className="border-b border-border hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground" dir="ltr">{u.phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role === 'SITE_SUPERVISOR' ? 'SALESPERSON' : u.role}
                            onChange={(e) => void setRole(u.id, e.target.value)}
                            className="rounded-lg border border-border bg-muted px-2 py-1.5 text-xs outline-none"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {seeCount}/{seeKeys.length}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {doCount}/{doKeys.length}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={saving === `${u.id}:active`}
                            onClick={() => void toggleActive(u)}
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                              u.isActive
                                ? 'bg-primary/15 text-primary border-primary/25'
                                : 'bg-muted text-muted-foreground border-border',
                            )}
                          >
                            {u.isActive ? t.pages.users.active : t.pages.access.inactive}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-border hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t.pages.access.editPerms}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && !error && tab === 'matrix' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">{t.pages.access.matrixTitle}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t.pages.access.matrixHint}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm text-start">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] text-muted-foreground">
                  <th className="px-4 py-3 font-medium text-start sticky start-0 bg-muted/95">
                    {t.table.name}
                  </th>
                  {keys.map((k) => (
                    <th key={k} className="px-2 py-3 font-medium text-center max-w-[6.5rem]">
                      <span className="inline-block leading-snug">{permLabel(k)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 sticky start-0 bg-card">
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground">{roleLabel(u.role)}</p>
                    </td>
                    {keys.map((k) => {
                      const on = !!u.permissions[k];
                      const busy = saving === `${u.id}:${k}`;
                      return (
                        <td key={k} className="px-2 py-3 text-center">
                          <button
                            type="button"
                            disabled={busy || u.role === 'SUPER_ADMIN'}
                            onClick={() => void toggle(u.id, k, !on)}
                            className={cn(
                              'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                              on
                                ? 'bg-primary/20 border-primary/40 text-primary'
                                : 'bg-muted border-border text-muted-foreground/70',
                              u.role === 'SUPER_ADMIN' && 'opacity-60 cursor-not-allowed',
                            )}
                            aria-pressed={on}
                            title={permLabel(k)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : on ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && !error && tab === 'activity' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">{t.pages.access.activityTitle}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm text-start">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium text-start">{t.dashboard.dateTime}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.table.name}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.pages.access.action}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.pages.projects.code}</th>
                  <th className="px-4 py-3 font-medium text-start">{t.table.amount}</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      {t.table.noResults}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatDate(log.createdAt, lang)}
                      </td>
                      <td className="px-4 py-3 text-foreground/90 font-medium">{log.userName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{log.action}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground/80">
                        {log.projectCode ?? '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground/80">
                        {log.amountIqd != null ? formatCurrency(log.amountIqd, lang) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && !error && tab === 'locks' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/25">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{t.pages.access.lockTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t.pages.access.lockDesc}</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc ps-5">
            <li>{t.pages.access.lockRule1}</li>
            <li>{t.pages.access.lockRule2}</li>
            <li>{t.pages.access.lockRule3}</li>
          </ul>
          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-sm font-medium text-foreground">
              {(t.pages.access as { backupTitle?: string }).backupTitle ?? 'باکئەپی داتابەیس'}
            </p>
            <p className="text-sm text-muted-foreground">
              {(t.pages.access as { backupDesc?: string }).backupDesc ??
                'کۆپییەکی SQLite دابەزێنە — تەنها سوپەر ئەدمین.'}
            </p>
            <a
              href="/api/access/backup"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              {(t.pages.access as { backupDownload?: string }).backupDownload ?? 'داگرتنی باکئەپ'}
            </a>
          </div>
        </section>
      )}

      <UserFormModal
        t={t}
        open={modalOpen}
        mode={modalMode}
        initial={editing}
        seeKeys={seeKeys}
        doKeys={doKeys}
        roleDefaults={roleDefaults}
        onClose={() => setModalOpen(false)}
        onSaved={() => void loadMatrix()}
      />
    </div>
  );
}
