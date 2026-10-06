import fs from 'node:fs';
import path from 'node:path';

const dataUriCache = new Map<string, string>();

/** Public site origin for PDF assets (respects nginx X-Forwarded-* ). */
export function getPublicOrigin(req: Request): string {
  const url = new URL(req.url);
  const xfProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const xfHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const hostHeader = req.headers.get('host')?.split(',')[0]?.trim();
  const host = xfHost || hostHeader || url.host;
  const proto =
    xfProto ||
    (url.protocol === 'https:' ? 'https' : url.protocol.replace(/:$/, '') || 'https');

  const isLoopback =
    !host ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('localhost') ||
    host.startsWith('[::1]');

  if (isLoopback) {
    const env =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      '';
    return env.replace(/\/$/, '');
  }

  return `${proto}://${host}`.replace(/\/$/, '');
}

function readBrandPng(file: string): string | null {
  const cached = dataUriCache.get(file);
  if (cached) return cached;

  const candidates = [
    path.join(process.cwd(), 'public', 'brand', file),
    path.join(process.cwd(), '.next', 'standalone', 'public', 'brand', file),
    path.join(process.cwd(), 'brand', file),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) continue;
      const uri = `data:image/png;base64,${fs
        .readFileSync(/*turbopackIgnore: true*/ filePath)
        .toString('base64')}`;
      dataUriCache.set(file, uri);
      return uri;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Prefer embedded PNG so print/PDF never depends on proxy origin. */
export function brandLogoUrl(
  file: 'logo.png' | 'logo-mark.png' = 'logo.png',
  assetBase?: string,
): string {
  const embedded = readBrandPng(file);
  if (embedded) return embedded;

  const base = (assetBase ?? '').replace(/\/$/, '');
  if (base && !/127\.0\.0\.1|localhost/i.test(base)) {
    return `${base}/brand/${file}`;
  }
  return `/brand/${file}`;
}

export function brandLogoPair(assetBase?: string): { logo: string; mark: string } {
  return {
    logo: brandLogoUrl('logo.png', assetBase),
    mark: brandLogoUrl('logo-mark.png', assetBase),
  };
}
