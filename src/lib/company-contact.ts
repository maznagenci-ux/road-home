import { prisma } from '@/lib/prisma';
import { BRAND_ADDRESS_KU, BRAND_PHONES } from '@/lib/brand';

export type CompanyContact = {
  address: string;
  address2: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
  phones: string[];
  /** Non-empty addresses for display (PDFs / reports). */
  addresses: string[];
};

function defaults(): CompanyContact {
  return {
    address: BRAND_ADDRESS_KU,
    address2: '',
    phone1: BRAND_PHONES[0],
    phone2: BRAND_PHONES[1],
    phone3: '',
    phone4: '',
    phones: [...BRAND_PHONES],
    addresses: [BRAND_ADDRESS_KU],
  };
}

let cache: CompanyContact | null = null;

function collectPhones(parts: string[]): string[] {
  const list = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  return list.length ? list : [...BRAND_PHONES];
}

function collectAddresses(a1: string, a2: string): string[] {
  const list = [a1, a2].map((p) => p.trim()).filter((p) => p.length > 0);
  return list.length ? list : [BRAND_ADDRESS_KU];
}

function fromRow(row: {
  address: string;
  address2?: string | null;
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
  const address = row.address.trim() || BRAND_ADDRESS_KU;
  const address2 = (row.address2 ?? '').trim();
  const addresses = collectAddresses(address, address2);
  return {
    address: addresses[0] ?? address,
    address2: addresses[1] ?? '',
    phone1: phones[0] ?? phone1,
    phone2: phones[1] ?? '',
    phone3: phones[2] ?? '',
    phone4: phones[3] ?? '',
    phones,
    addresses,
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

/** Single-line join for places that expect one address string. */
export function companyAddressLine(contact?: CompanyContact): string {
  const c = contact ?? companyContact();
  return c.addresses.join(' · ');
}

export function invalidateCompanyContactCache() {
  cache = null;
}

export async function upsertCompanyContact(input: {
  address: string;
  address2: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
  updatedBy?: string | null;
}): Promise<CompanyContact> {
  const address = input.address.trim() || BRAND_ADDRESS_KU;
  const address2 = input.address2.trim();
  const phone1 = input.phone1.trim() || BRAND_PHONES[0];
  const phone2 = input.phone2.trim();
  const phone3 = input.phone3.trim();
  const phone4 = input.phone4.trim();
  const row = await prisma.companyProfile.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      address,
      address2,
      phone1,
      phone2,
      phone3,
      phone4,
      updatedBy: input.updatedBy ?? null,
    },
    update: {
      address,
      address2,
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
