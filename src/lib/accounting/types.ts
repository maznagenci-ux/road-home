import type {
  LedgerCurrency,
  LedgerPayMethod,
  LedgerTxnType,
} from '@prisma/client';

export type DateRange = { from: Date; to: Date };

export type PostTransactionInput = {
  date: Date;
  type: LedgerTxnType;
  category: string;
  amountOriginal: number;
  currency?: LedgerCurrency;
  exchangeRate?: number;
  partyName?: string | null;
  customerId?: string | null;
  supplierId?: string | null;
  employeeUserId?: string | null;
  propertyId?: string | null;
  houseId?: string | null;
  paymentMethod?: LedgerPayMethod;
  cashAccountId?: string | null;
  bankAccountId?: string | null;
  transferCashId?: string | null;
  transferBankId?: string | null;
  receiptNo?: string | null;
  voucherNo?: string | null;
  description?: string | null;
  attachmentUrl?: string | null;
  createdById?: string | null;
  sourceVoucherId?: string | null;
  sourceReceiptId?: string | null;
  /** Skip overdraft check when true */
  allowOverdraft?: boolean;
  /** Optional explicit txn number (migration) */
  txnNo?: string;
};

export type CategoryAmount = { category: string; amountIqd: number };

export type MoneyMovement = {
  id: string;
  txnNo: string;
  date: string;
  type: LedgerTxnType;
  category: string;
  description: string | null;
  partyName: string | null;
  debitIqd: number;
  creditIqd: number;
  balanceAfterIqd: number;
};

export type CashBankReport = {
  accountId: string;
  code: string;
  name: string;
  openingBalanceIqd: number;
  closingBalanceIqd: number;
  movements: MoneyMovement[];
};

export type IncomeExpenseSummary = {
  incomeIqd: number;
  expenseIqd: number;
  netIqd: number;
  incomeByCategory: CategoryAmount[];
  expenseByCategory: CategoryAmount[];
};

export type ProfitAndLoss = {
  incomeIqd: number;
  expenseIqd: number;
  netProfitIqd: number;
  incomeByCategory: CategoryAmount[];
  expenseByCategory: CategoryAmount[];
};

export type PartyBalance = {
  id: string | null;
  name: string;
  balanceIqd: number;
};

export type PropertyPerfRow = {
  propertyId: string | null;
  houseId: string | null;
  label: string;
  incomeIqd: number;
  expenseIqd: number;
  profitIqd: number;
};

export type MonthlyOwnerBundle = {
  year: number;
  month: number;
  range: { from: string; to: string };
  executive: {
    incomeIqd: number;
    expenseIqd: number;
    netIqd: number;
    cashIqd: number;
    bankIqd: number;
    totalAvailableIqd: number;
    receivablesIqd: number;
    payablesIqd: number;
  };
  incomeByCategory: CategoryAmount[];
  expenseByCategory: CategoryAmount[];
  cashReports: CashBankReport[];
  bankReports: CashBankReport[];
  pl: ProfitAndLoss;
  receivables: PartyBalance[];
  payables: PartyBalance[];
  propertyPerformance: PropertyPerfRow[];
  comparison: {
    prevMonth: { incomeIqd: number; expenseIqd: number; netIqd: number };
    ytd: { incomeIqd: number; expenseIqd: number; netIqd: number };
  };
  transactions: Array<{
    id: string;
    txnNo: string;
    date: string;
    type: LedgerTxnType;
    category: string;
    amountBaseIqd: number;
    currency: LedgerCurrency;
    amountOriginal: number;
    partyName: string | null;
    description: string | null;
    paymentMethod: LedgerPayMethod;
    receiptNo: string | null;
    voucherNo: string | null;
  }>;
};
