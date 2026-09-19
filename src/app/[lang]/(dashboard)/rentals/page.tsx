import { Suspense } from 'react';
import { requireAuth } from '@/lib/page-context';
import { RentalsTable } from '@/features/rentals/RentalsTable';

export default async function RentalsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>}>
      <RentalsTable t={t} lang={lang} />
    </Suspense>
  );
}
