'use client';

import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { TvFocusProvider } from './TvFocusProvider';
import './tv.css';

/** Web-TV map must stay light — dark theme tokens make MapView text invisible on white panels. */
function useForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const prevScheme = root.style.colorScheme;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    root.setAttribute('data-tv-force-light', '1');
    return () => {
      root.removeAttribute('data-tv-force-light');
      root.style.colorScheme = prevScheme;
    };
  }, []);
}

class TvErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(err: Error) {
    return { error: err?.message || 'TV render error' };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[tv]', err, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rh-tv-crash">
          <p className="rh-tv-crash-title">نەتوانرا نەخشە باربکرێت</p>
          <p className="rh-tv-crash-sub">پەڕەکە نوێ بکەرەوە — یان دواتر هەوڵ بدەرەوە</p>
          <button
            type="button"
            className="rh-tv-crash-btn"
            onClick={() => window.location.reload()}
          >
            نوێکردنەوە
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function TvClientRoot({
  lang,
  children,
}: {
  lang: string;
  children: ReactNode;
}) {
  useForceLightTheme();

  return (
    <TvFocusProvider homeHref={`/${lang}/tv`}>
      <div className="rh-tv-root rh-tv-body rh-tv-body-map">
        <TvErrorBoundary>{children}</TvErrorBoundary>
      </div>
    </TvFocusProvider>
  );
}
