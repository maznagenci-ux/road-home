import { requireAuth } from '@/lib/page-context';
import { prisma } from '@/lib/prisma';
import { ContractGenerator } from '@/features/contracts/ContractGenerator';

export default async function NewContractPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, lang } = await requireAuth(paramLang);

  const places = await prisma.place.findMany({
    orderBy: [{ neighborhood: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      code: true,
      neighborhood: true,
      name: true,
      province: true,
      city: true,
    },
  });

  return <ContractGenerator t={t} lang={lang} placeOptions={places} />;
}
