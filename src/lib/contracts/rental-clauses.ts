/**
 * Fixed (non-editable) legal clauses for rental contracts.
 * Structure follows Road Home PDF contract style (17 clauses).
 * Dynamic values are injected at render time; the templates themselves never change in the UI.
 */

import type { Locale } from '@/i18n/locale-config';
import { BRAND_NAME } from '@/lib/brand';

export type RentalClauseVars = {
  landlordName: string;
  tenantName: string;
  propertyType: string;
  propertyCode: string;
  propertyName: string;
  areaSqm: string;
  monthlyRent: string;
  advancePayment: string;
  securityDeposit: string;
  commissionLandlord: string;
  commissionTenant: string;
  dailyPenalty: string;
  cancelFee: string;
  durationMonths: string;
  startDate: string;
  endDate: string;
  signingDate: string;
  organizerName: string;
};

const FALLBACK: RentalClauseVars = {
  landlordName: '—',
  tenantName: '—',
  propertyType: '—',
  propertyCode: '—',
  propertyName: '—',
  areaSqm: '—',
  monthlyRent: '—',
  advancePayment: '—',
  securityDeposit: '—',
  commissionLandlord: '—',
  commissionTenant: '—',
  dailyPenalty: '—',
  cancelFee: '—',
  durationMonths: '—',
  startDate: '—',
  endDate: '—',
  signingDate: '—',
  organizerName: BRAND_NAME,
};

function fill(template: string, vars: RentalClauseVars) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key as keyof RentalClauseVars];
    return v != null && String(v).trim() !== '' ? String(v) : FALLBACK[key as keyof RentalClauseVars];
  });
}

/** Kurdish (Sorani) fixed clause templates. */
const CLAUSES_CKB: string[] = [
  'بەندی ١: لایەنی یەکەم ({landlordName} — بەکرێدەر) دان بە بەکرێدانی ئەم موڵکە دەنێت بۆ لایەنی دووەم ({tenantName} — کرێچی)، و هیچ مافێکی دیکە لە دەرەوەی ئەم گرێبەستەدا نییە کە واژووی لەسەر کراوە.',
  'بەندی ٢: جۆری موڵک: {propertyType}، ژمارە/کۆد: {propertyCode}، ناو: {propertyName}، ڕووبەر: {areaSqm} م٢.',
  'بەندی ٣: بڕی کرێی مانگانە ڕێککەوتوو بریتییە لە {monthlyRent}، پێشەکی {advancePayment}، و بڕی بارمتەی وەرگیراو {securityDeposit}.',
  `بەندی ٤: بڕی بارمتە و پارەی پێشەکی لای ${BRAND_NAME} (وەک دەستەبەر) دەمێنێتەوە تا کۆتایی ماوەی کرێ یان گەڕاندنەوەی یاسایی بارمتە بەپێی مەرجەکان.`,
  'بەندی ٥: ئەگەر هەر لایەنێک بەبێ هۆی یاسایی گرێبەست هەڵبوەشێنێتەوە، دەبێت بڕی {cancelFee} وەک سزای هەڵوەشاندنەوە بدات بە لایەنی بەرامبەر.',
  'بەندی ٦: لایەنی دووەم (کرێچی) پێش وەرگرتنی کلیل دەبێت پشکنینی ئاسوودەیی و لایەنی ڕەزامەندی خۆی بەجێبهێنێت و کلیل وەرگرێت و بچێتە ناو موڵکەکە.',
  'بەندی ٧: بەرواری وەرگرتن و چۆڵکردنی موڵک بەپێی ماوەی گرێبەست ({durationMonths} مانگ؛ لە {startDate} تا {endDate}) دەبێت. بۆ هەر ڕۆژ دواکەوتن لە چۆڵکردن، {dailyPenalty} وەک کرێی ڕۆژانە دەبێت لایەنی دووەم بدات.',
  'بەندی ٨: ئەگەر موڵکەکە لە کاتی گرێبەستدا کرێچی پێشووی هەبێت، هەردوو لا پێکەوە ڕێکدەکەون بۆ چۆڵکردنی موڵک لە کاتی گونجاودا وەک لە گرێبەستدا نووسراوە.',
  'بەندی ٩: لایەنی دووەم تەماشای ئەم موڵکە کردووە بە تەواوی و بە ڕەزامەندی و بێستۆی خۆی، و هیچ پاڵنەرێکی دیکە نییە لەم گرێبەستەدا.',
  `بەندی ١٠: لایەنی یەکەم بڕی {commissionLandlord} بۆ خزمەتگوزارییەکان و خەرجییەکان لای ${BRAND_NAME} دەدات؛ لایەنی دووەم بڕی {commissionTenant} دەدات. ئەم پارەیە تا کۆتایی مامەڵە لای کۆمپانیا دەمێنێتەوە و دواتر پسوولە وەردەگیرێت.`,
  `بەندی ١١: لە کاتی بوونی هەر کێشەیەک، یەکەم جار بە گفتوگۆ چارەسەر دەکرێت؛ ئەگەر چارەسەر نەکرا، دەگەڕێنرێتەوە بۆ دادگای هەولێر و فەرمانبەرانی ${BRAND_NAME} (وەک شایەت) ئامادە دەبن لە کاتی داواکردندا.`,
  'بەندی ١٢: هەردوو لایەن پابەندن بە پێدانی دەستخۆشی/خزمەتگوزاری: {commissionLandlord} لە بەکرێدەر و {commissionTenant} لە کرێچی بۆ ڕێکخەری گرێبەست ({organizerName}).',
  'بەندی ١٣: پێویستە لایەنی یەکەم (بەکرێدەر) هەر بەڵگەنامەی یاسایی پێویست بۆ بەکرێدان بدات و مافی بەکرێدانی موڵکەکەی هەبێت.',
  'بەندی ١٤: پارەی کارەبا، ئاو، غاز، خزمەتگوزاری و هەر خەرجییەکی بەکارهێنان لە ماوەی کرێدا لەسەر لایەنی دووەم (کرێچی) دەبێت، مەگەر بەپێچەوانە ڕێککەوتن نەکرابێت.',
  'بەندی ١٥: باج و ڕسووماتی یاسایی کە لەسەر خاوەن موڵکە، لەسەر لایەنی یەکەم دەبێت؛ ئەوانەی لەسەر کرێچین لەسەر لایەنی دووەم دەبێت.',
  `بەندی ١٦: ئەم گرێبەستە لە ڕێکەوتی {signingDate} لە شاری هەولێر (${BRAND_NAME}) واژوو کرا.`,
  'بەندی ١٧: ئەم گرێبەستە لە ١٧ بەند پێکهاتووە و هەردوو لا پابەندن بە هەموو بەندەکان.',
];

