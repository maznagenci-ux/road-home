'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/i18n/dictionaries';

type SearchItem = {
  type: string;
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
};

export function GlobalSearch({ t }: { t: Dictionary }) {
  const params = useParams();
  const lang = String(params?.lang ?? 'ckb');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          if (!res.ok) {
            setItems([]);
            return;
          }
          const data = await res.json();
          setItems(data.items ?? []);
        })
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  const emptyLabel = useMemo(() => {
    if (loading) return null;
    if (!query.trim()) return t.dashboard.searchPlaceholder;
    return t.table.noResults;
  }, [loading, query, t]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'hidden sm:flex items-center gap-2 h-10 w-full max-w-md rounded-full border border-border',
          'bg-card px-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors shadow-sm',
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-start truncate">{t.dashboard.searchPlaceholder}</span>
        <kbd className="hidden lg:inline rounded-lg border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {t.dashboard.searchHint}
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4">
          <div className="absolute inset-0 bg-sidebar/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.dashboard.searchPlaceholder}
                className="flex-1 bg-transparent py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {items.length > 0 ? (
                <ul className="py-2">
                  {items.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <Link
                        href={`/${lang}${item.href}`}
                        onClick={() => setOpen(false)}
                        className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-muted/70 transition-colors"
                      >
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          {item.type}
                          {item.subtitle ? ` · ${item.subtitle}` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">{emptyLabel}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
