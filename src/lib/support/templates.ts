import { BRAND_NAME } from '@/lib/brand';
import type { Locale } from '@/i18n/locale-config';

export type SupportRecipientKind = 'GOVERNMENT' | 'CONSULATE' | 'OTHER';
export type SupportPurpose =
  | 'OWNERSHIP'
  | 'RENTAL'
  | 'RESIDENCY'
  | 'TRANSACTION'
  | 'OTHER';

export const SUPPORT_RECIPIENT_KINDS: SupportRecipientKind[] = [
  'GOVERNMENT',
  'CONSULATE',
  'OTHER',
];

export const SUPPORT_PURPOSES: SupportPurpose[] = [
  'OWNERSHIP',
  'RENTAL',
  'RESIDENCY',
  'TRANSACTION',
  'OTHER',
];

export type SupportTemplateVars = {
  beneficiary: string;
  idNo: string;
  phone: string;
  propertyRef: string;
  toName: string;
  company: string;
};

function fill(template: string, vars: SupportTemplateVars) {
  return template
    .replaceAll('{beneficiary}', vars.beneficiary)
    .replaceAll('{idNo}', vars.idNo)
    .replaceAll('{phone}', vars.phone)
    .replaceAll('{propertyRef}', vars.propertyRef)
    .replaceAll('{toName}', vars.toName)
    .replaceAll('{company}', vars.company);
}

const SUBJECTS: Record<SupportPurpose, Record<Locale, string>> = {
  OWNERSHIP: {
    ckb: 'پشتگیریی خاوەندارێتی موڵک',
    ar: 'تأييد ملكية عقار',
    en: 'Property ownership confirmation',
  },
  RENTAL: {
    ckb: 'پشتگیریی گرێبەستی کرێ',
    ar: 'تأييد عقد إيجار',
    en: 'Rental contract confirmation',
  },
  RESIDENCY: {
    ckb: 'پشتگیریی ناونیشان / نیشتەجێبوون',
    ar: 'تأييد العنوان / الإقامة',
    en: 'Address / residency confirmation',
  },
  TRANSACTION: {
    ckb: 'پشتگیریی مامەڵەی کڕین و فرۆشتن',
    ar: 'تأييد معاملة بيع وشراء',
    en: 'Buy/sell transaction confirmation',
  },
  OTHER: {
    ckb: 'پشتگیریی فەرمی',
    ar: 'تأييد رسمي',
    en: 'Official support letter',
  },
};

