'use client';

import type { Locale } from './locale-config';
import type { Dictionary } from './dictionaries';

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  ckb: () => import('../../messages/ckb.json').then((m) => m.default as Dictionary),
  ar: () => import('../../messages/ar.json').then((m) => m.default as Dictionary),
  en: () => import('../../messages/en.json').then((m) => m.default as Dictionary),
};

export async function loadClientDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
