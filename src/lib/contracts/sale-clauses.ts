/**
 * Fixed legal clauses for property sale contracts (Road Home PDF style, 17 clauses).
 */

import type { Locale } from '@/i18n/locale-config';
import { BRAND_NAME } from '@/lib/brand';

export type SaleClauseVars = {
  sellerName: string;
  buyerName: string;
  propertyType: string;
  propertyCode: string;
  location: string;
  areaSqm: string;
  totalPrice: string;
  downPayment: string;
  remaining: string;
  remainingDueDate: string;
  cancelFee: string;
  dailyPenalty: string;
  commissionSeller: string;
  commissionBuyer: string;
  signingDate: string;
  organizerName: string;
  lawyerName: string;
  lawyerPhone: string;
};

const FALLBACK: SaleClauseVars = {
  sellerName: '—',
  buyerName: '—',
  propertyType: '—',
  propertyCode: '—',
  location: '—',
  areaSqm: '—',
  totalPrice: '—',
  downPayment: '—',
  remaining: '—',
  remainingDueDate: '—',
  cancelFee: '—',
  dailyPenalty: '—',
  commissionSeller: '—',
  commissionBuyer: '—',
  signingDate: '—',
  organizerName: BRAND_NAME,
  lawyerName: '—',
  lawyerPhone: '—',
};

function fill(template: string, vars: SaleClauseVars) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key as keyof SaleClauseVars];
    return v != null && String(v).trim() !== '' ? String(v) : FALLBACK[key as keyof SaleClauseVars];
  });
}

const CLAUSES_CKB: string[] = [
  'بەندی ١: لایەنی یەکەم ({sellerName} — فرۆشیار) دان بە فرۆشتنی ئەم موڵکە دەنێت بۆ لایەنی دووەم ({buyerName} — کڕیار)، و هیچ مافێکی دیکە لە دەرەوەی ئەم گرێبەستەدا نییە کە واژووی لەسەر کراوە.',
  'بەندی ٢: جۆری موڵک: {propertyType}، ژمارە/کۆد: {propertyCode}، شوێن: {location}، ڕووبەر: {areaSqm} م٢.',
  'بەندی ٣: بڕی پارەی ڕێککەوتوو بۆ فرۆشتن بریتییە لە {totalPrice}.',
  `بەندی ٤: بڕی پێشەکی {downPayment} لای ${BRAND_NAME} (وەک دەستەبەر) دەمێنێتەوە تا تەواوبوونی مامەڵە / گواستنەوەی تاپۆ یان تۆمارکردنی نوێ؛ بڕی ماوە {remaining} دەدرێت تا ڕێکەوتی {remainingDueDate}.`,
  'بەندی ٥: ئەگەر هەر لایەنێک بەبێ هۆی یاسایی گرێبەست هەڵبوەشێنێتەوە یان پاشگەز ببێتەوە، دەبێت بڕی {cancelFee} وەک سزای هەڵوەشاندنەوە بدات بە لایەنی بەرامبەر.',
  'بەندی ٦: لایەنی دووەم (کڕیار) پێش وەرگرتنی کلیل دەبێت پشکنینی ئاسوودەیی و لایەنی ڕەزامەندی خۆی بەجێبهێنێت و کلیل وەرگرێت و بچێتە ناو موڵکەکە.',
  'بەندی ٧: بەرواری وەرگرتن و چۆڵکردنی موڵک بەپێی مەرجەکانی گرێبەست دەبێت. بۆ هەر ڕۆژ دواکەوتن لە چۆڵکردن، {dailyPenalty} وەک کرێی ڕۆژانە دەبێت لایەنی دووەم (کڕیار) بدات.',
  'بەندی ٨: ئەگەر موڵکەکە لە کاتی گرێبەستدا کرێچی پێشووی هەبێت، هەردوو لا پێکەوە ڕێکدەکەون بۆ چۆڵکردنی موڵک لە کاتی گونجاودا وەک لە گرێبەستدا نووسراوە.',
  'بەندی ٩: لایەنی دووەم تەماشای ئەم موڵکە کردووە بە تەواوی و بە ڕەزامەندی و بێستۆی خۆی، و هیچ پاڵنەرێکی دیکە نییە لەم گرێبەستەدا.',
  `بەندی ١٠: لایەنی یەکەم (فرۆشیار) بڕی {commissionSeller} بۆ خزمەتگوزارییەکان و خەرجییەکان لای ${BRAND_NAME} دەدات؛ لایەنی دووەم (کڕیار) بڕی {commissionBuyer} دەدات. ئەم پارەیە تا کۆتایی مامەڵە لای کۆمپانیا دەمێنێتەوە و دواتر پسوولە وەردەگیرێت.`,
  `بەندی ١١: لە کاتی بوونی هەر کێشەیەک، یەکەم جار بە گفتوگۆ چارەسەر دەکرێت؛ ئەگەر چارەسەر نەکرا، دەگەڕێنرێتەوە بۆ دادگای هەولێر و فەرمانبەرانی ${BRAND_NAME} (وەک شایەت) ئامادە دەبن لە کاتی داواکردندا.`,
  'بەندی ١٢: هەردوو لایەن پابەندن بە پێدانی دەستخۆشی/خزمەتگوزاری: {commissionSeller} لە فرۆشیار و {commissionBuyer} لە کڕیار بۆ ڕێکخەری گرێبەست ({organizerName}).',
  'بەندی ١٣: پێویستە لایەنی یەکەم (فرۆشیار) هەر بەڵگەنامەی یاسایی پێویست بۆ فرۆشتن بدات و مافی فرۆشتنی موڵکەکەی هەبێت.',
  'بەندی ١٤: پارەی کڕین، ڕسووماتی تاپۆ و تۆماری عەقاری و هەر خەرجییەکی یاسایی پێویست بۆ گواستنەوە لەسەر لایەنی دووەم (کڕیار) دەبێت، مەگەر بەپێچەوانە ڕێککەوتن نەکرابێت.',
  'بەندی ١٥: ڕسوومات و گواستنەوەی موڵک و باجی داهات و خانووبەرە کە لەسەر خاوەن موڵکە، لەسەر لایەنی یەکەم (فرۆشیار) دەبێت، مەگەر بەپێچەوانە ڕێککەوتن نەکرابێت.',
  `بەندی ١٦: ئەم گرێبەستە لە ڕێکەوتی {signingDate} لە شاری هەولێر (${BRAND_NAME}) واژوو کرا.`,
  'بەندی ١٧: ئەم گرێبەستە لە ١٧ بەند پێکهاتووە و هەردوو لا پابەندن بە هەموو بەندەکان.',
];

