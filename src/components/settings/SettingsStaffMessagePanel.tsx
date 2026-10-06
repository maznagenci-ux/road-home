'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageCircle, MessageSquare, Send } from 'lucide-react';
import { openWhatsApp, staffDirectMessage, STAFF_WHATSAPP_GROUP_URL } from '@/lib/whatsapp';
import type { Dictionary } from '@/i18n/dictionaries';

type StaffRow = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

type SentItem = {
  id: string;
  body: string;
  broadcast: boolean;
  recipientName: string | null;
  createdAt: string;
};

export function SettingsStaffMessagePanel({ t }: { t: Dictionary }) {
  const s = t.pages.settings as Record<string, string>;
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [sent, setSent] = useState<SentItem[]>([]);
  const [body, setBody] = useState('');
  const [recipientId, setRecipientId] = useState<string>('all');
  const [alsoWhatsApp, setAlsoWhatsApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [pres, msgs] = await Promise.all([
      fetch('/api/access/presence'),
      fetch('/api/staff-messages'),
    ]);
    if (pres.status === 403 || msgs.status === 403) {
      setError(s.presenceForbidden ?? 'Super Admin only');
      setLoading(false);
      return;
    }
    if (pres.ok) {
      const data = await pres.json();
      setStaff(
        (data.items ?? []).map((u: StaffRow) => ({
          id: u.id,
          name: u.name,
          phone: u.phone,
          role: u.role,
        })),
      );
    }
    if (msgs.ok) {
      const data = await msgs.json();
      setSent(
        (data.items ?? []).map(
          (m: {
            id: string;
            body: string;
            broadcast: boolean;
            recipientName: string | null;
            createdAt: string;
          }) => ({
            id: m.id,
            body: m.body,
            broadcast: m.broadcast,
            recipientName: m.recipientName,
            createdAt: m.createdAt,
          }),
        ),
      );
    }
    setLoading(false);
  }, [s.presenceForbidden]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError('');
    setOk('');
    const res = await fetch('/api/staff-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: body.trim(),
        recipientId: recipientId === 'all' ? null : recipientId,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || t.common.error);
      return;
    }

    if (alsoWhatsApp && data.recipientPhone) {
      const person = staff.find((u) => u.id === data.recipientId);
      openWhatsApp(
        data.recipientPhone,
        staffDirectMessage({
          staffName: person?.name ?? data.recipientName,
          body: data.body,
          fromName: undefined,
        }),
      );
    }

    setBody('');
    setOk(
      recipientId === 'all'
        ? (s.messageSentAll ?? 'نامە بۆ هەموو کارمەندان نێردرا')
        : (s.messageSentOne ?? 'نامە نێردرا'),
    );
    await load();
  }

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2" dir="rtl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {s.staffMessageTitle ?? 'نامە بۆ کارمەندان'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {s.staffMessageDesc ??
                'یەک نامە بۆ هەموو کارمەندان یان تەنها یەک کەس — لە ئاگادارکردنەوەکان دەردەکەوێت'}
            </p>
          </div>
        </div>
        <a
          href={STAFF_WHATSAPP_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          گرووپی حەرز
        </a>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.common.loading}
        </p>
      ) : (
        <form onSubmit={(e) => void send(e)} className="space-y-3 max-w-xl">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {s.messageTo ?? 'بۆ'}
            </label>
            <select
              className={field}
              value={recipientId}
              onChange={(e) => {
                setRecipientId(e.target.value);
                if (e.target.value === 'all') setAlsoWhatsApp(false);
              }}
            >
              <option value="all">{s.messageToAll ?? 'هەموو کارمەندان'}</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.phone}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {s.messageBody ?? 'دەقی نامە'}
            </label>
            <textarea
              className={`${field} min-h-[6rem] resize-y`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={s.messagePlaceholder ?? 'نامەکەت لێرە بنووسە…'}
              required
            />
          </div>
          {recipientId !== 'all' ? (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={alsoWhatsApp}
                onChange={(e) => setAlsoWhatsApp(e.target.checked)}
                className="rounded border-border"
              />
              {s.messageAlsoWhatsApp ?? 'هەروەها لە واتساپیش بۆ ئەو کەسە بکەرەوە'}
            </label>
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {ok ? <p className="text-sm text-teal-700">{ok}</p> : null}
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {s.messageSend ?? 'ناردن'}
          </button>
        </form>
      )}

      {sent.length > 0 ? (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {s.messageHistory ?? 'دوایین نامەکان'}
          </p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {sent.slice(0, 12).map((m) => (
              <li
                key={m.id}
                className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-foreground"
              >
                <p className="leading-snug whitespace-pre-wrap">{m.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {m.broadcast
                    ? (s.messageToAll ?? 'هەموو کارمەندان')
                    : m.recipientName ?? '—'}{' '}
                  · {new Date(m.createdAt).toLocaleString('ckb-IQ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
