const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Sample Erbil plots with real neighborhood coords (OpenStreetMap anchors). */
const PLOTS = [
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
  {
    code: 'P-107',
    plotNo: '19',
    neighborhood: 'ئیمپایر',
    name: 'ئەرز ١٩',
    lat: 36.2055,
    lng: 44.0352,
  },
  {
    code: 'P-108',
    plotNo: '663',
    neighborhood: 'ناز سیتی',
    name: 'ئەرز ٦٦٣',
    lat: 36.1688,
    lng: 44.0195,
  },
];

async function main() {
  for (const row of PLOTS) {
    const place = await prisma.place.upsert({
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

    console.log('ok', place.code, place.plotNo);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
