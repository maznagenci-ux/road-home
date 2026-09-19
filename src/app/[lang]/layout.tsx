import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  hasLocale,
  isRTL,
  localeHtmlLang,
  normalizeLocale,
  type Locale,
} from '@/i18n/locale-config';
import { getDictionary } from '@/i18n/dictionaries';
import { I18nProvider } from '@/i18n/I18nProvider';
import { HtmlAttributes } from '@/i18n/HtmlAttributes';

export async function generateStaticParams() {
  return [{ lang: 'ckb' }, { lang: 'ar' }, { lang: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang) && lang !== 'ku') return {};
  const locale = normalizeLocale(lang);
  const t = await getDictionary(locale);
  return {
    title: t.app.name,
    description: t.app.tagline,
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang) && lang !== 'ku') notFound();

  const locale = normalizeLocale(lang);
  const dictionary = await getDictionary(locale);
  const rtl = isRTL(locale);

  return (
    <div
      lang={localeHtmlLang[locale]}
      dir={rtl ? 'rtl' : 'ltr'}
      className="min-h-full flex flex-col"
      style={{ fontFamily: rtl ? 'var(--font-arabic)' : 'var(--font-sans)' }}
    >
      <HtmlAttributes lang={locale} />
      <I18nProvider locale={locale} dictionary={dictionary}>
        {children}
      </I18nProvider>
    </div>
  );
}
