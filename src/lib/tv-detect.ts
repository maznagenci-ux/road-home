/** Shared Smart-TV UA check (browser + middleware). */
export function isSmartTvUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const u = ua.toLowerCase();
  return (
    u.includes('smart-tv') ||
    u.includes('smarttv') ||
    u.includes('googletv') ||
    u.includes('appletv') ||
    u.includes('hbbtv') ||
    u.includes('tizen') ||
    u.includes('webos') ||
    u.includes('web0s') ||
    u.includes('netcast') ||
    u.includes('viera') ||
    u.includes('bravia') ||
    u.includes('vidaa') ||
    u.includes('hisense') ||
    u.includes('firetv') ||
    u.includes('aftb') ||
    u.includes('aftm') ||
    u.includes('aftt') ||
    u.includes('android tv') ||
    u.includes('androidtv') ||
    u.includes('crkey') ||
    u.includes('chromecast') ||
    u.includes('playstation') ||
    u.includes('xbox')
  );
}
