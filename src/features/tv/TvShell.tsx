'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTvFocus } from './TvFocusProvider';
import { TvBackButton } from './TvBackButton';

export function TvShell({
  children,
  title,
  subtitle,
  lang,
  showBack = true,
  minimal = false,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  lang: string;
  showBack?: boolean;
  /** Map-only TV — hide big header chrome */
  minimal?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerRoot, focusFirst } = useTvFocus();
  const pathname = usePathname();
  const homeHref = `/${lang}/tv`;
  const normalized = pathname.replace(/\/$/, '');
  const isHome = normalized.endsWith('/tv');
  const isLogin = normalized.includes('/tv/auth/login');

  useEffect(() => {
    registerRoot(ref.current);
    return () => registerRoot(null);
  }, [registerRoot]);

  useEffect(() => {
    const t = window.setTimeout(() => focusFirst(), 80);
    return () => window.clearTimeout(t);
  }, [pathname, focusFirst, children]);

  return (
    <div
      ref={ref}
      className={`rh-tv-shell${minimal ? ' rh-tv-shell-minimal' : ''}`}
      data-tv-lang={lang}
    >
      {!minimal ? (
        <header className="rh-tv-header">
          <div className="rh-tv-header-text">
            <p className="rh-tv-kicker">Road Home · TV</p>
            <h1 className="rh-tv-title">{title}</h1>
            {subtitle ? <p className="rh-tv-subtitle">{subtitle}</p> : null}
          </div>
          <div className="rh-tv-header-side">
            {showBack && !isHome && !isLogin ? (
              <TvBackButton fallbackHref={homeHref} />
            ) : null}
            <p className="rh-tv-hint" aria-hidden>
              ↑ ↓ ← → · OK · Back
            </p>
          </div>
        </header>
      ) : null}
      <main className="rh-tv-main">{children}</main>
    </div>
  );
}