const CLAUSES_AR: string[] = [
  'البند ١: يقر الطرف الأول ({landlordName} — المؤجر) بتأجير هذا العقار للطرف الثاني ({tenantName} — المستأجر)، وليس له أي حق آخر خارج هذا العقد الموقع.',
  'البند ٢: نوع العقار: {propertyType}، الرقم/الرمز: {propertyCode}، الاسم: {propertyName}، المساحة: {areaSqm} م٢.',
  'البند ٣: بدل الإيجار الشهري المتفق عليه هو {monthlyRent}، والمقدم {advancePayment}، ومبلغ التأمين المستلم {securityDeposit}.',
  `البند ٤: يبقى مبلغ التأمين والمقدم لدى ${BRAND_NAME} (كفالة) حتى نهاية مدة الإيجار أو رد التأمين قانوناً وفق الشروط.`,
  'البند ٥: إذا فسخ أي طرف العقد دون سبب قانوني، يدفع مبلغ {cancelFee} كغرامة فسخ للطرف الآخر.',
  'البند ٦: على الطرف الثاني (المستأجر) قبل استلام المفتاح إجراء المعاينة والرضا واستلام المفتاح ودخول العقار.',
  'البند ٧: تاريخ الاستلام والإخلاء وفق مدة العقد ({durationMonths} شهراً؛ من {startDate} إلى {endDate}). عن كل يوم تأخير في الإخلاء يدفع الطرف الثاني {dailyPenalty} كإيجار يومي.',
  'البند ٨: إذا كان للعقار مستأجر سابق وقت العقد، يتفق الطرفان معاً على إخلائه في الوقت المناسب كما ورد في العقد.',
  'البند ٩: عاين الطرف الثاني هذا العقار بالكامل وبرضاه واختياره، وليس له دافع آخر في هذا العقد.',
  `البند ١٠: يدفع الطرف الأول مبلغ {commissionLandlord} لخدمات ومصاريف ${BRAND_NAME}؛ ويدفع الطرف الثاني {commissionTenant}. تبقى هذه المبالغ لدى الشركة حتى نهاية الصفقة ثم يُستلم الإيصال.`,
  `البند ١١: عند أي نزاع يُحل أولاً بالحوار؛ وإلا يُحال إلى محكمة أربيل، ويكون موظفو ${BRAND_NAME} شهوداً عند الطلب.`,
  'البند ١٢: يلتزم الطرفان بدفع عمولة الخدمة: {commissionLandlord} من المؤجر و {commissionTenant} من المستأجر لمنظم العقد ({organizerName}).',
  'البند ١٣: على الطرف الأول (المؤجر) تقديم أي مستند قانوني لازم للتأجير وأن يكون له حق تأجير العقار.',
  'البند ١٤: أجور الكهرباء والماء والغاز والخدمات وأي مصروف استعمال خلال مدة الإيجار على الطرف الثاني (المستأجر)، ما لم يُتفق على خلاف ذلك.',
  'البند ١٥: الضرائب والرسوم القانونية على المالك على الطرف الأول؛ وما على المستأجر على الطرف الثاني.',
  `البند ١٦: وُقّع هذا العقد بتاريخ {signingDate} في مدينة أربيل (${BRAND_NAME}).`,
  'البند ١٧: يتكون هذا العقد من ١٧ بنداً ويلتزم الطرفان بجميع البنود.',
];

