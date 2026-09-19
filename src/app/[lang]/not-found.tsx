import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n/dictionaries';
import { hasLocale } from '@/i18n/locale-config';
import Link from 'next/link';

export default async function NotFoundPage({
  params,
}: {
  params?: Promise<{ lang: string }>;
}) {
  let t;
  try {
    const p = params ? await params : null;
    if (p?.lang && hasLocale(p.lang)) {
      t = await getDictionary(p.lang);
    } else {
      t = await getDictionary('ku');
    }
  } catch {
    t = await getDictionary('ku');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[var(--brand)] mb-4">404</h1>
        <p className="text-lg text-[var(--text-secondary)] mb-6">{t.errors.notFound}</p>
        <Link
          href="/ku"
          className="inline-flex px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--brand)]"
        >
          {t.breadcrumb.home}
        </Link>
      </div>
    </div>
  );
}
