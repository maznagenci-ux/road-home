/** Normalize Iraqi / local phone to WhatsApp international digits (no +). */
export function toWhatsAppDigits(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('7')) return `964${digits}`;
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string | null | undefined, message: string): boolean {
  const url = whatsappUrl(phone, message);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export function tenantRentDueMessage(opts: {
  tenantName?: string | null;
  amountLabel: string;
  propertyCode?: string | null;
  period?: string | null;
}) {
  const name = opts.tenantName?.trim() || 'کرێچی';
  const period = opts.period ? ` (${opts.period})` : '';
  const code = opts.propertyCode ? ` · کۆدی موڵک: ${opts.propertyCode}` : '';
  return (
    `سڵاو ${name}،\n` +
    `ئێستا کاتی کرێت هاتووە${period}.\n` +
    `بڕی کرێ: ${opts.amountLabel}${code}\n` +
    `تکایە سەردانی Road Home ZMKH Real Estate بکە بۆ پارەدانی کرێی مانگەکە.\n` +
    `سوپاس — Road Home ZMKH Real Estate`
  );
}

export function landlordRentReadyMessage(opts: {
  landlordName?: string | null;
  amountLabel: string;
  propertyCode: string;
  period?: string | null;
}) {
  const name = opts.landlordName?.trim() || 'خاوەن موڵک';
  const period = opts.period ? ` بۆ ماوەی ${opts.period}` : '';
  return (
    `سڵاو ${name}،\n` +
    `کرێی موڵکەکەت وەرگیرا${period}.\n` +
    `بڕ: ${opts.amountLabel}\n` +
    `کۆدی خانوو: ${opts.propertyCode}\n` +
    `دەتوانیت بێیت بۆ وەرگرتنی کرێکە لە Road Home ZMKH Real Estate.\n` +
    `سوپاس`
  );
}