const BODIES: Record<SupportPurpose, Record<Locale, string>> = {
  OWNERSHIP: {
    ckb: `بە ناوی خودای گەورە و میهرەبان

بۆ: {toName}

دوای سڵاو و ڕێز،

ئەمە پشتگیرییەکی فەرمییە لەلایەن {company} کە پشتڕاستی دەکاتەوە خاتوون/بەڕێز ({beneficiary})، خاوەنی ناسنامە/پاسپۆرت ژمارە ({idNo})، پەیوەندی: ({phone})، خاوەنی ئەو موڵک/ناونیشانەیە کە لە سیستەمی ئێمە تۆمارکراوە:

{propertyRef}

ئەم پشتگیرییە بۆ پێشکەشکردن بە دائیرە فەرمییەکانی حکومەت یان کونسوڵخانە دەردەچێت و تەنها بۆ مەبەستی فەرمی بەکاردێت.

بە ڕێزەوە،
{company}`,
    ar: `بسم الله الرحمن الرحيم

إلى: {toName}

بعد التحية والتقدير،

هذا كتاب تأييد رسمي صادر عن {company} يؤكد أن السيد/ة ({beneficiary})، حامل/ة هوية/جواز رقم ({idNo})، الهاتف ({phone})، هو/هي مالك العقار/العنوان المسجّل لدينا:

{propertyRef}

يُصدر هذا التأييد لتقديمه إلى الدوائر الحكومية الرسمية أو القنصليات، ويُستخدم للأغراض الرسمية فقط.

وتفضلوا بقبول فائق الاحترام،
{company}`,
    en: `To: {toName}

Dear Sir/Madam,

This is an official confirmation letter issued by {company} verifying that ({beneficiary}), ID/Passport No. ({idNo}), Phone ({phone}), is the owner of the property/address registered with us:

{propertyRef}

This letter is issued for submission to official government departments or consulates and is intended for official use only.

Respectfully,
{company}`,
  },
  RENTAL: {
    ckb: `بە ناوی خودای گەورە و میهرەبان

بۆ: {toName}

دوای سڵاو و ڕێز،

ئەمە پشتگیرییەکی فەرمییە لەلایەن {company} کە پشتڕاستی دەکاتەوە خاتوون/بەڕێز ({beneficiary})، ناسنامە/پاسپۆرت ({idNo})، پەیوەندی ({phone})، لایەنێکە لە گرێبەستی کرێی تۆمارکراو لە کۆمپانیاکەماندا سەبارەت بە:

{propertyRef}

ئەم پشتگیرییە بۆ دائیرە فەرمییەکان یان کونسوڵخانە دەردەچێت.

بە ڕێزەوە،
{company}`,
    ar: `بسم الله الرحمن الرحيم

إلى: {toName}

بعد التحية والتقدير،

هذا كتاب تأييد رسمي صادر عن {company} يؤكد أن السيد/ة ({beneficiary})، هوية/جواز ({idNo})، الهاتف ({phone})، طرف في عقد إيجار مسجّل لدى شركتنا بخصوص:

{propertyRef}

يُصدر هذا التأييد للدوائر الرسمية أو القنصليات.

وتفضلوا بقبول فائق الاحترام،
{company}`,
    en: `To: {toName}

Dear Sir/Madam,

This official letter from {company} confirms that ({beneficiary}), ID/Passport ({idNo}), Phone ({phone}), is a party to a rental contract registered with our company regarding:

{propertyRef}

Issued for official government departments or consulates.

Respectfully,
{company}`,
  },
  RESIDENCY: {
    ckb: `بە ناوی خودای گەورە و میهرەبان

بۆ: {toName}

دوای سڵاو و ڕێز،

ئەمە پشتگیرییەکی فەرمییە لەلایەن {company} کە پشتڕاستی دەکاتەوە ناونیشانی خاتوون/بەڕێز ({beneficiary})، ناسنامە/پاسپۆرت ({idNo})، پەیوەندی ({phone})، بەپێی تۆمارەکانی ئێمە:

{propertyRef}

ئەم پشتگیرییە بۆ پێشکەشکردن بە دائیرەی فەرمی یان کونسوڵخانە دەردەچێت.

بە ڕێزەوە،
{company}`,
    ar: `بسم الله الرحمن الرحيم

إلى: {toName}

بعد التحية والتقدير،

هذا كتاب تأييد رسمي صادر عن {company} يؤكد عنوان السيد/ة ({beneficiary})، هوية/جواز ({idNo})، الهاتف ({phone})، وفق سجلاتنا:

{propertyRef}

يُصدر هذا التأييد لتقديمه إلى دائرة رسمية أو قنصلية.

وتفضلوا بقبول فائق الاحترام،
{company}`,
    en: `To: {toName}

Dear Sir/Madam,

This official letter from {company} confirms the address of ({beneficiary}), ID/Passport ({idNo}), Phone ({phone}), according to our records:

{propertyRef}

Issued for submission to an official department or consulate.

Respectfully,
{company}`,
  },
  TRANSACTION: {
    ckb: `بە ناوی خودای گەورە و میهرەبان

بۆ: {toName}

دوای سڵاو و ڕێز،

ئەمە پشتگیرییەکی فەرمییە لەلایەن {company} کە پشتڕاستی دەکاتەوە خاتوون/بەڕێز ({beneficiary})، ناسنامە/پاسپۆرت ({idNo})، پەیوەندی ({phone})، لایەنێکە لە مامەڵەی کڕین و فرۆشتنی موڵک کە لە کۆمپانیاکەماندا تۆمارکراوە:

{propertyRef}

ئەم پشتگیرییە بۆ دائیرە فەرمییەکان یان کونسوڵخانە دەردەچێت.

بە ڕێزەوە،
{company}`,
    ar: `بسم الله الرحمن الرحيم

إلى: {toName}

بعد التحية والتقدير،

هذا كتاب تأييد رسمي صادر عن {company} يؤكد أن السيد/ة ({beneficiary})، هوية/جواز ({idNo})، الهاتف ({phone})، طرف في معاملة بيع وشراء عقار مسجّلة لدى شركتنا:

{propertyRef}

يُصدر هذا التأييد للدوائر الرسمية أو القنصليات.

وتفضلوا بقبول فائق الاحترام،
{company}`,
    en: `To: {toName}

Dear Sir/Madam,

This official letter from {company} confirms that ({beneficiary}), ID/Passport ({idNo}), Phone ({phone}), is a party to a buy/sell property transaction registered with our company:

{propertyRef}

Issued for official government departments or consulates.

Respectfully,
{company}`,
  },
  OTHER: {
    ckb: `بە ناوی خودای گەورە و میهرەبان

بۆ: {toName}

دوای سڵاو و ڕێز،

ئەمە پشتگیرییەکی فەرمییە لەلایەن {company} سەبارەت بە خاتوون/بەڕێز ({beneficiary})، ناسنامە/پاسپۆرت ({idNo})، پەیوەندی ({phone}).

زانیاریی پەیوەندیدار:
{propertyRef}

ئەم پشتگیرییە بۆ پێشکەشکردن بە دائیرەی فەرمی یان کونسوڵخانە دەردەچێت.

بە ڕێزەوە،
{company}`,
    ar: `بسم الله الرحمن الرحيم

إلى: {toName}

بعد التحية والتقدير،

هذا كتاب تأييد رسمي صادر عن {company} بخصوص السيد/ة ({beneficiary})، هوية/جواز ({idNo})، الهاتف ({phone}).

المعلومات ذات الصلة:
{propertyRef}

يُصدر هذا التأييد لتقديمه إلى دائرة رسمية أو قنصلية.

وتفضلوا بقبول فائق الاحترام،
{company}`,
    en: `To: {toName}

Dear Sir/Madam,

This is an official support letter from {company} regarding ({beneficiary}), ID/Passport ({idNo}), Phone ({phone}).

Related information:
{propertyRef}

Issued for submission to an official department or consulate.

Respectfully,
{company}`,
  },
};

