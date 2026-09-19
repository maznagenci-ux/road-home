'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

export function ConfirmDialog({
  t,
  message,
  description,
  onConfirm,
  onCancel,
  open,
}: {
  t: Dictionary;
  message: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{message}</h3>
        {description && (
          <p className="text-sm text-[var(--text-muted)] mb-5">{description}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:opacity-90"
          >
            {t.common.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchInput({
  t,
  value,
  onChange,
  className,
}: {
  t: Dictionary;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t.table.search}
      className={cn(
        'px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]',
        className,
      )}
    />
  );
}

export function Pagination({
  t,
  page,
  totalPages,
  onPageChange,
}: {
  t: Dictionary;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-[var(--text-muted)]">
      <span>{t.pagination.page} {page} / {totalPages}</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--bg-hover)]"
        >
          {t.pagination.previous}
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--bg-hover)]"
        >
          {t.pagination.next}
        </button>
      </div>
    </div>
  );
}
