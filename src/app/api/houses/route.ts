import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireApiPermission } from '@/lib/api-auth';
import { syncPlaceFromHouse } from '@/lib/houses-places-sync';

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  unitNumber: z.string().optional().nullable(),
  area: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  budgetIqd: z.number().min(0).default(0),
  description: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  status: z.enum(['IN_CONSTRUCTION', 'SOLD', 'FINISHED']).default('IN_CONSTRUCTION'),
  targetFinishAt: z.string().datetime().optional().nullable().or(z.string().min(1).optional().nullable()),
  neighborhood: z.string().min(1),
  province: z.string().min(1).default('هەولێر'),
  city: z.string().min(1).default('هەولێر'),
  plotNo: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireApiPermission('VIEW_PROPERTIES');
  if ('error' in auth) return auth.error;
  const houses = await prisma.house.findMany({
    orderBy: { code: 'asc' },
    include: { property: { select: { id: true, name: true } } },
    take: 200,
  });
  const codes = houses.map((h) => h.code);
  const places = codes.length
    ? await prisma.place.findMany({ where: { code: { in: codes } } })
    : [];
  const placeByCode = new Map(places.map((p) => [p.code, p]));
  const items = houses.map((h) => {
    const place = placeByCode.get(h.code);
    return {
      ...h,
      place: place
        ? {
            neighborhood: place.neighborhood,
            province: place.province,
            city: place.city,
            plotNo: place.plotNo,
          }
        : null,
    };
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('MANAGE_PROJECTS');
  if ('error' in auth) return auth.error;
  try {
    const data = schema.parse(await req.json());
    const code = data.code.toUpperCase().trim();

    const location = await syncPlaceFromHouse({
      code,
      name: data.name,
      neighborhood: data.neighborhood,
      province: data.province,
      city: data.city,
      plotNo: data.plotNo,
    });

    const existing = await prisma.house.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'CODE_EXISTS' }, { status: 409 });
    }

    const finish =
      data.targetFinishAt === null || data.targetFinishAt === ''
        ? null
        : data.targetFinishAt
          ? new Date(data.targetFinishAt)
          : undefined;

    const item = await prisma.house.create({
      data: {
        code,
        name: data.name.trim(),
        unitNumber: data.unitNumber ?? null,
        area: data.area ?? null,
        price: data.price ?? null,
        budgetIqd: data.budgetIqd,
        location,
        description: data.description ?? null,
        propertyId: data.propertyId || null,
        status: data.status,
        ...(finish !== undefined ? { targetFinishAt: finish } : {}),
      },
      include: { property: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'CODE_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
