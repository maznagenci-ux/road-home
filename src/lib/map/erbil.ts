/** Erbil (Hawler) governorate map constants + neighborhood anchors from OSM. */

export const ERBIL_CENTER = { lat: 36.1911, lng: 44.0093 } as const;

/** Approximate Erbil Governorate view bounds (south, west, north, east). */
export const ERBIL_BOUNDS: [[number, number], [number, number]] = [
  [35.72, 43.35],
  [37.05, 45.15],
];

/** Nominatim / Overpass viewbox: left,top,right,bottom */
export const ERBIL_VIEWBOX = '43.35,37.05,45.15,35.72';

export type ErbilDistrict = {
  id: string;
  /** Kurdish (Sorani) display name */
  nameCkb: string;
  nameAr: string;
  nameEn: string;
  /** Real approximate centroid (OpenStreetMap / public maps) */
  lat: number;
  lng: number;
  aliases: string[];
};

/**
 * Major Erbil city & governorate localities with publicly known coordinates.
 * Used to place plot markers when a Place has no lat/lng yet.
 * Source: OpenStreetMap community data (approximate centroids).
 */
export const ERBIL_DISTRICTS: ErbilDistrict[] = [
  {
    id: 'erbil-center',
    nameCkb: 'ناوەندی هەولێر',
    nameAr: 'مركز أربيل',
    nameEn: 'Erbil Center',
    lat: 36.1911,
    lng: 44.0093,
    aliases: ['هەولێر', 'اربيل', 'erbil', 'hawler', 'center', 'ناوەند'],
  },
  {
    id: 'ankawa',
    nameCkb: 'عينكاوا',
    nameAr: 'عنكاوة',
    nameEn: 'Ankawa',
    lat: 36.2372,
    lng: 44.0089,
    aliases: ['عينكاوا', 'عنكاوة', 'ankawa', 'ainkawa', 'ankawa'],
  },
  {
    id: 'italian-city',
    nameCkb: 'شاری ئیتاڵی',
    nameAr: 'المدينة الإيطالية',
    nameEn: 'Italian City',
    lat: 36.1908,
    lng: 44.0415,
    aliases: ['ئیتاڵی', 'italian', 'italian city', 'italian village', 'المدينة الإيطالية'],
  },
  {
    id: 'dream-city',
    nameCkb: 'دریم سیتی',
    nameAr: 'دريم سيتي',
    nameEn: 'Dream City',
    lat: 36.1745,
    lng: 44.0382,
    aliases: ['دریم', 'dream', 'dream city', 'دريم'],
  },
  {
    id: 'gulan',
    nameCkb: 'گولان',
    nameAr: 'غولان',
    nameEn: 'Gulan',
    lat: 36.1985,
    lng: 44.0148,
    aliases: ['گولان', 'غولان', 'gulan', 'gulan 1', 'gulan 2', 'گولان ٢', 'گولان ٢'],
  },
  {
    id: 'seven-nisan',
    nameCkb: '٧ نیسان',
    nameAr: '٧ نيسان',
    nameEn: '7 Nisan',
    lat: 36.1824,
    lng: 44.0012,
    aliases: ['٧ نیسان', '7 nisan', '7 nissan', 'سبع نيسان', 'حەوتی نیسان'],
  },
  {
    id: '100m',
    nameCkb: '١٠٠ مەتری',
    nameAr: 'شارع المائة',
    nameEn: '100 Meter Street',
    lat: 36.1856,
    lng: 44.0241,
    aliases: ['١٠٠', '100m', '100 meter', 'مائة', 'مئة متر', 'شاری ١٠٠'],
  },
  {
    id: 'kurdistan',
    nameCkb: 'کوردستان',
    nameAr: 'كوردستان',
    nameEn: 'Kurdistan Quarter',
    lat: 36.1782,
    lng: 44.0085,
    aliases: ['کوردستان', 'kurdistan', 'كوردستان'],
  },
  {
    id: 'baharka',
    nameCkb: 'بەحرەکە',
    nameAr: 'بحرەكة',
    nameEn: 'Baharka',
    lat: 36.2785,
    lng: 44.0521,
    aliases: ['بەحرەکە', 'baharka', 'بحرەكة', 'بەهەرەکە'],
  },
  {
    id: 'shaqlawa',
    nameCkb: 'شەقڵاوە',
    nameAr: 'شقلاوة',
    nameEn: 'Shaqlawa',
    lat: 36.4056,
    lng: 44.3208,
    aliases: ['شەقڵاوە', 'shaqlawa', 'شقلاوة'],
  },
  {
    id: 'koya',
    nameCkb: 'کۆیە',
    nameAr: 'كويه',
    nameEn: 'Koya',
    lat: 36.0829,
    lng: 44.6281,
    aliases: ['کۆیە', 'koya', 'koysinjaq', 'كويه'],
  },
  {
    id: 'soran',
    nameCkb: 'سۆران',
    nameAr: 'سوران',
    nameEn: 'Soran',
    lat: 36.655,
    lng: 44.545,
    aliases: ['سۆران', 'soran', 'سوران', 'ديانا', 'diana'],
  },
  {
    id: 'makhmur',
    nameCkb: 'مەخموور',
    nameAr: 'مخمور',
    nameEn: 'Makhmur',
    lat: 35.778,
    lng: 43.578,
    aliases: ['مەخموور', 'makhmur', 'مخمور'],
  },
  {
    id: 'khabat',
    nameCkb: 'خەبات',
    nameAr: 'خبات',
    nameEn: 'Khabat',
    lat: 36.275,
    lng: 43.675,
    aliases: ['خەبات', 'khabat', 'خبات'],
  },
  {
    id: 'dashti-hawler',
    nameCkb: 'دەشتی هەولێر',
    nameAr: 'سهل أربيل',
    nameEn: 'Erbil Plain',
    lat: 36.12,
    lng: 43.95,
    aliases: ['دەشت', 'plain', 'سهل', 'dashti'],
  },
  {
    id: 'empire',
    nameCkb: 'ئیمپایر',
    nameAr: 'إمباير',
    nameEn: 'Empire World',
    lat: 36.2055,
    lng: 44.0352,
    aliases: ['ئیمپایر', 'empire', 'empire world', 'إمباير'],
  },
  {
    id: 'english-village',
    nameCkb: 'گوندی ئینگلیزی',
    nameAr: 'القرية الإنجليزية',
    nameEn: 'English Village',
    lat: 36.2012,
    lng: 44.0288,
    aliases: ['ئینگلیزی', 'english village', 'english', 'القرية الإنجليزية'],
  },
  {
    id: 'naz',
    nameCkb: 'ناز سیتی',
    nameAr: 'ناز سيتي',
    nameEn: 'Naz City',
    lat: 36.1688,
    lng: 44.0195,
    aliases: ['ناز', 'naz', 'naz city'],
  },
];

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export function matchErbilDistrict(query: string): ErbilDistrict | null {
  const q = normalize(query);
  if (!q) return null;
  for (const d of ERBIL_DISTRICTS) {
    const names = [d.nameCkb, d.nameAr, d.nameEn, ...d.aliases].map(normalize);
    if (names.some((n) => n === q || q.includes(n) || n.includes(q))) return d;
  }
  return null;
}

/** Small jitter so multiple plots in same district do not stack exactly. */
export function offsetPlot(lat: number, lng: number, seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const dLat = ((h % 100) - 50) * 0.00012;
  const dLng = (((h >> 8) % 100) - 50) * 0.00012;
  return { lat: lat + dLat, lng: lng + dLng };
}
