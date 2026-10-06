'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { locales, localeLabels, type Locale } from '@/i18n/locale-config';
import { cn } from '@/lib/utils';

/**
 * Language picker for PDF print — portal + fixed position so table
 * overflow-hidden does not clip کوردی / العربية / English.
 */
export function PdfPrintLangMenu({
  open,
  anchorEl,
  title,
  currentLocale,
  onSelect,
  onClose,
}: {
  open: boolean;
  anchorEl: HTMLElement | null;
  title: string;
  currentLocale?: string;
  onSelect: (locale: Locale) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setPos(null);
      return;
    }
    const place = () => {
      const r = anchorEl.getBoundingClientRect();
      const width = 168;
      const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
      const top = Math.min(r.bottom + 6, window.innerHeight - 160);
      setPos({ top, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, anchorEl]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorEl?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, anchorEl, onClose]);

  if (!mounted || !open || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className="fixed z-[200] min-w-[10.5rem] rounded-xl border border-border bg-card p-1.5 shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      <p className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">{title}</p>
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          role="menuitem"
          onClick={() => {
            onSelect(loc);
            onClose();
          }}
          className={cn(
            'flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-start hover:bg-muted',
            loc === currentLocale && 'font-semibold text-primary bg-primary/5',
          )}
        >
          {localeLabels[loc]}
        </button>
      ))}
    </div>,
    document.body,
  );
}
