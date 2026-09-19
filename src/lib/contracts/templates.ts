import type { PropertyAssetType, ContractKind, ContractCurrency } from '@prisma/client';
import { BRAND_NAME } from '@/lib/brand';

export type InstallmentDraft = {
  id: string;
  dueDate: string;
  amount: number;
  label: string;
};

export type ContractFormState = {
  kind: ContractKind;
  propertyType: PropertyAssetType;
  title: string;
  tapuCode: string;
  buyerName: string;
  buyerPhone: string;
  buyerIdNo: string;
  sellerName: string;
  sellerPhone: string;
  sellerIdNo: string;
  witness1Name: string;
  witness1Phone: string;
  witness1IdNo: string;
  witness2Name: string;
  witness2Phone: string;
  witness2IdNo: string;
  guarantorName: string;
  guarantorPhone: string;
  lawyerName: string;
  lawyerPhone: string;
  houseCode: string;
  location: string;
  areaSqm: string;
  currency: ContractCurrency;
  exchangeRate: number;
  totalAmount: number;
  downPayment: number;
  downPaymentHeld: boolean;
  remainingDueDate: string;
  cancelFee: number;
  dailyPenalty: number;
  commissionSeller: number;
  commissionBuyer: number;
  handoverDate: string;
  signingDate: string;
  notes: string;
  staffNote: string;
  organizerName: string;
  showOrganizer: boolean;
  /** Internal only — attribution to salesperson; never on printed contract */
  dealEmployeeId: string;
  isExternal: boolean;
  legalConditions: string;
  installments: InstallmentDraft[];
};

export function defaultLegalConditions(lang: 'ckb' | 'ar' | 'en', kind: ContractKind): string {
  if (lang === 'ckb') {
    return kind === 'SALE'
      ? '١. فرۆشیار موڵک بە باری یاسایی پاک دەفرۆشێت.\n٢. کڕیار بڕی ڕێککەوتوو دەدات بەپێی خشتەی قیست.\n٣. گواستنەوەی تاپۆ دوای تەواوبوونی پارەدان ئەنجام دەدرێت.\n٤. هەر ناکۆکییەک بەپێی یاساکانی هەرێمی کوردستان چارەسەر دەکرێت.'
      : '١. کڕیار (لایەنی یەکەم) موڵک لە فرۆشیار دەکڕێت.\n٢. پارەدان بەپێی مەرجەکانی گرێبەستە.\n٣. بەرپرسیارێتی یاسایی لەسەر هەردوو لایەنە.';
  }
  if (lang === 'ar') {
    return '١. يلتزم البائع بنقل الملكية خالية من العوائق.\n٢. يلتزم المشتري بالسداد وفق جدول الأقساط.\n٣. يتم نقل الطابو بعد استكمال الدفع.\n٤. يخضع العقد لقوانين إقليم كردستان.';
  }
  return '1. Seller transfers clear legal title.\n2. Buyer pays per the installment schedule.\n3. Tapu transfer occurs after full payment.\n4. Disputes are governed by Kurdistan Region law.';
}

export function propertyTypeLabel(
  type: PropertyAssetType,
  labels: Record<string, string>,
): string {
  return labels[type] ?? type;
}

export function emptyContractForm(lang: 'ckb' | 'ar' | 'en'): ContractFormState {
  return {
    kind: 'SALE',
    propertyType: 'HOUSE',
    title: lang === 'ckb' ? 'گرێبەستی فرۆشتنی موڵک' : lang === 'ar' ? 'عقد بيع عقار' : 'Property Sale Agreement',
    tapuCode: '',
    buyerName: '',
    buyerPhone: '',
    buyerIdNo: '',
    sellerName: '',
    sellerPhone: '',
    sellerIdNo: '',
    witness1Name: '',
    witness1Phone: '',
    witness1IdNo: '',
    witness2Name: '',
    witness2Phone: '',
    witness2IdNo: '',
    guarantorName: '',
    guarantorPhone: '',
    lawyerName: '',
    lawyerPhone: '',
    houseCode: '',
    location: '',
    areaSqm: '',
    currency: 'IQD',
    exchangeRate: 150_000,
    totalAmount: 0,
    downPayment: 0,
    downPaymentHeld: true,
    remainingDueDate: '',
    cancelFee: 0,
    dailyPenalty: 0,
    commissionSeller: 0,
    commissionBuyer: 0,
    handoverDate: '',
    signingDate: new Date().toISOString().slice(0, 10),
    notes: '',
    staffNote: '',
    organizerName: BRAND_NAME,
    showOrganizer: true,
    dealEmployeeId: '',
    isExternal: false,
    legalConditions: defaultLegalConditions(lang, 'SALE'),
    installments: [],
  };
}

export function toIqd(amount: number, currency: ContractCurrency, exchangeRate: number) {
  const rate = Math.max(1, exchangeRate);
  return currency === 'USD' ? amount * rate : amount;
}

export function toUsd(amount: number, currency: ContractCurrency, exchangeRate: number) {
  const rate = Math.max(1, exchangeRate);
  return currency === 'USD' ? amount : amount / rate;
}

export async function nextContractNo(prisma: { contract: { count: () => Promise<number> } }) {
  const count = await prisma.contract.count();
  return `CT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export async function nextLeaseNo(prisma: { lease: { count: () => Promise<number> } }) {
  const count = await prisma.lease.count();
  return `LS-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}
