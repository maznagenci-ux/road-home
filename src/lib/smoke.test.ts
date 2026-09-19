import { describe, expect, it } from 'vitest';
import { isSuperAdmin } from '@/lib/access/permissions';
import { toWhatsAppDigits } from '@/lib/whatsapp';

describe('isSuperAdmin', () => {
  it('accepts SUPER_ADMIN', () => {
    expect(isSuperAdmin('SUPER_ADMIN')).toBe(true);
  });
  it('rejects accountant', () => {
    expect(isSuperAdmin('ACCOUNTANT')).toBe(false);
  });
});

describe('toWhatsAppDigits', () => {
  it('normalizes Iraqi mobiles', () => {
    expect(toWhatsAppDigits('0750 207 0008')).toBe('9647502070008');
  });
  it('returns null for blank', () => {
    expect(toWhatsAppDigits('')).toBeNull();
  });
});
