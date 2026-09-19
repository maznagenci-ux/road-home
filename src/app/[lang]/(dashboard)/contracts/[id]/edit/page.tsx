import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/page-context';
import { prisma } from '@/lib/prisma';
import { ContractGenerator } from '@/features/contracts/ContractGenerator';

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang: paramLang, id } = await params;
  const { t, lang } = await requireAuth(paramLang);

  const [contract, places] = await Promise.all([
    prisma.contract.findUnique({
      where: { id },
      include: {
        house: { select: { code: true, name: true, location: true } },
        installments: { orderBy: { dueDate: 'asc' } },
      },
    }),
    prisma.place.findMany({
      orderBy: [{ neighborhood: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        neighborhood: true,
        name: true,
        province: true,
        city: true,
      },
    }),
  ]);

  if (!contract) notFound();

  return (
    <ContractGenerator
      t={t}
      lang={lang}
      placeOptions={places}
      initialContract={{
        ...contract,
        installments: contract.installments.map((i) => ({
          id: i.id,
          dueDate: i.dueDate.toISOString(),
          amount: i.amount,
          notes: i.notes,
        })),
      }}
    />
  );
}
