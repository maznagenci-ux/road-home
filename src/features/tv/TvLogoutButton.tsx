'use client';

import { useRouter } from 'next/navigation';

export function TvLogoutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rh-tv-btn"
      data-tv-focus
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        const lang = window.location.pathname.split('/')[1] || 'ckb';
        router.replace(`/${lang}/tv/auth/login`);
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}
