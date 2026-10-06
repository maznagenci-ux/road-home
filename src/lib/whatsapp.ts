import { BRAND_NAME, BRAND_NAME_KU } from '@/lib/brand';

/** Normalize Iraqi / local phone to WhatsApp international digits (no +). */
export function toWhatsAppDigits(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('7')) return `964${digits}`;
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string | null | undefined, message: string): boolean {
  const url = whatsappUrl(phone, message);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export function tenantRentDueMessage(opts: {
  tenantName?: string | null;
  amountLabel: string;
  propertyCode?: string | null;
  period?: string | null;
}) {
  const name = opts.tenantName?.trim() || 'کرێچی';
  const period = opts.period ? ` (${opts.period})` : '';
  const code = opts.propertyCode ? ` · کۆدی موڵک: ${opts.propertyCode}` : '';
  return (
    `سڵاو ${name}،\n` +
    `ئێستا کاتی کرێت هاتووە${period}.\n` +
    `بڕی کرێ: ${opts.amountLabel}${code}\n` +
    `تکایە سەردانی ${BRAND_NAME_KU} بکە بۆ پارەدانی کرێی مانگەکە.\n` +
    `سوپاس — ${BRAND_NAME_KU}`
  );
}

export function landlordRentReadyMessage(opts: {
  landlordName?: string | null;
  amountLabel: string;
  propertyCode: string;
  period?: string | null;
}) {
  const name = opts.landlordName?.trim() || 'خاوەن موڵک';
  const period = opts.period ? ` بۆ ماوەی ${opts.period}` : '';
  return (
    `سڵاو ${name}،\n` +
    `کرێی موڵکەکەت وەرگیرا${period}.\n` +
    `بڕ: ${opts.amountLabel}\n` +
    `کۆدی خانوو: ${opts.propertyCode}\n` +
    `دەتوانیت بێیت بۆ وەرگرتنی کرێکە لە ${BRAND_NAME_KU}.\n` +
    `سوپاس`
  );
}

export function installmentOverdueMessage(opts: {
  partyName?: string | null;
  amountLabel: string;
  contractNo: string;
  dueDate: string;
}) {
  const name = opts.partyName?.trim() || 'کڕیار';
  return (
    `سڵاو ${name}،\n` +
    `قیستی گرێبەست ${opts.contractNo} دواکەوتووە (ڕێکەوت: ${opts.dueDate}).\n` +
    `بڕی ماوە: ${opts.amountLabel}\n` +
    `تکایە سەردانی ${BRAND_NAME_KU} بکە بۆ پارەدان.\n` +
    `سوپاس — ${BRAND_NAME}`
  );
}

export function ownerMonthlyReportMessage(opts: {
  year: number;
  month: number;
  pdfUrl?: string;
  ownerName?: string | null;
}) {
  const name = opts.ownerName?.trim() || 'خاوەن';
  const ym = `${opts.year}/${String(opts.month).padStart(2, '0')}`;
  const link = opts.pdfUrl ? `\nلینکی ڕاپۆرت: ${opts.pdfUrl}` : '';
  return (
    `سڵاو ${name}،\n` +
    `ڕاپۆرتی مانگانەی دارایی (${ym}) ئامادەیە لە ${BRAND_NAME_KU}.${link}\n` +
    `سوپاس`
  );
}

/** گرووپی کارمەندان — حەرزکردنی خانوو / شوێن بۆ ئەوەی هەمووان بیبینن */
export const STAFF_WHATSAPP_GROUP_URL =
  'https://chat.whatsapp.com/JqaAO7rVpaRF2EETelKcNs';

export type HouseReservePayload = {
  code: string;
  name: string;
  staffName?: string | null;
  price?: number | null;
  finalPrice?: number | null;
  area?: number | null;
  facadeM?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  guestRooms?: number | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  province?: string | null;
  plotNo?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Absolute site origin for relative /uploads paths */
  origin?: string | null;
};

function absoluteMediaUrl(url: string | null | undefined, origin?: string | null) {
  const u = url?.trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const base = (origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    '',
  );
  if (!base) return u;
  return u.startsWith('/') ? `${base}${u}` : `${base}/${u}`;
}

export function googleMapsUrl(opts: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}) {
  if (
    opts.lat != null &&
    opts.lng != null &&
    Number.isFinite(opts.lat) &&
    Number.isFinite(opts.lng)
  ) {
    return `https://www.google.com/maps?q=${opts.lat},${opts.lng}`;
  }
  const q = opts.address?.trim();
  if (q) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  return '';
}