const CLAUSES_EN: string[] = [
  'Clause 1: The first party ({landlordName} — landlord) hereby leases this property to the second party ({tenantName} — tenant), with no other rights outside this signed agreement.',
  'Clause 2: Property type: {propertyType}; code: {propertyCode}; name: {propertyName}; area: {areaSqm} m².',
  'Clause 3: The agreed monthly rent is {monthlyRent}, advance {advancePayment}, and security deposit received {securityDeposit}.',
  `Clause 4: The deposit and advance remain with ${BRAND_NAME} (as security) until the end of the lease term or lawful return of the deposit under the terms.`,
  'Clause 5: If either party terminates the contract without a lawful reason, they shall pay {cancelFee} as a cancellation penalty to the other party.',
  'Clause 6: Before receiving the key, the second party (tenant) must inspect the property, confirm satisfaction, receive the key, and take possession.',
  'Clause 7: Handover and vacating dates follow the lease term ({durationMonths} months; from {startDate} to {endDate}). For each day of delay in vacating, the second party pays {dailyPenalty} as daily rent.',
  'Clause 8: If the property has a previous tenant at contract time, both parties shall agree on a suitable vacating time as stated in the contract.',
  'Clause 9: The second party has fully inspected this property and enters this contract by free will, with no other motive.',
  `Clause 10: The first party pays {commissionLandlord} for services and costs to ${BRAND_NAME}; the second party pays {commissionTenant}. These amounts remain with the company until the deal ends, then a receipt is issued.`,
  `Clause 11: Any dispute shall first be resolved by dialogue; otherwise it is referred to the Erbil Court, and staff of ${BRAND_NAME} will act as witnesses if requested.`,
  'Clause 12: Both parties shall pay service commission: {commissionLandlord} from the landlord and {commissionTenant} from the tenant to the contract organizer ({organizerName}).',
  'Clause 13: The first party (landlord) must provide any legal documents required for leasing and must have the right to lease the property.',
  'Clause 14: Electricity, water, gas, services, and any usage costs during the lease are borne by the second party (tenant), unless otherwise agreed.',
  'Clause 15: Taxes and legal fees on the owner are borne by the first party; those on the tenant by the second party.',
  `Clause 16: This contract was signed on {signingDate} in Erbil (${BRAND_NAME}).`,
  'Clause 17: This contract consists of 17 clauses and both parties are bound by all of them.',
];

const BY_LOCALE: Record<Locale, string[]> = {
  ckb: CLAUSES_CKB,
  ar: CLAUSES_AR,
  en: CLAUSES_EN,
};

const CLAUSE_PREFIX: Record<Locale, RegExp> = {
  ckb: /^بەندی\s*\d+\s*:\s*/u,
  ar: /^البند\s*\d+\s*:\s*/u,
  en: /^Clause\s*\d+\s*:\s*/i,
};

export function rentalClausePrefix(locale: Locale) {
  return CLAUSE_PREFIX[locale] ?? CLAUSE_PREFIX.ckb;
}

export function getFixedRentalClauses(
  vars: Partial<RentalClauseVars> = {},
  locale: Locale = 'ckb',
): { index: number; text: string }[] {
  const merged = { ...FALLBACK, ...vars };
  const templates = BY_LOCALE[locale] ?? CLAUSES_CKB;
  return templates.map((tpl, i) => ({
    index: i + 1,
    text: fill(tpl, merged),
  }));
}

export function fixedRentalClausesPlainText(
  vars: Partial<RentalClauseVars> = {},
  locale: Locale = 'ckb',
) {
  return getFixedRentalClauses(vars, locale)
    .map((c) => c.text)
    .join('\n');
}
