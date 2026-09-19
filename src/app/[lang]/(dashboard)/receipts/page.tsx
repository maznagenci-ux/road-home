import { Suspense } from 'react';
import { requireAuth } from '@/lib/page-context';
import { ReceiptsView } from '@/features/receipts/ReceiptsView';

export default async function ReceiptsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>}>
      <ReceiptsView t={t} lang={lang} />
    </Suspense>
  );
}