const CLAUSES_AR: string[] = [
  'البند ١: يقر الطرف الأول ({sellerName} — البائع) ببيع هذا العقار للطرف الثاني ({buyerName} — المشتري)، وليس له أي حق آخر خارج هذا العقد الموقع.',
  'البند ٢: نوع العقار: {propertyType}، الرقم/الرمز: {propertyCode}، الموقع: {location}، المساحة: {areaSqm} م٢.',
  'البند ٣: المبلغ المتفق عليه للبيع هو {totalPrice}.',
  `البند ٤: يبقى المقدم {downPayment} لدى ${BRAND_NAME} (كفالة) حتى إتمام الصفقة / نقل الطابو أو التسجيل الجديد؛ ويُدفع المتبقي {remaining} حتى تاريخ {remainingDueDate}.`,
  'البند ٥: إذا فسخ أي طرف العقد أو تراجع دون سبب قانوني، يدفع مبلغ {cancelFee} كغرامة فسخ للطرف الآخر.',
  'البند ٦: على الطرف الثاني (المشتري) قبل استلام المفتاح إجراء المعاينة والرضا واستلام المفتاح ودخول العقار.',
  'البند ٧: تاريخ الاستلام والإخلاء وفق شروط العقد. عن كل يوم تأخير في الإخلاء يدفع الطرف الثاني (المشتري) {dailyPenalty} كإيجار يومي.',
  'البند ٨: إذا كان للعقار مستأجر سابق وقت العقد، يتفق الطرفان معاً على إخلائه في الوقت المناسب كما ورد في العقد.',
  'البند ٩: عاين الطرف الثاني هذا العقار بالكامل وبرضاه واختياره، وليس له دافع آخر في هذا العقد.',
  `البند ١٠: يدفع الطرف الأول (البائع) مبلغ {commissionSeller} لخدمات ومصاريف ${BRAND_NAME}؛ ويدفع الطرف الثاني (المشتري) {commissionBuyer}. تبقى هذه المبالغ لدى الشركة حتى نهاية الصفقة ثم يُستلم الإيصال.`,
  `البند ١١: عند أي نزاع يُحل أولاً بالحوار؛ وإلا يُحال إلى محكمة أربيل، ويكون موظفو ${BRAND_NAME} شهوداً عند الطلب.`,
  'البند ١٢: يلتزم الطرفان بدفع عمولة الخدمة: {commissionSeller} من البائع و {commissionBuyer} من المشتري لمنظم العقد ({organizerName}).',
  'البند ١٣: على الطرف الأول (البائع) تقديم أي مستند قانوني لازم للبيع وأن يكون له حق بيع العقار.',
  'البند ١٤: رسوم الشراء والطابو والتسجيل العقاري وأي مصروف قانوني لنقل الملكية على الطرف الثاني (المشتري)، ما لم يُتفق على خلاف ذلك.',
  'البند ١٥: رسوم نقل العقار وضريبة الدخل والعقار على المالك على الطرف الأول (البائع)، ما لم يُتفق على خلاف ذلك.',
  `البند ١٦: وُقّع هذا العقد بتاريخ {signingDate} في مدينة أربيل (${BRAND_NAME}).`,
  'البند ١٧: يتكون هذا العقد من ١٧ بنداً ويلتزم الطرفان بجميع البنود.',
];