function formatPriceIqd(n: number) {
  try {
    return `${new Intl.NumberFormat('en-US').format(Math.round(n))} دینار`;
  } catch {
    return `${Math.round(n)} دینار`;
  }
}

function numLine(label: string, n: number | null | undefined, unit = '') {
  if (n == null || !Number.isFinite(n)) return null;
  return `${label}: ${n}${unit}`;
}

export function houseReserveGroupMessage(opts: HouseReservePayload) {
  const who = opts.staffName?.trim() || 'کارمەند';
  const parts: string[] = [
    `🏠 حەرز — ${BRAND_NAME_KU}`,
    `ناو: ${opts.name}`,
    `کۆدی تایبەت: ${opts.code}`,
  ];

  const address =
    opts.address?.trim() ||
    [opts.neighborhood, opts.city, opts.province, opts.plotNo ? `پارچە ${opts.plotNo}` : '']
      .map((x) => x?.trim())
      .filter(Boolean)
      .join(' — ');
  if (address) parts.push(`ناونیشان: ${address}`);

  const area = numLine('ڕووبەر', opts.area, ' م²');
  if (area) parts.push(area);
  const facade = numLine('واجیهە', opts.facadeM, ' م');
  if (facade) parts.push(facade);
  const beds = numLine('ژووری نوستن', opts.bedrooms);
  if (beds) parts.push(beds);
  const baths = numLine('حەمام', opts.bathrooms);
  if (baths) parts.push(baths);
  const guests = numLine('ژووری میوان', opts.guestRooms);
  if (guests) parts.push(guests);

  if (opts.price != null && Number.isFinite(opts.price) && opts.price > 0) {
    parts.push(`نرخ: ${formatPriceIqd(opts.price)}`);
  }
  if (opts.finalPrice != null && Number.isFinite(opts.finalPrice) && opts.finalPrice > 0) {
    parts.push(`نرخی کۆتایی: ${formatPriceIqd(opts.finalPrice)}`);
  }

  const maps = googleMapsUrl({
    lat: opts.lat,
    lng: opts.lng,
    address: address || opts.name,
  });
  if (maps) parts.push(`لۆکەیشن (گووگڵ ماپ): ${maps}`);

  const urls = [
    ...(Array.isArray(opts.imageUrls) ? opts.imageUrls : []),
    opts.imageUrl,
  ]
    .map((u) => absoluteMediaUrl(u, opts.origin))
    .filter(Boolean);
  const unique = [...new Set(urls)].slice(0, 10);
  unique.forEach((u, i) => parts.push(`وێنە ${i + 1}: ${u}`));

  const video = absoluteMediaUrl(opts.videoUrl, opts.origin);
  if (video) parts.push(`ڤیدۆ: ${video}`);

  parts.push(`لەلایەن: ${who}`);
  parts.push('تکایە پێش فرۆشتن/کرێ ئەم حەرزە ڕەچاو بکەن.');
  return parts.join('\n');
}

/** دەقەکە کۆپی دەکات و واتساپ دەکاتەوە بە دەقی حەرز پڕکراو — گرووپی کارمەندان هەڵبژێرە و بنێرە. */
export async function openStaffGroupForHouseReserve(
  opts: HouseReservePayload,
): Promise<{ copied: boolean; opened: boolean }> {
  const text = houseReserveGroupMessage({
    ...opts,
    origin: opts.origin || (typeof window !== 'undefined' ? window.location.origin : undefined),
  });

  // wa.me/?text= — دەق پڕ دەبێت؛ بەکارهێنەر گرووپ/کەس هەڵدەبژێرێت (لینکی گرووپ دەق پشتگیری ناکات)
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  // سەرەتا بیکەرەوە (لە هەمان کلیک) تا پۆپئەپ بلۆک نەبێت
  let opened = false;
  const win = window.open(shareUrl, '_blank');
  if (win) {
    opened = true;
  } else {
    // پۆپئەپ بلۆک بوو — هەمان تاب
    try {
      window.location.assign(shareUrl);
      opened = true;
    } catch {
      opened = false;
    }
  }

  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      copied = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      copied = false;
    }
  }

  return { copied, opened };
}

export function staffDirectMessage(opts: {
  staffName?: string | null;
  body: string;
  fromName?: string | null;
}) {
  const to = opts.staffName?.trim() || 'کارمەند';
  const from = opts.fromName?.trim() || BRAND_NAME_KU;
  return `سڵاو ${to}،\n\n${opts.body.trim()}\n\n— ${from} (${BRAND_NAME_KU})`;
}

