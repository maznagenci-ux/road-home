'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

type TvFocusContextValue = {
  registerRoot: (el: HTMLElement | null) => void;
  focusFirst: () => void;
};

const TvFocusContext = createContext<TvFocusContextValue>({
  registerRoot: () => undefined,
  focusFirst: () => undefined,
});

export function useTvFocus() {
  return useContext(TvFocusContext);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [data-tv-focus]:not([data-tv-focus="false"]), [tabindex]:not([tabindex="-1"])';

function isVisible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.01;
}

function listFocusables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);
}

function center(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
}

function pickSpatial(
  current: HTMLElement,
  candidates: HTMLElement[],
  dir: 'up' | 'down' | 'left' | 'right',
) {
  const c = center(current);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === current) continue;
    const t = center(el);
    const dx = t.x - c.x;
    const dy = t.y - c.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    let ok = false;
    if (dir === 'up') ok = dy < -8 && absY >= absX * 0.3;
    if (dir === 'down') ok = dy > 8 && absY >= absX * 0.3;
    if (dir === 'left') ok = dx < -8 && absX >= absY * 0.3;
    if (dir === 'right') ok = dx > 8 && absX >= absY * 0.3;
    if (!ok) continue;

    const primary = dir === 'up' || dir === 'down' ? absY : absX;
    const secondary = dir === 'up' || dir === 'down' ? absX : absY;
    const score = primary + secondary * 0.4;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/** Map Smart TV / Android / LG / Samsung remote keys → direction or action. */
function resolveRemoteKey(e: KeyboardEvent): {
  dir?: 'up' | 'down' | 'left' | 'right';
  action?: 'ok' | 'back';
} {
  const key = e.key;
  const code = e.keyCode || e.which;

  if (
    key === 'Escape' ||
    key === 'BrowserBack' ||
    key === 'GoBack' ||
    key === 'Back' ||
    key === 'XF86Back' ||
    code === 4 || // Android BACK
    code === 461 || // LG Back
    code === 10009 // Samsung Return/Back
  ) {
    return { action: 'back' };
  }
  if (key === 'Backspace' || code === 8) {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return {};
    return { action: 'back' };
  }

  if (
    key === 'Enter' ||
    key === ' ' ||
    key === 'Spacebar' ||
    key === 'Select' ||
    key === 'MediaPlayPause' ||
    code === 13 ||
    code === 23 || // DPAD_CENTER
    code === 66 // KEYCODE_ENTER
  ) {
    return { action: 'ok' };
  }

  if (key === 'ArrowUp' || code === 38 || code === 19) return { dir: 'up' };
  if (key === 'ArrowDown' || code === 40 || code === 20) return { dir: 'down' };
  if (key === 'ArrowLeft' || code === 37 || code === 21) return { dir: 'left' };
  if (key === 'ArrowRight' || code === 39 || code === 22) return { dir: 'right' };

  return {};
}

export function TvFocusProvider({
  children,
  homeHref,
}: {
  children: ReactNode;
  homeHref: string;
}) {
  const rootRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const registerRoot = useCallback((el: HTMLElement | null) => {
    rootRef.current = el;
  }, []);

  const focusFirst = useCallback(() => {
    const r = rootRef.current ?? document.body;
    const first = listFocusables(r)[0];
    try {
      first?.focus();
    } catch {
      /* older TV WebViews */
    }
    try {
      first?.scrollIntoView(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const root = () => rootRef.current ?? document.body;

    const ensureFocus = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && root().contains(active) && isVisible(active) && listFocusables(root()).includes(active)) {
        return;
      }
      focusFirst();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const resolved = resolveRemoteKey(e);
      const r = root();

      if (resolved.action === 'back') {
        e.preventDefault();
        e.stopPropagation();
        const path = window.location.pathname.replace(/\/$/, '');
        const onHome = path.endsWith('/tv') || /\/tv$/.test(path);
        if (onHome) return;
        if (window.history.length > 1) router.back();
        else router.push(homeHref);
        return;
      }

      if (resolved.action === 'ok') {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !r.contains(active)) return;
        const tag = active.tagName;

        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          // Move to next focusable / submit when on last field
          const items = listFocusables(r);
          const idx = items.indexOf(active);
          if (idx >= 0 && idx < items.length - 1) {
            e.preventDefault();
            items[idx + 1]?.focus();
            return;
          }
          const form = active.closest('form');
          if (form) {
            e.preventDefault();
            if (typeof form.requestSubmit === 'function') form.requestSubmit();
            else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
          return;
        }

        if (tag === 'SELECT') return;

        e.preventDefault();
        active.click();
        return;
      }

      if (!resolved.dir) return;

      const active = document.activeElement as HTMLElement | null;
      const items = listFocusables(r);
      if (!items.length) return;

      e.preventDefault();

      if (!active || !r.contains(active) || !items.includes(active)) {
        items[0]?.focus();
        return;
      }

      const next = pickSpatial(active, items, resolved.dir);
      if (next) {
        next.focus();
        next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    };

    document.documentElement.classList.add('rh-tv-root');
    document.body.classList.add('rh-tv-body');
    window.addEventListener('keydown', onKeyDown, true);
    const t = window.setTimeout(ensureFocus, 60);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown, true);
      document.documentElement.classList.remove('rh-tv-root');
      document.body.classList.remove('rh-tv-body');
    };
  }, [focusFirst, homeHref, router]);

  // Re-focus after client navigations between TV pages
  useEffect(() => {
    const t = window.setTimeout(() => focusFirst(), 100);
    return () => window.clearTimeout(t);
  }, [pathname, focusFirst]);

  const value = useMemo(
    () => ({ registerRoot, focusFirst }),
    [registerRoot, focusFirst],
  );

  return <TvFocusContext.Provider value={value}>{children}</TvFocusContext.Provider>;
}
