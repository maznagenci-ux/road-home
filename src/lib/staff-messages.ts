export const STAFF_MESSAGE_ACTION = 'STAFF_MESSAGE';

export type StaffMessageMeta = {
  body: string;
  recipientId: string | null;
  recipientName: string | null;
};

export function parseStaffMessageMeta(raw: string | null): StaffMessageMeta | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as StaffMessageMeta;
    if (!m?.body || typeof m.body !== 'string') return null;
    return {
      body: m.body,
      recipientId: m.recipientId ?? null,
      recipientName: m.recipientName ?? null,
    };
  } catch {
    return null;
  }
}

/** Whether this staff message should appear in the given user's inbox. */
export function staffMessageVisibleTo(
  meta: StaffMessageMeta,
  userId: string,
  isSa: boolean,
): boolean {
  if (meta.recipientId === null) return true; // broadcast
  if (meta.recipientId === userId) return true;
  if (isSa) return true; // SA can see all sent/received in history via GET staff-messages
  return false;
}
