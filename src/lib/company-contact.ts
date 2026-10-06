import { prisma } from '@/lib/prisma';
import { BRAND_ADDRESS_KU, BRAND_PHONES } from '@/lib/brand';

export type CompanyContact = {
  address: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
  phones: string[];
};

function defaults(): CompanyContact {
  return {
    address: BRAND_ADDRESS_KU,
    phone1: BRAND_PHONES[0],
    phone2: BRAND_PHONES[1],
    phone3: '',
    phone4: '',
    phones: [...BRAND_PHONES],
  };
}

let cache: CompanyContact | null = null;

function collectPhones(parts: string[]): string[] {
  const list = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  return list.length ? list : [...BRAND_PHONES];
}

function fromRow(row: {
  address: string;
  phone1: string;
  phone2: string;
  phone3?: string;
  phone4?: string;
}): CompanyContact {
  const phone1 = row.phone1.trim() || BRAND_PHONES[0];
  const phone2 = row.phone2.trim();
  const phone3 = (row.phone3 ?? '').trim();
  const phone4 = (row.phone4 ?? '').trim();
  const phones = collectPhones([phone1, phone2, phone3, phone4]);
  return {
    address: row.address.trim() || BRAND_ADDRESS_KU,
    phone1: phones[0] ?? phone1,
    phone2: phones[1] ?? '',
    phone3: phones[2] ?? '',
    phone4: phones[3] ?? '',
    phones,
  };
}

/** Load from DB into process cache (call before rendering PDF). */
export async function loadCompanyContact(): Promise<CompanyContact> {
  try {
    const row = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    cache = row ? fromRow(row) : defaults();
  } catch {
    cache = defaults();
  }
  return cache;
}

/** Sync read — uses cache or code defaults (warm with loadCompanyContact first). */
export function companyContact(): CompanyContact {
  return cache ?? defaults();
}

export function invalidateCompanyContactCache() {
  cache = null;
}

export async function upsertCompanyContact(input: {
  address: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
  updatedBy?: string | null;
}): Promise<CompanyContact> {
  const address = input.address.trim() || BRAND_ADDRESS_KU;
  const phone1 = input.phone1.trim() || BRAND_PHONES[0];
  const phone2 = input.phone2.trim();
  const phone3 = input.phone3.trim();
  const phone4 = input.phone4.trim();
  const row = await prisma.companyProfile.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      address,
      phone1,
      phone2,
      phone3,
      phone4,
      updatedBy: input.updatedBy ?? null,
    },
    update: {
      address,
      phone1,
      phone2,
      phone3,
      phone4,
      updatedBy: input.updatedBy ?? null,
    },
  });
  cache = fromRow(row);
  return cache;
}
