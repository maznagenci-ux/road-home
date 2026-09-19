/** Document checklist options for security anket (ئەنکێت). */
export const ANKET_DOCUMENT_OPTIONS = [
  { key: 'national-card', ckb: 'کارتی نیشتمانی', ar: 'البطاقة الوطنية', en: 'National card' },
  { key: 'information-card', ckb: 'کارتی زانیاری', ar: 'بطاقة المعلومات', en: 'Information card' },
  { key: 'passport', ckb: 'پاسپۆرت', ar: 'جواز السفر', en: 'Passport' },
  { key: 'mukhtar-letter', ckb: 'پشتگیری موختار / ئەنجوومەنی گەڕەک', ar: 'تأييد المختار', en: 'Mukhtar letter' },
  { key: 'security-code', ckb: 'کۆدی ئاسایش', ar: 'رمز الأمن', en: 'Security code' },
  { key: 'company-docs', ckb: 'بەڵگەنامەکانی کۆمپانیا', ar: 'وثائق الشركة', en: 'Company documents' },
  { key: 'work-docs', ckb: 'بەڵگەنامەکانی کارکردن', ar: 'وثائق العمل', en: 'Work documents' },
  { key: 'tax-clearance', ckb: 'پاکانەی باج', ar: 'براءة ذمة ضريبية', en: 'Tax clearance' },
  { key: 'food-form', ckb: 'فۆرمی خۆراک', ar: 'استمارة التموين', en: 'Food form' },
] as const;

export type AnketDocKey = (typeof ANKET_DOCUMENT_OPTIONS)[number]['key'];

export function labelAnketDoc(key: string, lang: string): string {
  const row = ANKET_DOCUMENT_OPTIONS.find((d) => d.key === key);
  if (!row) return key;
  if (lang === 'ar') return row.ar;
  if (lang === 'en') return row.en;
  return row.ckb;
}
