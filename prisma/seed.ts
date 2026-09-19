import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedAccountingChart } from '../src/lib/accounting/seed-chart';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Migrate legacy role strings if present
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE User SET role = 'SUPER_ADMIN' WHERE role IN ('ADMIN', 'admin')`,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE User SET role = 'SITE_SUPERVISOR' WHERE role IN ('MANAGER', 'manager')`,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE User SET role = 'VIEW_ONLY' WHERE role IN ('USER', 'user')`,
    );
  } catch {
    // ignore if enum already migrated
  }

  const admin = await prisma.user.upsert({
    where: { email: 'admin@raothome.com' },
    update: { role: 'SUPER_ADMIN', name: 'Super Admin' },
    create: {
      email: 'admin@raothome.com',
      passwordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      locale: 'ku',
    },
  });

  const accountantHash = await bcrypt.hash('account123', 10);
  await prisma.user.upsert({
    where: { email: 'accountant@raothome.com' },
    update: { role: 'ACCOUNTANT' },
    create: {
      email: 'accountant@raothome.com',
      passwordHash: accountantHash,
      name: 'Sara Accountant',
      role: 'ACCOUNTANT',
      locale: 'ku',
    },
  });

  const salesHash = await bcrypt.hash('sales123', 10);
  await prisma.user.upsert({
    where: { email: 'sales@raothome.com' },
    update: { role: 'SALESPERSON', name: 'Dilan Sales' },
    create: {
      email: 'sales@raothome.com',
      passwordHash: salesHash,
      name: 'Dilan Sales',
      role: 'SALESPERSON',
      locale: 'ku',
    },
  });

  // Migrate legacy site supervisor account if present
  await prisma.user
    .updateMany({
      where: { email: 'site@raothome.com' },
      data: { role: 'SALESPERSON' },
    })
    .catch(() => undefined);

  const viewerHash = await bcrypt.hash('view123', 10);
  await prisma.user.upsert({
    where: { email: 'viewer@raothome.com' },
    update: { role: 'VIEW_ONLY', name: 'Rawa Staff' },
    create: {
      email: 'viewer@raothome.com',
      passwordHash: viewerHash,
      name: 'Rawa Staff',
      role: 'VIEW_ONLY',
      locale: 'ku',
    },
  });

  const projects = [
    {
      code: 'H-101',
      name: 'Villa North',
      location: 'Erbil — Italian City',
      status: 'IN_CONSTRUCTION' as const,
      budgetIqd: 450_000_000,
    },
    {
      code: 'H-102',
      name: 'Garden Court',
      location: 'Erbil — Dream City',
      status: 'IN_CONSTRUCTION' as const,
      budgetIqd: 280_000_000,
    },
    {
      code: 'BLD-2026',
      name: 'Skyline Tower A',
      location: 'Sulaymaniyah — Bakrajo',
      status: 'FINISHED' as const,
      budgetIqd: 520_000_000,
    },
    {
      code: 'H-210',
      name: 'River Side',
      location: 'Duhok — Malta',
      status: 'SOLD' as const,
      budgetIqd: 190_000_000,
    },
  ];

  for (const p of projects) {
    await prisma.house.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        location: p.location,
        status: p.status,
        budgetIqd: p.budgetIqd,
      },
      create: p,
    });
  }

  const erbilPlots = [
    {
      code: 'P-101',
      plotNo: '1248',
      neighborhood: 'عينكاوا',
      name: 'ئەرز ١٢٤٨',
      lat: 36.2372,
      lng: 44.0089,
    },
    {
      code: 'P-102',
      plotNo: '356',
      neighborhood: 'شاری ئیتاڵی',
      name: 'ئەرز ٣٥٦',
      lat: 36.1908,
      lng: 44.0415,
    },
    {
      code: 'P-103',
      plotNo: '892',
      neighborhood: 'دریم سیتی',
      name: 'ئەرز ٨٩٢',
      lat: 36.1745,
      lng: 44.0382,
    },
    {
      code: 'P-104',
      plotNo: '77',
      neighborhood: 'گولان',
      name: 'ئەرز ٧٧',
      lat: 36.1985,
      lng: 44.0148,
    },
    {
      code: 'P-105',
      plotNo: '2105',
      neighborhood: '٧ نیسان',
      name: 'ئەرز ٢١٠٥',
      lat: 36.1824,
      lng: 44.0012,
    },
    {
      code: 'P-106',
      plotNo: '441',
      neighborhood: '١٠٠ مەتری',
      name: 'ئەرز ٤٤١',
      lat: 36.1856,
      lng: 44.0241,
    },
  ];

  for (const row of erbilPlots) {
    await prisma.place.upsert({
      where: { code: row.code },
      update: {
        plotNo: row.plotNo,
        neighborhood: row.neighborhood,
        name: row.name,
        province: 'هەولێر',
        city: 'هەولێر',
        lat: row.lat,
        lng: row.lng,
      },
      create: {
        code: row.code,
        plotNo: row.plotNo,
        neighborhood: row.neighborhood,
        name: row.name,
        province: 'هەولێر',
        city: 'هەولێر',
        lat: row.lat,
        lng: row.lng,
      },
    });
    await prisma.house.upsert({
      where: { code: row.code },
      update: {
        name: row.name,
        location: `${row.neighborhood} — هەولێر · رەقەم ${row.plotNo}`,
      },
      create: {
        code: row.code,
        name: row.name,
        location: `${row.neighborhood} — هەولێر · رەقەم ${row.plotNo}`,
        status: 'IN_CONSTRUCTION',
      },
    });
  }

  const h101 = await prisma.house.findUniqueOrThrow({ where: { code: 'H-101' } });
  const existing = await prisma.voucher.count({ where: { houseId: h101.id } });

  if (existing === 0) {
    const fx = 150_000;
    const lockedAt = new Date();
    await prisma.voucher.createMany({
      data: [
        {
          voucherNo: 'VH-202600001',
          houseId: h101.id,
          accountType: 'EXPENSE',
          category: 'STEEL',
          amountIqd: 18_500_000,
          amountUsd: 18_500_000 / fx,
          exchangeRate: fx,
          exchangeLockedAt: lockedAt,
          paymentMethod: 'CASH_VAULT',
          partyName: 'Erbil Steel Co.',
          note: 'Rebar delivery batch #1',
          status: 'POSTED',
          createdById: admin.id,
        },
        {
          voucherNo: 'VH-202600002',
          houseId: h101.id,
          accountType: 'EXPENSE',
          category: 'CEMENT',
          amountIqd: 9_200_000,
          amountUsd: 9_200_000 / fx,
          exchangeRate: fx,
          exchangeLockedAt: lockedAt,
          paymentMethod: 'CREDIT',
          partyName: 'Kurdistan Cement',
          note: '50 tons OPC',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'POSTED',
          createdById: admin.id,
        },
      ],
    });
  }

  const leaseCount = await prisma.lease.count();
  if (leaseCount === 0) {
    await prisma.lease.create({
      data: {
        leaseNo: 'LS-2026-0001',
        propertyCode: 'H-102',
        propertyName: 'Garden Court',
        tenantName: 'Hana Tenant',
        tenantPhone: '0750-111-2222',
        startDate: new Date('2026-01-01'),
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        monthlyRentIqd: 1_200_000,
        securityDepositIqd: 2_400_000,
        depositStatus: 'HELD',
        status: 'ACTIVE',
        houseId: (await prisma.house.findUnique({ where: { code: 'H-102' } }))?.id,
        notes: 'Sample lease — expires within 30 days',
      },
    });
  }

  await seedAccountingChart(prisma);

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      userName: admin.name,
      action: 'SYSTEM_SEED',
      projectCode: 'H-101',
      amountIqd: null,
      meta: 'Access control module seeded',
    },
  });

  console.log('✅ Seed complete');
  console.log('   Super Admin:  admin@raothome.com / admin123');
  console.log('   Accountant:   accountant@raothome.com / account123');
  console.log('   Salesperson:  sales@raothome.com / sales123');
  console.log('   Staff:        viewer@raothome.com / view123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
