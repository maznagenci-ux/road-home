/** Default chart of accounts + opening money accounts for Road Home. */

export const SYSTEM_ACCOUNTS = [
  { code: '1000', name: 'Cash', nameKu: 'نەقد', class: 'ASSET' as const },
  { code: '1100', name: 'Bank', nameKu: 'بانک', class: 'ASSET' as const },
  { code: '1200', name: 'Accounts Receivable', nameKu: 'قەرزی کڕیار', class: 'ASSET' as const },
  { code: '1300', name: 'Property Assets', nameKu: 'سامانی خانووبەرە', class: 'ASSET' as const },
  { code: '1400', name: 'Inventory Asset', nameKu: 'کۆگای کەلوپەل', class: 'ASSET' as const },
  { code: '1500', name: 'Construction WIP', nameKu: 'کاری لەدەست', class: 'ASSET' as const },
  { code: '2000', name: 'Accounts Payable', nameKu: 'قەرزی دابینکەر', class: 'LIABILITY' as const },
  { code: '3000', name: 'Owner Equity', nameKu: 'سەرمایەی خاوەن', class: 'EQUITY' as const },
  { code: '3100', name: 'Owner Drawings', nameKu: 'ڕاکێشانی خاوەن', class: 'EQUITY' as const },
  { code: '4000', name: 'Sales Income', nameKu: 'داهاتی فرۆشتن', class: 'INCOME' as const },
  { code: '4100', name: 'Rental Income', nameKu: 'داهاتی کرێ', class: 'INCOME' as const },
  { code: '4200', name: 'Other Income', nameKu: 'داهاتی تر', class: 'INCOME' as const },
  { code: '4300', name: 'Commission Income', nameKu: 'داهاتی کۆمیسیۆن', class: 'INCOME' as const },
  { code: '5000', name: 'Construction Expense', nameKu: 'خەرجی بیناسازی', class: 'EXPENSE' as const },
  { code: '5100', name: 'Office Expense', nameKu: 'خەرجی ئۆفیس', class: 'EXPENSE' as const },
  { code: '5200', name: 'Salary Expense', nameKu: 'مووچە', class: 'EXPENSE' as const },
  { code: '5300', name: 'Commission Expense', nameKu: 'خەرجی کۆمیسیۆن', class: 'EXPENSE' as const },
  { code: '5400', name: 'Other Expense', nameKu: 'خەرجی تر', class: 'EXPENSE' as const },
] as const;

export const DEFAULT_CASH = {
  code: 'CASH-MAIN',
  name: 'Main Office Cash',
  currency: 'IQD' as const,
  openingBalance: 0,
};

export const DEFAULT_BANK = {
  code: 'BANK-MAIN',
  name: 'Main Bank Account',
  bankName: 'Sample Bank',
  currency: 'IQD' as const,
  openingBalance: 0,
};

/** Income/expense categories used in posting forms */
export const INCOME_CATEGORIES = [
  'SALE',
  'RENTAL',
  'COMMISSION',
  'INSTALLMENT',
  'OTHER_INCOME',
] as const;

export const EXPENSE_CATEGORIES = [
  'STEEL',
  'CEMENT',
  'LABOR',
  'MATERIALS',
  'EQUIPMENT',
  'UTILITIES',
  'PERMITS',
  'OFFICE_RENT',
  'OFFICE_UTILITIES',
  'OFFICE_SUPPLIES',
  'OFFICE_TRANSPORT',
  'OFFICE_COMM',
  'SALARY',
  'BONUS',
  'ALLOWANCE',
  'COMMISSION',
  'OTHER',
  'OTHER_OFFICE',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORIES)[number];
