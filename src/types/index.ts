/** Shared domain types for Road Home SaaS modules. */

export type ModuleKey =
  | 'dashboard'
  | 'accounting'
  | 'properties'
  | 'houses'
  | 'owners'
  | 'customers'
  | 'suppliers'
  | 'contracts'
  | 'installments'
  | 'receipts'
  | 'reports'
  | 'users'
  | 'settings';

export type MoneyAmount = number;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