const CLAUSES_EN: string[] = [
  'Clause 1: The first party ({sellerName} — seller) hereby sells this property to the second party ({buyerName} — buyer), with no other rights outside this signed agreement.',
  'Clause 2: Property type: {propertyType}; code: {propertyCode}; location: {location}; area: {areaSqm} m².',
  'Clause 3: The agreed sale price is {totalPrice}.',
  `Clause 4: The down payment {downPayment} remains with ${BRAND_NAME} (as security) until completion of the deal / tapu transfer or new registration; the remaining {remaining} is due by {remainingDueDate}.`,
  'Clause 5: If either party terminates or withdraws without a lawful reason, they shall pay {cancelFee} as a cancellation penalty to the other party.',
  'Clause 6: Before receiving the key, the second party (buyer) must inspect the property, confirm satisfaction, receive the key, and take possession.',
  'Clause 7: Handover and vacating follow the contract terms. For each day of delay in vacating, the second party (buyer) pays {dailyPenalty} as daily rent.',
  'Clause 8: If the property has a previous tenant at contract time, both parties shall agree on a suitable vacating time as stated in the contract.',
  'Clause 9: The second party has fully inspected this property and enters this contract by free will, with no other motive.',
  `Clause 10: The first party (seller) pays {commissionSeller} for services and costs to ${BRAND_NAME}; the second party (buyer) pays {commissionBuyer}. These amounts remain with the company until the deal ends, then a receipt is issued.`,
  `Clause 11: Any dispute shall first be resolved by dialogue; otherwise it is referred to the Erbil Court, and staff of ${BRAND_NAME} will act as witnesses if requested.`,
  'Clause 12: Both parties shall pay service commission: {commissionSeller} from the seller and {commissionBuyer} from the buyer to the contract organizer ({organizerName}).',
  'Clause 13: The first party (seller) must provide any legal documents required for sale and must have the right to sell the property.',
  'Clause 14: Purchase fees, tapu and property registration, and any legal transfer costs are borne by the second party (buyer), unless otherwise agreed.',
  'Clause 15: Property transfer fees and income/property tax on the owner are borne by the first party (seller), unless otherwise agreed.',
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

export function saleClausePrefix(locale: Locale) {
  return CLAUSE_PREFIX[locale] ?? CLAUSE_PREFIX.ckb;
}

const LAWYER_SUFFIX: Record<Locale, string> = {
  ckb: ' پارێزەر: {lawyerName} — مۆبایل: {lawyerPhone}.',
  ar: ' المحامي: {lawyerName} — الهاتف: {lawyerPhone}.',
  en: ' Lawyer: {lawyerName} — phone: {lawyerPhone}.',
};

export function getFixedSaleClauses(
  vars: Partial<SaleClauseVars> = {},
  locale: Locale = 'ckb',
): { index: number; text: string }[] {
  const merged = { ...FALLBACK, ...vars };
  const templates = BY_LOCALE[locale] ?? CLAUSES_CKB;
  const hasLawyer = Boolean(vars.lawyerName?.trim());

  return templates.map((tpl, i) => {
    let text = fill(tpl, merged);
    if (i === 12 && hasLawyer) {
      text += fill(LAWYER_SUFFIX[locale] ?? LAWYER_SUFFIX.ckb, merged);
    }
    return { index: i + 1, text };
  });
}
