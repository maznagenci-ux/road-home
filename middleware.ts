import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { locales, defaultLocale, normalizeLocale } from '@/i18n/locale-config';
import { isSmartTvUserAgent } from '@/lib/tv-detect';

const AUTH_COOKIE = 'raot-home-token';
const TV_UI_COOKIE = 'rh-ui';

function wantsDesktop(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get('desktop') === '1';
}

/** TV mode only for real Smart-TV UA or explicit ?tv=1 — never sticky cookie alone. */
function wantsTv(request: NextRequest): boolean {
  if (wantsDesktop(request)) return false;
  if (request.nextUrl.searchParams.get('tv') === '1') return true;
  return isSmartTvUserAgent(request.headers.get('user-agent'));
}

function withTvCookie(res: NextResponse, enable: boolean) {
  if (enable) {
    res.cookies.set(TV_UI_COOKIE, 'tv', {
      path: '/',
      maxAge: 60 * 60 * 24 * 400,
      sameSite: 'lax',
    });
  } else {
    // Always clear sticky TV cookie on desktop system routes so users are not trapped.
    res.cookies.set(TV_UI_COOKIE, '', { path: '/', maxAge: 0 });
  }
  return res;
}

function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

/**
 * Presence of cookie alone is not enough — expired/invalid JWT caused
 * ERR_TOO_MANY_REDIRECTS (middleware → /ckb, layout → /login, middleware → /ckb).
 */
async function hasValidSession(request: NextRequest): Promise<'yes' | 'no' | 'bad'> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return 'no';
  const secret = process.env.JWT_SECRET;
  if (!secret) return 'bad';
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return 'yes';
  } catch {
    return 'bad';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Short entry: /tv → /ckb/tv
  if (pathname === '/tv' || pathname === '/tv/') {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}/tv`;
    return withTvCookie(NextResponse.redirect(url), true);
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
    const forceTv = wantsTv(request);
    url.pathname = forceTv
      ? `/${defaultLocale}/tv`
      : `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    const res = NextResponse.redirect(url);
    return withTvCookie(res, forceTv);
  }

  const locale = normalizeLocale(matched);
  const isTvPath = pathname.includes('/tv');
  const isAuthPage =
    pathname.includes('/auth/login') ||
    pathname.includes('/auth/forgot-password') ||
    pathname.includes('/auth/reset-password');
  const isPublicMap = /\/[^/]+\/map\/?$/.test(pathname) || pathname.endsWith('/map');
  const isLoginPage = pathname.includes('/auth/login') && !isTvPath;
  const sessionState = await hasValidSession(request);
  const isLoggedIn = sessionState === 'yes';

  // Explicit desktop escape from TV
  if (wantsDesktop(request)) {
    const url = request.nextUrl.clone();
    url.pathname = isLoggedIn ? `/${locale}` : `/${locale}/auth/login`;
    url.searchParams.delete('desktop');
    url.searchParams.delete('tv');
    const res = withTvCookie(NextResponse.redirect(url), false);
    if (sessionState === 'bad') clearAuthCookie(res);
    return res;
  }

  // Real Smart TV / ?tv=1 → public map-only TV
  if (wantsTv(request) && !isTvPath) {
    const url = request.nextUrl.clone();
    url.searchParams.delete('tv');
    url.pathname = `/${locale}/tv`;
    return withTvCookie(NextResponse.redirect(url), true);
  }

  // TV routes are public — map only, never force login
  if (isTvPath) {
    if (/\/[^/]+\/tv\/auth\/login\/?$/.test(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/tv`;
      return withTvCookie(NextResponse.redirect(url), true);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);
    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return withTvCookie(res, true);
  }

  // Desktop/system routes — clear any leftover TV sticky cookie
  if (!isLoggedIn && !isAuthPage && !isPublicMap) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    const res = withTvCookie(NextResponse.redirect(url), false);
    if (sessionState === 'bad') clearAuthCookie(res);
    return res;
  }

  if (isLoggedIn && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return withTvCookie(NextResponse.redirect(url), false);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  const res = withTvCookie(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
    false,
  );
  if (sessionState === 'bad') clearAuthCookie(res);
  return res;
}

export const config = {
  matcher: ['/((?!_next|api|favicon|.*\\..*).*)'],
};
