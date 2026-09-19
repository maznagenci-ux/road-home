'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

export type PermMap = Record<string, boolean>;

export type EditableUser = {
  id?: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  permissions: PermMap;
};

const ROLES = ['SUPER_ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'VIEW_ONLY'] as const;

export function UserFormModal({
  t,
  open,
  mode,
  initial,
  seeKeys,
  doKeys,
  roleDefaults,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  open: boolean;
  mode: 'create' | 'edit';
  initial: EditableUser | null;
  seeKeys: string[];
  doKeys: string[];
  roleDefaults: Record<string, PermMap>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('VIEW_ONLY');
  const [isActive, setIsActive] = useState(true);
  const [perms, setPerms] = useState<PermMap>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const baseRole = initial?.role ?? 'VIEW_ONLY';
    const defaults = roleDefaults[baseRole] ?? {};
    setName(initial?.name ?? '');
    setEmail(initial?.email ?? '');
    setPassword('');
    setRole(baseRole);
    setIsActive(initial?.isActive ?? true);
    setPerms(initial?.permissions ?? { ...defaults });
    setError('');
  }, [open, initial, roleDefaults]);

  const locked = role === 'SUPER_ADMIN';

  const applyRolePreset = (nextRole: string) => {
    setRole(nextRole);
    if (nextRole === 'SUPER_ADMIN') {
      const all = { ...(roleDefaults.SUPER_ADMIN ?? {}) };
      for (const k of [...seeKeys, ...doKeys]) all[k] = true;
      setPerms(all);
      return;
    }
    setPerms({ ...(roleDefaults[nextRole] ?? {}) });
  };

  const toggle = (key: string) => {
    if (locked) return;
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setGroup = (keys: string[], granted: boolean) => {
    if (locked) return;
    setPerms((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = granted;
      return next;
    });
  };

  const roleLabel = (r: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: t.roles.SUPER_ADMIN,
      ACCOUNTANT: t.roles.ACCOUNTANT,
      SALESPERSON: t.roles.SALESPERSON,
      SITE_SUPERVISOR: t.roles.SALESPERSON,
      VIEW_ONLY: t.roles.VIEW_ONLY,
    };
    return map[r] ?? r;
  };

  const permLabel = (key: string) => {
    const map = t.pages.access.perms as Record<string, string>;
    return map[key] ?? key;
  };

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (mode === 'create' && !password) {
        setError(t.pages.access.passwordRequired);
        setSaving(false);
        return;
      }

      const res = await fetch('/api/users', {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'create'
            ? {
                name: name.trim(),
                email: email.trim(),
                password,
                role,
                isActive,
                permissions: perms,
              }
            : {
                userId: initial!.id,
                name: name.trim(),
                email: email.trim(),
                role,
                isActive,
                permissions: perms,
                ...(password ? { password } : {}),
              },
        ),
      });

      if (res.status === 409) {
        setError(t.pages.access.emailExists);
        return;
      }
      if (!res.ok) {
        setError(t.common.error);
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const seeGranted = useMemo(() => seeKeys.filter((k) => perms[k]).length, [seeKeys, perms]);
  const doGranted = useMemo(() => doKeys.filter((k) => perms[k]).length, [doKeys, perms]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sidebar/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-card">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {mode === 'create' ? t.pages.access.createUser : t.pages.access.editUser}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t.pages.access.createHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
            aria-label={t.common.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">{t.table.name}</label>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">{t.table.email}</label>
              <input
                type="email"
                className={field}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                {mode === 'create' ? t.auth.password : t.pages.access.newPassword}
              </label>
              <input
                type="password"
                className={field}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={mode === 'create'}
                placeholder={mode === 'edit' ? t.pages.access.passwordKeep : undefined}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.users.role}</label>
              <select
                className={field}
                value={role}
                onChange={(e) => applyRolePreset(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">{t.pages.access.rolePresetHint}</p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border"
            />
            {t.pages.users.active}
          </label>

          {locked && (
            <p className="text-xs rounded-xl bg-primary/10 text-primary px-3 py-2">
              {t.pages.access.superAdminLocked}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PermissionGroup
              icon={<Eye className="h-4 w-4" />}
              title={t.pages.access.seeGroup}
              hint={t.pages.access.seeHint}
              count={`${seeGranted}/${seeKeys.length}`}
              keys={seeKeys}
              perms={perms}
              locked={locked}
              onToggle={toggle}
              onAll={() => setGroup(seeKeys, true)}
              onNone={() => setGroup(seeKeys, false)}
              allLabel={t.pages.access.selectAll}
              noneLabel={t.pages.access.selectNone}
              permLabel={permLabel}
            />
            <PermissionGroup
              icon={<Pencil className="h-4 w-4" />}
              title={t.pages.access.doGroup}
              hint={t.pages.access.doHint}
              count={`${doGranted}/${doKeys.length}`}
              keys={doKeys}
              perms={perms}
              locked={locked}
              onToggle={toggle}
              onAll={() => setGroup(doKeys, true)}
              onNone={() => setGroup(doKeys, false)}
              allLabel={t.pages.access.selectAll}
              noneLabel={t.pages.access.selectNone}
              permLabel={permLabel}
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-500/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? t.common.loading : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionGroup({
  icon,
  title,
  hint,
  count,
  keys,
  perms,
  locked,
  onToggle,
  onAll,
  onNone,
  allLabel,
  noneLabel,
  permLabel,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  count: string;
  keys: string[];
  perms: PermMap;
  locked: boolean;
  onToggle: (key: string) => void;
  onAll: () => void;
  onNone: () => void;
  allLabel: string;
  noneLabel: string;
  permLabel: (key: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">{icon}</span>
            {title}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <span className="text-[11px] font-medium tabular-nums text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={locked}
          onClick={onAll}
          className="text-[11px] px-2 py-1 rounded-lg border border-border bg-card hover:bg-primary/10 disabled:opacity-50"
        >
          {allLabel}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={onNone}
          className="text-[11px] px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50"
        >
          {noneLabel}
        </button>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pe-1">
        {keys.map((key) => {
          const on = !!perms[key];
          return (
            <label
              key={key}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors',
                on ? 'bg-primary/10 border-primary/25 text-foreground' : 'bg-card border-border text-muted-foreground',
                locked && 'opacity-70 cursor-not-allowed',
              )}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={locked}
                onChange={() => onToggle(key)}
                className="rounded border-border accent-[hsl(var(--primary))]"
              />
              <span className="leading-snug">{permLabel(key)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
