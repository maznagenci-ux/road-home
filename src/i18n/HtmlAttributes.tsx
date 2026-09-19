'use client';

import { useEffect } from 'react';
import { isRTL, localeHtmlLang, type Locale } from '@/i18n/locale-config';

export function HtmlAttributes({ lang }: { lang: Locale }) {
  useEffect(() => {
    document.documentElement.lang = localeHtmlLang[lang];
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  return null;
}
