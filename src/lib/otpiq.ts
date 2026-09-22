import { toOtpiqPhone } from '@/lib/phone';

const BASE = 'https://api.otpiq.com/api';

export type OtpiqSendResult =
  | { ok: true; messageId?: string; remainingBalance?: number; cost?: number }
  | { ok: false; error: string; status?: number };

function apiKey() {
  const key = process.env.OTPIQ_API_KEY?.trim();
  if (!key) throw new Error('OTPIQ_API_KEY is not set');
  return key;
}

function provider() {
  return process.env.OTPIQ_PROVIDER?.trim() || 'whatsapp-telegram-sms';
}

/** Send a verification OTP via OTPIQ (WhatsApp / Telegram / SMS fallback). */
export async function sendOtpiqVerification(
  localPhone07: string,
  verificationCode: string,
  opts?: { provider?: string },
): Promise<OtpiqSendResult> {
  const phoneNumber = toOtpiqPhone(localPhone07);
  if (!phoneNumber) {
    return { ok: false, error: 'INVALID_PHONE' };
  }

  const route = opts?.provider?.trim() || provider();

  try {
    const res = await fetch(`${BASE}/sms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        smsType: 'verification',
        verificationCode,
        provider: route,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        `OTPIQ_${res.status}`;
      return { ok: false, error: msg, status: res.status };
    }

    return {
      ok: true,
      messageId: typeof data.messageId === 'string' ? data.messageId : undefined,
      remainingBalance:
        typeof data.remainingBalance === 'number' ? data.remainingBalance : undefined,
      cost: typeof data.cost === 'number' ? data.cost : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'OTPIQ_NETWORK',
    };
  }
}
