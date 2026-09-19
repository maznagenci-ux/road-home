import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, normalizeLocale } from '@/i18n/locale-config';

const AUTH_COOKIE = 'raot-home-token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Legacy alias: /ku → /ckb
  if (pathname === '/ku' || pathname.startsWith('/ku/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/ku/, `/${defaultLocale}`);
    return NextResponse.redirect(url);
  }

  const matched = locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
  );

  if (!matched) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = normalizeLocale(matched);
  const isAuthPage =
    pathname.includes('/auth/login') ||
    pathname.includes('/auth/forgot-password') ||
    pathname.includes('/auth/reset-password');
  const isLoginPage = pathname.includes('/auth/login');
  const isLoggedIn = !!request.cookies.get(AUTH_COOKIE)?.value;

  if (!isLoggedIn && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next|api|favicon|.*\\..*).*)'],
};
