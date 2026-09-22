/** Iraqi mobile: 11 digits starting with 07 (e.g. 07501234567). */

export function digitsOnly(input: string): string {
  return String(input || '').replace(/\D/g, '');
}

/** Normalize to 07XXXXXXXXX or null if invalid. */
export function normalizeLoginPhone(input: string): string | null {
  let d = digitsOnly(input);
  // Accept +9647… / 9647… → 07…
  if (d.startsWith('964') && d.length >= 12) {
    d = `0${d.slice(3)}`;
  }
  if (!/^07\d{9}$/.test(d)) return null;
  return d;
}

export function isValidLoginPhone(input: string): boolean {
  return normalizeLoginPhone(input) != null;
}

/** OTPIQ expects 9647XXXXXXXXX (no leading 0). */
export function toOtpiqPhone(local07: string): string | null {
  const n = normalizeLoginPhone(local07);
  if (!n) return null;
  return `964${n.slice(1)}`;
}
