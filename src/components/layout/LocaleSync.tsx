'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { localeFromUser, hasLocale } from '@/i18n/locale-config';

export function LocaleSync({ lang, userLocale }: { lang: string; userLocale?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const preferred = localeFromUser(userLocale);
    const current = localeFromUser(lang);
    if (preferred !== current && hasLocale(preferred)) {
      const path = pathname.replace(`/${lang}`, '') || '/';
      router.replace(`/${preferred}${path}`);
    }
  }, [lang, userLocale, pathname, router]);

  return null;
}
