'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  placeMatchesQuery,
  placeSelectLabel,
  type PlaceOption,
} from '@/lib/places';

type Props = {
  options: PlaceOption[];
  value: string;
  onChange: (code: string, place: PlaceOption | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
};

export function PlaceSearchSelect({
  options,
  value,
  onChange,
  placeholder = 'شوێن هەڵبژێرە',
  searchPlaceholder = 'گەڕان بە کۆد یان ناو…',
  className,
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = options.find((p) => p.code === value);
  const label = selected
    ? placeSelectLabel(selected)
    : value
      ? value
      : placeholder;

  const filtered = useMemo(
    () => options.filter((p) => placeMatchesQuery(p, q)).slice(0, 200),
    [options, q],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ('');
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {/* Keep a hidden input so native form required works when needed */}
      {required ? (
        <input
          tabIndex={-1}
          className="sr-only"
          required
          value={value}
          onChange={() => undefined}
          aria-hidden
        />
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-start',
          'flex items-center justify-between gap-2 outline-none focus:border-primary/50',
          !value && 'text-muted-foreground',
        )}
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-40 inset-x-0 top-[calc(100%+6px)] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-start text-sm text-muted-foreground hover:bg-muted"
                onClick={() => {
                  onChange('', undefined);
                  setOpen(false);
                }}
              >
                {placeholder}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">هیچ نەدۆزرایەوە</li>
            ) : (
              filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-start text-sm hover:bg-muted',
                      p.code === value && 'bg-primary/10 text-primary font-medium',
                    )}
                    onClick={() => {
                      onChange(p.code, p);
                      setOpen(false);
                    }}
                  >
                    {placeSelectLabel(p)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
