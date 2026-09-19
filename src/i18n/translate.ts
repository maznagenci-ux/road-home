import type { Dictionary } from '@/i18n/dictionaries';

export function tContractStatus(t: Dictionary, status: string): string {
  return t.status.contract[status as keyof typeof t.status.contract] ?? status;
}

export function tInstallmentStatus(t: Dictionary, status: string): string {
  return t.status.installment[status as keyof typeof t.status.installment] ?? status;
}

export function tReceiptType(t: Dictionary, type: string): string {
  return t.status.receipt[type as keyof typeof t.status.receipt] ?? type;
}

export function tVoucherAccountType(t: Dictionary, type: string): string {
  const map = (t.status as { voucher?: Record<string, string> }).voucher;
  return map?.[type] ?? type;
}

export function tRole(t: Dictionary, role: string): string {
  return t.roles[role as keyof typeof t.roles] ?? role;
}
