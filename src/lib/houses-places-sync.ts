import { prisma } from '@/lib/prisma';
import { placeLocationLabel } from '@/lib/places';

type PlaceFields = {
  code: string;
  name: string;
  neighborhood: string;
  city: string;
  province: string;
  plotNo?: string;
};

/** Keep House in sync when a Place is created/updated. */
export async function syncHouseFromPlace(place: PlaceFields) {
  const code = place.code.toUpperCase().trim();
  const location = placeLocationLabel(place);
  await prisma.house.upsert({
    where: { code },
    create: {
      code,
      name: place.name.trim() || code,
      location,
      status: 'IN_CONSTRUCTION',
    },
    update: {
      name: place.name.trim() || code,
      location,
    },
  });
}

/** Keep Place in sync when a House is created/updated (contracts pick Places). */
export async function syncPlaceFromHouse(input: {
  code: string;
  name: string;
  neighborhood?: string | null;
  city?: string | null;
  province?: string | null;
  plotNo?: string | null;
  location?: string | null;
}) {
  const code = input.code.toUpperCase().trim();
  const neighborhood =
    (input.neighborhood?.trim() ||
      input.location?.split('—')[0]?.trim() ||
      '') || '';
  const name = input.name.trim() || code;
  const province = input.province?.trim() || 'هەولێر';
  const city = input.city?.trim() || 'هەولێر';
  const plotNo = input.plotNo?.trim() || '';

  await prisma.place.upsert({
    where: { code },
    create: {
      code,
      name,
      neighborhood: neighborhood || name,
      province,
      city,
      plotNo,
    },
    update: {
      name,
      ...(input.neighborhood != null
        ? { neighborhood: neighborhood || name }
        : {}),
      ...(input.province != null ? { province } : {}),
      ...(input.city != null ? { city } : {}),
      ...(input.plotNo != null ? { plotNo } : {}),
    },
  });

  return placeLocationLabel({
    neighborhood: neighborhood || name,
    name,
    city,
    province,
  });
}

/** When Place code changes, rename the matching House instead of orphaning it. */
export async function renameHouseCode(oldCode: string, newCode: string) {
  const from = oldCode.toUpperCase().trim();
  const to = newCode.toUpperCase().trim();
  if (from === to) return;

  const house = await prisma.house.findUnique({ where: { code: from } });
  if (!house) return;

  const clash = await prisma.house.findUnique({ where: { code: to } });
  if (clash) {
    // Merge: keep target house, drop empty duplicate source if unused
    const deps = await houseDependencyCount(house.id);
    if (deps === 0) {
      await prisma.house.delete({ where: { id: house.id } });
    }
    return;
  }

  await prisma.house.update({ where: { id: house.id }, data: { code: to } });
}

export async function houseDependencyCount(houseId: string) {
  const [contracts, leases, vouchers] = await Promise.all([
    prisma.contract.count({ where: { houseId } }),
    prisma.lease.count({ where: { houseId } }),
    prisma.voucher.count({ where: { houseId } }),
  ]);
  return contracts + leases + vouchers;
}

/** Delete Place's paired House only when unused. */
export async function deleteOrphanHouseByCode(code: string) {
  const house = await prisma.house.findUnique({
    where: { code: code.toUpperCase().trim() },
  });
  if (!house) return { deleted: false, blocked: false };
  const deps = await houseDependencyCount(house.id);
  if (deps > 0) return { deleted: false, blocked: true };
  await prisma.house.delete({ where: { id: house.id } });
  return { deleted: true, blocked: false };
}

/** Delete House's paired Place. */
export async function deletePlaceByCode(code: string) {
  await prisma.place.deleteMany({ where: { code: code.toUpperCase().trim() } });
}