const DEFAULT_TO: Record<SupportRecipientKind, Record<Locale, string>> = {
  GOVERNMENT: {
    ckb: 'دائیرەی فەرمیی پەیوەندیدار — حکومەتی هەرێمی کوردستان / عێراق',
    ar: 'الدائرة الرسمية المختصة — حكومة إقليم كردستان / العراق',
    en: 'The competent official department — KRG / Iraq',
  },
  CONSULATE: {
    ckb: 'کونسوڵخانەی پەیوەندیدار',
    ar: 'القنصلية المختصة',
    en: 'The concerned Consulate',
  },
  OTHER: {
    ckb: 'لایەنی فەرمیی پەیوەندیدار',
    ar: 'الجهة الرسمية المختصة',
    en: 'The concerned official authority',
  },
};

export function supportPurposeSubject(purpose: SupportPurpose, locale: Locale) {
  return SUBJECTS[purpose][locale];
}

export function supportDefaultToName(kind: SupportRecipientKind, locale: Locale) {
  return DEFAULT_TO[kind][locale];
}

export function buildSupportLetterBody(
  purpose: SupportPurpose,
  locale: Locale,
  vars: Partial<SupportTemplateVars>,
) {
  const filled: SupportTemplateVars = {
    beneficiary: vars.beneficiary?.trim() || '—',
    idNo: vars.idNo?.trim() || '—',
    phone: vars.phone?.trim() || '—',
    propertyRef: vars.propertyRef?.trim() || '—',
    toName: vars.toName?.trim() || '—',
    company: vars.company?.trim() || BRAND_NAME,
  };
  return fill(BODIES[purpose][locale], filled);
}

export function recipientKindLabel(kind: string, locale: Locale) {
  if (locale === 'ar') {
    if (kind === 'CONSULATE') return 'قنصلية';
    if (kind === 'OTHER') return 'جهة أخرى';
    return 'دائرة حكومية رسمية';
  }
  if (locale === 'en') {
    if (kind === 'CONSULATE') return 'Consulate';
    if (kind === 'OTHER') return 'Other authority';
    return 'Government department';
  }
  if (kind === 'CONSULATE') return 'کونسوڵخانە';
  if (kind === 'OTHER') return 'لایەنی تر';
  return 'دائیرەی فەرمی حکومەت';
}

export function purposeLabel(purpose: string, locale: Locale) {
  const map: Record<string, Record<Locale, string>> = {
    OWNERSHIP: { ckb: 'خاوەندارێتی', ar: 'ملكية', en: 'Ownership' },
    RENTAL: { ckb: 'کرێ', ar: 'إيجار', en: 'Rental' },
    RESIDENCY: { ckb: 'ناونیشان / نیشتەجێبوون', ar: 'عنوان / إقامة', en: 'Residency' },
    TRANSACTION: { ckb: 'کڕین و فرۆشتن', ar: 'بيع وشراء', en: 'Buy & sell' },
    OTHER: { ckb: 'هیتر', ar: 'أخرى', en: 'Other' },
  };
  return map[purpose]?.[locale] ?? purpose;
}
