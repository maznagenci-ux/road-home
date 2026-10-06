/**
 * Deprecated — uploads and DB now run on Hostinger.
 * Kept as a no-op stub so old imports do not crash during transition.
 */
export function getSupabaseAdmin(): never {
  throw new Error(
    'Supabase has been removed. File uploads use local disk; DATABASE_URL points to Hostinger Postgres.',
  );
}

export const RECEIPTS_BUCKET = 'receipts';
