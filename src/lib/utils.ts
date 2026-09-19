import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, _locale: string, currency: 'IQD' | 'USD' = 'IQD'): string {
  // Always Latin digits + English currency labels (IQD / USD), even when UI is ckb/ar
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);
}

/** Format amount in contract currency and show the other as secondary text. */
export function formatContractMoney(
  amount: number,
  currency: 'IQD' | 'USD',
  exchangeRate: number,
  locale: string,
) {
  const rate = Math.max(1, exchangeRate);
  const iqd = currency === 'IQD' ? amount : amount * rate;
  const usd = currency === 'USD' ? amount : amount / rate;
  return {
    primary: formatCurrency(amount, locale, currency),
    iqd: formatCurrency(iqd, locale, 'IQD'),
    usd: formatCurrency(usd, locale, 'USD'),
    iqdValue: iqd,
    usdValue: usd,
  };
}

export function formatDate(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const loc =
    locale === 'en' ? 'en-GB' : locale === 'ar' ? 'ar-IQ' : 'ckb-IQ';
  return new Intl.DateTimeFormat(loc, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
