import { formatCurrency, formatContractMoney } from '@/lib/utils';

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial';

export type MoneyCurrency = 'IQD' | 'USD';

export interface DashboardMetrics {
  salesIncomeIqd: number;
  constructionSpendIqd: number;
  vendorDebtsIqd: number;
  buyerDebtsIqd: number;
  activeProjects: number;
  /** Accounting engine snapshot */
  todayIncomeIqd?: number;
  todayExpenseIqd?: number;
  monthNetIqd?: number;
  cashIqd?: number;
  bankIqd?: number;
  totalAvailableIqd?: number;
  /** Original-currency month totals (not FX conversions) */
  monthIncomeUsd?: number;
  monthExpenseUsd?: number;
  monthIncomeIqdOriginal?: number;
  monthExpenseIqdOriginal?: number;
}

export interface DashboardActivityCounts {
  saleContracts: number;
  rentalLeases: number;
  receiptsLinked: number;
  receiptsUnlinked: number;
}

export interface InstallmentRow {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  contractNo: string;
  buyerName: string | null;
  houseCode: string | null;
  houseName: string | null;
}

export interface CostCenterRow {
  houseCode: string;
  houseName: string;
  budgetIqd: number;
  spentIqd: number;
}

export interface AuditEntry {
  id: string;
  voucherId: string;
  occurredAt: string;
  costCenter: string;
  category: string;
  /** کڕیار / فرۆشیار / کرێچی */
  partyName: string;
  /** بڕی ڕەسەن بە دراوی گرێبەست/وەسڵ */
  amountOriginal: number;
  currency: MoneyCurrency;
  exchangeRate: number;
  /** دیناری بنەڕەت بۆ کۆکردنەوە */
  amountIqd: number;
  status: PaymentStatus;
  /** کارمەندی خاوەنی گرێبەست / مامەڵە */
  ownerName: string;
  staffName: string;
  kind: 'money' | 'contract' | 'lease';
}

/** @deprecated prefer formatContractMoney — kept for callers */
export function formatDualCurrency(iqd: number, usdToIqd: number, locale: string) {
  const rate = Math.max(1, usdToIqd);
  const usd = iqd / rate;
  return {
    iqd: formatCurrency(iqd, locale, 'IQD'),
    usd: formatCurrency(usd, locale, 'USD'),
  };
}

export function formatAuditMoney(
  row: Pick<AuditEntry, 'amountOriginal' | 'currency' | 'exchangeRate' | 'amountIqd'>,
  locale: string,
) {
  const rate = Math.max(1, row.exchangeRate || 1);
  return formatContractMoney(row.amountOriginal, row.currency, rate, locale);
}

export function formatAuditDate(iso: string, locale: string) {
  const d = new Date(iso);
  const loc = locale === 'en' ? 'en-GB' : locale === 'ar' ? 'ar-IQ' : 'ckb-IQ';
  return new Intl.DateTimeFormat(loc, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
